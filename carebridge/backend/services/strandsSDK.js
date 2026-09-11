/**
 * CareBridge - Gestão de Contexto e Memória (Mock do Strands SDK)
 * --------------------------------------------------
 * NOTA ACADÉMICA (Inteligência Artificial & Arquitetura):
 * Este módulo abstrai a complexidade de gerir a janela de contexto do LLM.
 * Para evitar que o assistente "esqueça" quem é o doente a cada nova mensagem,
 * o histórico da conversa é guardado (curto/longo prazo) e reinjetado nos prompts.
 * Este isolamento permite que, no futuro, seja substituído por um motor semântico
 * mais complexo sem alterar o resto do sistema.
 */
import { getDb } from '../config/database.js';

/**
 * Mock implementation of Strands SDK
 * - Context Management
 * - Persisting history to DB
 * - Retrieving context between sessions
 * - Short-term/long-term memory
 */
export class StrandsClient {
  constructor(config = {}) {
    this.config = config;
  }

  async getConversationContext(conversationId) {
    const db = await getDb();
    const history = await db.all(
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id ASC',
      [conversationId]
    );

    // Mock "short/long term memory coherence"
    return history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  async addMessageToContext(conversationId, role, content) {
    const db = await getDb();
    await db.run(
      'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
      [conversationId, role, content]
    );
  }

  async createConversation(userId, title) {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO conversations (user_id, title) VALUES (?, ?)',
      [userId, title]
    );
    return result.lastID;
  }
}

export const strandsClient = new StrandsClient();
