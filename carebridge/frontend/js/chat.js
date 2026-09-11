/**
 * CareBridge - Lógica de Chat (Frontend)
 * --------------------------------------------------
 * NOTA ACADÉMICA (Interface & Experiência de Utilizador - UX):
 * A gestão do estado da conversa é mantida no DOM e sincronizada com o backend.
 * O uso do Marked.js converte a saída Markdown do LLM em HTML formatado em tempo real,
 * melhorando a legibilidade para cuidadores (que podem ter literacia digital variável).
 *
 * ALTERAÇÕES (30/07/2026):
 *   T1 — Scroll interno: appendMessage é a única fonte de verdade para renderizar mensagens no DOM.
 *        loadHistory() não re-renderiza a conversa activa; só actualiza a sidebar.
 *        Fix duplicação: a mensagem do utilizador só é adicionada ao DOM uma vez (no frontend).
 *   T2 — Reabertura de conversa: ao carregar, verifica qual foi a última conversa activa.
 *        Se a última mensagem tiver < 60 minutos, reabre automaticamente.
 *        Baseado em dados da BD (backend), não em memória local.
 *   T3 — Título inteligente: após a 1ª troca de mensagens numa conversa nova,
 *        gera um título temático curto via IA de forma assíncrona.
 */
document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  const messagesArea = document.getElementById('messagesArea');
  const chatHistoryList = document.getElementById('chatHistoryList');
  const newChatBtn = document.getElementById('newChatBtn');

  // Restore active conversation from sessionStorage (survives same-session navigation)
  let currentConversationId = sessionStorage.getItem('carebridge_active_conv_id') || null;
  let isFirstExchangeDone = false; // T3: controla se o título já foi gerado

  // Helper: persist active conversation id so navigation doesn't lose it
  function setActiveConversation(id) {
    currentConversationId = id;
    if (id) {
      sessionStorage.setItem('carebridge_active_conv_id', id);
    } else {
      sessionStorage.removeItem('carebridge_active_conv_id');
    }
  }

  // === T1: Textarea auto-resize & Drafts ===
  function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 130) + 'px';
  }

  function parseDbDate(dateStr) {
    if (!dateStr) return 0;
    if (typeof dateStr === 'string') {
      // SQLite CURRENT_TIMESTAMP returns "YYYY-MM-DD HH:MM:SS" — no timezone info.
      // Strings with proper timezone end with 'Z', or have a '+'/'-' offset AFTER the time part.
      // We CANNOT check includes('-') because dates always contain '-' in the YYYY-MM-DD part.
      const hasTimezone = dateStr.endsWith('Z')
        || dateStr.includes('+')
        || /\d{2}:\d{2}:\d{2}[-+]\d/.test(dateStr); // e.g. "...15:00:00+01:00"
      if (!hasTimezone) {
        // No timezone → SQLite UTC string. Append 'Z' so JS treats it as UTC.
        return new Date(dateStr.replace(' ', 'T') + 'Z').getTime();
      }
    }
    return new Date(dateStr).getTime();
  }

  function restoreDraft() {
    const key = currentConversationId ? `chat_draft_${currentConversationId}` : 'chat_draft_new';
    const draft = sessionStorage.getItem(key);
    messageInput.value = draft || '';
    autoResizeTextarea();
  }

  messageInput.addEventListener('input', () => {
    autoResizeTextarea();
    const key = currentConversationId ? `chat_draft_${currentConversationId}` : 'chat_draft_new';
    const text = messageInput.value;
    if (text) {
      sessionStorage.setItem(key, text);
    } else {
      sessionStorage.removeItem(key);
    }
  });

  // Enter = enviar; Shift+Enter = nova linha
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  });

  // =========================================================
  // SIDEBAR DE HISTÓRICO
  // Nota: loadHistory() NUNCA re-renderiza a área de mensagens
  // activa — só actualiza a lista lateral.
  // =========================================================
  async function loadHistory() {
    try {
      const response = await fetchWithAuth('/chat/history');
      if (response.ok) {
        const conversations = await response.json();
        renderHistoryList(conversations);
        return conversations;
      }
    } catch (e) {
      console.error('Error loading history:', e);
    }
    return [];
  }

  window.deleteConversation = async (id, e) => {
    e.stopPropagation();
    if (confirm('Tem a certeza que deseja apagar esta conversa?')) {
      await fetchWithAuth(`/chat/${id}`, { method: 'DELETE' });
      sessionStorage.removeItem(`chat_draft_${id}`);
      if (currentConversationId === id) {
        newChatBtn.click();
      } else {
        loadHistory();
      }
    }
  };

  window.renameConversation = async (id, currentTitle, e) => {
    e.stopPropagation();
    const newTitle = prompt('Novo nome para a conversa:', currentTitle);
    if (newTitle && newTitle.trim() !== '' && newTitle !== currentTitle) {
      await fetchWithAuth(`/chat/${id}/rename`, {
        method: 'PUT',
        body: JSON.stringify({ title: newTitle.trim() })
      });
      loadHistory();
    }
  };

  window.toggleStar = async (id, isStarred, e) => {
    e.stopPropagation();
    await fetchWithAuth(`/chat/${id}/star`, {
      method: 'PUT',
      body: JSON.stringify({ is_starred: !isStarred })
    });
    loadHistory();
  };

  function renderHistoryList(conversations) {
    chatHistoryList.innerHTML = '';
    if (conversations.length === 0) {
      chatHistoryList.innerHTML = '<div class="text-center text-muted p-3">Nenhuma conversa recente.</div>';
      return;
    }

    conversations.forEach(conv => {
      const msgCount = conv.messages ? conv.messages.length : 0;
      const dateStr = new Date(parseDbDate(conv.created_at)).toLocaleDateString('pt-PT');

      const div = document.createElement('div');
      div.className = `list-group-item list-group-item-action chat-history-item p-3 mb-2 shadow-sm ${conv.id === currentConversationId ? 'active' : ''}`;
      div.dataset.convId = conv.id;
      div.onclick = () => loadConversation(conv);

      const starIconClass = conv.is_starred ? 'bi-star-fill star-active' : 'bi-star';

      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-1">
          <strong class="text-truncate" style="max-width: 85%; font-size: 0.95rem;">${conv.title || 'Nova Conversa'}</strong>
        </div>
        <div class="text-muted small">
          ${dateStr}<br>${msgCount} mensagens
        </div>

        <div class="chat-history-actions">
          <i class="bi bi-pencil action-icon" onclick="renameConversation(${conv.id}, '${(conv.title || 'Nova Conversa').replace(/'/g, "\\'")}', event)"></i>
          <i class="bi ${starIconClass} action-icon" onclick="toggleStar(${conv.id}, ${conv.is_starred ? 'true' : 'false'}, event)"></i>
          <i class="bi bi-trash action-icon" onclick="deleteConversation(${conv.id}, event)"></i>
        </div>
      `;
      chatHistoryList.appendChild(div);
    });
  }

  /**
   * Carrega uma conversa do histórico na área de mensagens.
   * Limpa o DOM e re-renderiza todas as mensagens guardadas.
   * Nunca chamado automaticamente durante um envio activo.
   */
  function loadConversation(conv) {
    setActiveConversation(conv.id);
    isFirstExchangeDone = true; // conversa antiga: título já existe
    messagesArea.innerHTML = '';
    if (conv.messages && conv.messages.length > 0) {
      conv.messages.forEach(msg => {
        appendMessage(msg.role, msg.content, false); // false = não fazer scroll a cada mensagem
      });
    }
    // Scroll para o fim após renderizar tudo
    messagesArea.scrollTop = messagesArea.scrollHeight;
    // Só actualizar a sidebar (marcar activa) — NÃO re-renderizar mensagens
    loadHistory();
    // Restaurar rascunho
    restoreDraft();
  }

  /**
   * Adiciona uma única bolha de mensagem ao DOM.
   * @param {string} role - 'user' ou 'assistant'
   * @param {string} content - texto da mensagem
   * @param {boolean} scrollToBottom - fazer scroll após adicionar (default: true)
   */
  function appendMessage(role, content, scrollToBottom = true) {
    const div = document.createElement('div');
    div.className = `message ${role} shadow-sm`;

    const isAssistant = role === 'assistant';
    // Use i18n translation for the 'You' label if available
    const userLabel = (typeof currentTranslations !== 'undefined' && currentTranslations['chat.user_label'])
      ? currentTranslations['chat.user_label']
      : 'Você';
    const name = isAssistant ? 'AllyCare' : userLabel;

    div.innerHTML = `
      <strong>${name}</strong>
      <div class="mt-1 content-rendered">${isAssistant && typeof marked !== 'undefined' ? marked.parse(content) : content}</div>
    `;

    messagesArea.appendChild(div);
    if (scrollToBottom) {
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }
  }

  // =========================================================
  // T3: Gerar título temático via IA (assíncrono, 1 vez por conversa)
  // =========================================================
  async function generateConversationTitle(convId, firstUserMsg, firstAssistantMsg) {
    try {
      const response = await fetchWithAuth('/chat/generate-title', {
        method: 'POST',
        body: JSON.stringify({ conversationId: convId, firstUserMsg, firstAssistantMsg })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.title) {
          // Actualizar título na sidebar sem re-renderizar mensagens
          loadHistory();
        }
      }
    } catch (e) {
      // Falha silenciosa — o título padrão mantém-se
      console.warn('Título automático não gerado:', e);
    }
  }

  // =========================================================
  // ENVIO DE MENSAGEM
  // FIX DUPLICAÇÃO: appendMessage('user') é feito APENAS AQUI,
  // no frontend. O backend guarda a mensagem na BD mas NÃO
  // volta a enviá-la para o frontend renderizar novamente.
  // =========================================================
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;

    // 1. Mostrar mensagem do utilizador no DOM (UMA VEZ, aqui)
    appendMessage('user', message);
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // 2. Indicador de "a escrever..."
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant shadow-sm text-muted fst-italic';
    loadingDiv.innerHTML = '<i class="bi bi-three-dots"></i> AllyCare está a escrever...';
    loadingDiv.id = 'loadingMessage';
    messagesArea.appendChild(loadingDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;

    try {
      const response = await fetchWithAuth('/chat/send', {
        method: 'POST',
        body: JSON.stringify({ message, conversationId: currentConversationId })
      });

      const data = await response.json();
      document.getElementById('loadingMessage')?.remove();

      if (response.ok) {
        const wasNewConversation = !currentConversationId;
        
        // Limpar rascunho
        const oldKey = currentConversationId ? `chat_draft_${currentConversationId}` : 'chat_draft_new';
        sessionStorage.removeItem(oldKey);

        setActiveConversation(data.conversationId);

        // 3. Mostrar resposta do assistente
        appendMessage('assistant', data.message);

        // 4. Actualizar sidebar (título, contagem de msgs)
        loadHistory();

        // 5. T3: Gerar título temático na 1ª troca (adiado para não competir com a resposta principal)
        if (wasNewConversation && !isFirstExchangeDone) {
          isFirstExchangeDone = true;
          setTimeout(() => {
            generateConversationTitle(currentConversationId, message, data.message);
          }, 5000);
        }
      } else {
        appendMessage('assistant', `❌ ${data.error || 'Ocorreu um erro. Por favor tente novamente.'}`);
      }
    } catch (error) {
      document.getElementById('loadingMessage')?.remove();
      appendMessage('assistant', '❌ Problema ao ligar ao servidor. Verifique a sua ligação.');
    }
  });

  // =========================================================
  // NOVA CONVERSA (botão +)
  // =========================================================
  newChatBtn.addEventListener('click', () => {
    setActiveConversation(null);
    isFirstExchangeDone = false;
    const greeting = (typeof currentTranslations !== 'undefined' && currentTranslations['chat.greeting'])
      ? currentTranslations['chat.greeting']
      : 'Olá! Sou o AllyCare, estou aqui para o apoiar. Como está a correr o dia para si e para a pessoa de quem cuida?';
    messagesArea.innerHTML = `
      <div class="message assistant shadow-sm">
        <strong>AllyCare</strong>
        <p class="mb-0 mt-1">${greeting}</p>
      </div>
    `;
    restoreDraft();
    loadHistory();
  });

  // =========================================================
  // T2: REABERTURA AUTOMÁTICA (< 60 minutos desde última mensagem)
  // Usa dados do backend (BD) como fonte de verdade.
  // =========================================================
  async function initChat() {
    const conversations = await loadHistory();

    if (!conversations || conversations.length === 0) {
      restoreDraft();
      return;
    }

    // PRIORITY: If there is already a saved conversation from this session
    // (user navigated to another page and came back), reload it directly.
    if (currentConversationId) {
      const savedConv = conversations.find(c => c.id == currentConversationId);
      if (savedConv) {
        console.log(`[Chat] Retomando conversa da sessão: #${savedConv.id}`);
        loadConversation(savedConv);
        return;
      }
      // If the saved ID no longer exists (was deleted), clear it and fall through
      setActiveConversation(null);
    }

    // FALLBACK: No saved conversation — find the most recently active one
    let mostRecent = null;
    let mostRecentTime = null;

    for (const conv of conversations) {
      if (!conv.messages || conv.messages.length === 0) continue;

      const lastMsg = conv.messages[conv.messages.length - 1];
      const msgTime = lastMsg.created_at || conv.created_at;
      const t = parseDbDate(msgTime);

      if (!mostRecentTime || t > mostRecentTime) {
        mostRecentTime = t;
        mostRecent = conv;
      }
    }

    if (!mostRecent || !mostRecentTime) {
      restoreDraft();
      return;
    }

    const minutesAgo = (Date.now() - mostRecentTime) / 1000 / 60;
    if (minutesAgo < 60) {
      console.log(`[Chat] Reabrindo conversa #${mostRecent.id} (última actividade: ${Math.round(minutesAgo)} min atrás)`);
      loadConversation(mostRecent);
    } else {
      // > 60 min: nova conversa em branco
      restoreDraft();
    }
  }

  // Iniciar
  initChat();
});
