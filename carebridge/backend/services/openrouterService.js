/**
 * CareBridge - Serviço de Inteligência Artificial (OpenRouter)
 * --------------------------------------------------
 * NOTA ACADÉMICA (Design & Integração):
 * O serviço de IA atua como um 'wrapper' agnóstico ao modelo.
 * Ao utilizar o OpenRouter, ganhamos a capacidade de testar múltiplos modelos LLM
 * (ex: Gemma, Llama) instantaneamente alterando apenas uma variável de ambiente,
 * o que facilita a avaliação de desempenho durante a investigação académica.
 *
 * ALTERAÇÕES:
 *   - max_tokens: 600 → 2000 (evita respostas cortadas a meio)
 *   - Timeout: 90 segundos (modelos gratuitos têm fila de espera)
 *   - finish_reason verificado: se "length", faz pedido de continuação automático
 *   - overrideParams: suporte a parâmetros opcionais para pedidos especiais (ex: título curto)
 */
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const promptPath = `${__dirname}/prompt.md`;
const SYSTEM_PROMPT = fs.readFileSync(promptPath, 'utf-8');

const OPENROUTER_TIMEOUT_MS = 45_000; // timeout por modelo (modelos gratuitos podem ter fila)
const MAX_TOKENS = 1000;              // suficiente para respostas completas sem sobrecarregar modelos free
const MAX_CONTINUATION_ATTEMPTS = 1; // Máx. 1 continuação automática
const MAX_CONTEXT_MESSAGES = 12;     // limitar histórico enviado à API

const DEFAULT_MODEL_CHAIN = [
  'google/gemma-4-26b-a4b-it:free',
  'cohere/north-mini-code:free',
  'nvidia/nemotron-3.5-lightning:free',
  'dots-studio/dots-3-note-preview:free',
  'liquid/lfm-2.5-2.6b:free',
  'minimax/minimax-m3:free',
];

function getModelChain() {
  const primary = process.env.OPENROUTER_MODEL;
  const fallbacks = process.env.OPENROUTER_FALLBACK_MODELS
    ? process.env.OPENROUTER_FALLBACK_MODELS.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_MODEL_CHAIN.slice(1);

  const chain = primary ? [primary, ...fallbacks] : DEFAULT_MODEL_CHAIN;
  return [...new Set(chain)];
}

function trimMessages(messages) {
  const system = messages.filter((m) => m.role === 'system');
  const rest = messages.filter((m) => m.role !== 'system');
  if (rest.length <= MAX_CONTEXT_MESSAGES) return [...system, ...rest];
  return [...system, ...rest.slice(-MAX_CONTEXT_MESSAGES)];
}

/**
 * Tenta modelos em sequência — em 429 passa imediatamente ao seguinte (sem esperas longas).
 */
async function callOpenRouter(messages, options = {}) {
  const models = getModelChain();
  const trimmedMessages = trimMessages(messages);
  let lastError = null;

  for (const model of models) {
    const controller = new AbortController();
    const timeout = options.timeout ?? OPENROUTER_TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(
        process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://carebridge.academic',
            'X-Title': 'CareBridge - AllyCare Assistant',
          },
          body: JSON.stringify({
            model,
            messages: trimmedMessages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.max_tokens ?? MAX_TOKENS,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`[OpenRouter] model: ${data.model}`);
        return data;
      }

      const errorBody = await response.text();
      console.warn(`[OpenRouter] ${model} falhou (${response.status}): ${errorBody.slice(0, 160)}`);

      if (response.status === 429 || response.status === 503) {
        lastError = { status: response.status, statusText: response.statusText };
        continue;
      }

      throw new Error(`OpenRouter API error ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`[OpenRouter] ${model} timeout (${timeout / 1000}s), a tentar próximo...`);
        lastError = { status: 408, statusText: 'Timeout' };
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (lastError?.status === 429 || lastError?.status === 503) {
    throw new Error(
      'Todos os modelos gratuitos estão ocupados neste momento. Aguarda 1 minuto e tenta novamente.'
    );
  }

  if (lastError?.status === 408) {
    throw new Error('O assistente demorou demasiado a responder. Tenta novamente.');
  }

  throw new Error('Não foi possível obter resposta da IA. Tenta novamente.');
}

/**
 * Envia mensagens para a IA via OpenRouter.
 * @param {Array} messages        - Mensagem(ns) actual(is)
 * @param {Array} context         - Histórico de conversa para contexto (opcional)
 * @param {Object} overrideParams - Overrides de parâmetros da API.
 *   Exemplo: { max_tokens: 30 } para pedidos de geração de título curto.
 *   Se max_tokens < 100, a lógica de continuação automática é desactivada.
 */
export async function sendMessageToAI(messages, context = [], overrideParams = {}) {
  try {
    const userLang = overrideParams.language === 'en' ? 'English' : 'Portuguese';
    const systemPromptWithLang = `${SYSTEM_PROMPT}\n\n[SYSTEM PARAMETER: User's interface language is set to ${userLang}. Always respond in ${userLang}.]`;

    const fullMessages = [
      { role: 'system', content: systemPromptWithLang },
      ...context,
      ...messages,
    ];

    let data = await callOpenRouter(fullMessages, overrideParams);
    let choice = data.choices[0];
    let assistantText = choice.message.content;
    const finishReason = choice.finish_reason;

    const tokensUsed = data.usage?.completion_tokens ?? '?';
    const maxTok = overrideParams.max_tokens ?? MAX_TOKENS;
    console.log(`[OpenRouter] finish_reason: ${finishReason} | tokens used: ${tokensUsed}/${maxTok}`);

    // Para pedidos de título curto (max_tokens pequeno), não fazer continuação
    if (overrideParams.max_tokens && overrideParams.max_tokens < 100) {
      return {
        ...data,
        choices: [{ ...choice, message: { ...choice.message, content: assistantText } }],
      };
    }

    // Resposta principal cortada por limite de tokens: tentar continuar automaticamente
    if (finishReason === 'length') {
      console.warn('[OpenRouter] Resposta cortada por max_tokens. A tentar continuação automática...');

      for (let attempt = 0; attempt < MAX_CONTINUATION_ATTEMPTS; attempt++) {
        const continuationMessages = [
          ...fullMessages,
          { role: 'assistant', content: assistantText },
          { role: 'user', content: 'Continua a tua resposta anterior a partir de onde ficaste, sem repetir o que já disseste.' },
        ];

        const continuationData = await callOpenRouter(continuationMessages);
        const continuationChoice = continuationData.choices[0];
        const continuationText = continuationChoice.message.content;

        assistantText = assistantText.trimEnd() + '\n\n' + continuationText.trimStart();
        console.log(`[OpenRouter] Continuação #${attempt + 1}: finish_reason=${continuationChoice.finish_reason}`);

        if (continuationChoice.finish_reason !== 'length') break;
      }
    }

    // Devolver estrutura compatível com o código existente
    return {
      ...data,
      choices: [
        {
          ...choice,
          message: { ...choice.message, content: assistantText },
        },
      ],
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`[OpenRouter] Timeout após ${OPENROUTER_TIMEOUT_MS / 1000}s. O modelo gratuito pode estar sobrecarregado.`);
      throw new Error('O assistente demorou demasiado a responder. Tenta novamente em alguns momentos.');
    }
    console.error('Error communicating with AI:', error);
    throw error;
  }
}
