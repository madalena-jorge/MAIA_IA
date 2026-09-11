/**
 * CareBridge - Rotas de Chat (Integração IA)
 * --------------------------------------------------
 * NOTA ACADÉMICA (Interação Humano-Computador & Ética):
 * Este módulo processa as mensagens entre o cuidador e a Inteligência Artificial.
 * Utiliza o StrandsClient (mock) para gerir o contexto e garantir "memória" de conversas passadas,
 * o que é fundamental para criar empatia e coerência num assistente de saúde mental (DSR).
 *
 * ALTERAÇÕES (30/07/2026):
 *   T2 — Histórico inclui created_at das mensagens para cálculo de "última actividade" no frontend.
 *   T3 — Nova rota POST /chat/generate-title: gera um título temático curto via IA (assíncrono).
 */
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { sendMessageToAI } from '../services/openrouterService.js';
import { getDb } from '../config/database.js';
import { strandsClient } from '../services/strandsSDK.js';

const router = express.Router();

// =============================================================
// POST /chat/send — Enviar mensagem ao assistente IA
// =============================================================
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.user.id;

    let currentConvId = conversationId;

    // Criar nova conversa se não existir
    if (!currentConvId) {
      currentConvId = await strandsClient.createConversation(userId, message.substring(0, 50) + '...');
    }

    // Guardar mensagem do utilizador
    await strandsClient.addMessageToContext(currentConvId, 'user', message);

    // Obter histórico completo para contexto
    const messagesForAI = await strandsClient.getConversationContext(currentConvId);

    // Obter idioma do utilizador
    const db = await getDb();
    const user = await db.get('SELECT language FROM users WHERE id = ?', [userId]);
    const userLanguage = user?.language || 'pt';

    // Chamar OpenRouter com o idioma selecionado
    // messagesForAI já inclui a mensagem actual do utilizador — não duplicar
    const aiResponse = await sendMessageToAI([], messagesForAI, { language: userLanguage });
    const assistantMessage = aiResponse.choices[0].message.content;

    // Guardar resposta do assistente
    await strandsClient.addMessageToContext(currentConvId, 'assistant', assistantMessage);

    res.json({
      conversationId: currentConvId,
      message: assistantMessage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================
// GET /chat/history — Histórico de conversas do utilizador
// Inclui created_at das mensagens (para T2: cálculo de última actividade)
// =============================================================
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const db = await getDb();

    const conversations = await db.all(
      'SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    for (let conv of conversations) {
      // Incluir created_at das mensagens para o frontend calcular "última actividade"
      conv.messages = await db.all(
        'SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC',
        [conv.id]
      );
    }

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================
// POST /chat/generate-title — T3: Gerar título temático via IA
// Chamado de forma assíncrona pelo frontend após a 1ª troca de mensagens.
// Usa um prompt leve e focado apenas em gerar um título curto.
// =============================================================
router.post('/generate-title', authenticateToken, async (req, res) => {
  try {
    const { conversationId, firstUserMsg, firstAssistantMsg } = req.body;
    const userId = req.user.id;
    const db = await getDb();

    // Verificar que a conversa pertence ao utilizador
    const conv = await db.get(
      'SELECT id, title FROM conversations WHERE id = ? AND user_id = ?',
      [conversationId, userId]
    );
    if (!conv) return res.status(404).json({ error: 'Conversa não encontrada.' });

    // Não sobrescrever títulos já renomeados manualmente (se o título actual não é o padrão "..." )
    // O título padrão criado pelo createConversation termina em "..."
    const isDefaultTitle = !conv.title || conv.title.endsWith('...');
    if (!isDefaultTitle) {
      return res.json({ title: conv.title, skipped: true });
    }

    // Prompt minimalista para geração de título
    const titlePrompt = [
      {
        role: 'user',
        content: `Gera um título MUITO CURTO (máximo 5 palavras, em português) que descreve o TEMA desta conversa sobre cuidados a pessoa com demência. Responde APENAS com o título, sem aspas, sem pontuação no fim, sem explicação.\n\nPergunta do utilizador: "${firstUserMsg.substring(0, 200)}"\nResposta do assistente: "${firstAssistantMsg.substring(0, 200)}"`
      }
    ];

    const titleResponse = await sendMessageToAI(titlePrompt, [], { max_tokens: 30 });
    let generatedTitle = titleResponse.choices[0].message.content.trim();

    // Limpar aspas ou pontuação final se o modelo as incluir
    generatedTitle = generatedTitle.replace(/^["'«»]|["'«»]$/g, '').replace(/[.!?]$/, '').trim();

    // Capitalizar primeira letra
    if (generatedTitle) {
      generatedTitle = generatedTitle.charAt(0).toUpperCase() + generatedTitle.slice(1);
    }

    // Guardar na BD
    if (generatedTitle && generatedTitle.length > 2) {
      await db.run(
        'UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?',
        [generatedTitle, conversationId, userId]
      );
    }

    res.json({ title: generatedTitle });
  } catch (error) {
    // Falha silenciosa — o título padrão mantém-se
    console.error('[generate-title] Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================
// DELETE /chat/:id — Apagar conversa
// =============================================================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const userId = req.user.id;
    await db.run('DELETE FROM messages WHERE conversation_id = ? AND conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)', [id, userId]);
    await db.run('DELETE FROM conversations WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================
// PUT /chat/:id/rename — Renomear conversa
// =============================================================
router.put('/:id/rename', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { title } = req.body;
    const userId = req.user.id;
    await db.run('UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?', [title, id, userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================
// PUT /chat/:id/star — Marcar/desmarcar favorito
// =============================================================
router.put('/:id/star', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { is_starred } = req.body;
    const userId = req.user.id;
    await db.run('UPDATE conversations SET is_starred = ? WHERE id = ? AND user_id = ?', [is_starred ? 1 : 0, id, userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
