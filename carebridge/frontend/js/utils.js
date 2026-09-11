/**
 * CareBridge - Funções Utilitárias Globais
 * --------------------------------------------------
 * NOTA ACADÉMICA (Engenharia de Software):
 * Concentrar a lógica de chamadas HTTP (apiFetch) num único local reduz 
 * redundância de código (princípio DRY - Don't Repeat Yourself). 
 * Todos os pedidos autorizados injetam automaticamente o Token JWT no cabeçalho.
 */

// Usa o mesmo domínio do site (funciona em localhost e no Render)
const API_URL = `${window.location.origin}/api`;
window.API_URL = API_URL;
window.BASE_URL = window.location.origin;

async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('carebridge_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('carebridge_token');
    window.location.href = 'index.html';
  }

  return response;
}

/**
 * T8: Aplica o tamanho de letra preferido do utilizador ao elemento <html>.
 * Lê da API (preferência guardada na BD) ou do localStorage como fallback.
 * Chamada automaticamente ao carregar cada página autenticada.
 */
async function applyFontSizePreference() {
  // Aplicar imediatamente o valor do localStorage (evita FOUC — Flash of Unstyled Content)
  const cached = localStorage.getItem('carebridge_font_size') || 'medium';
  document.documentElement.classList.remove('font-size-medium', 'font-size-large');
  document.documentElement.classList.add(`font-size-${cached}`);

  // Depois sincronizar com o servidor (em background, sem bloquear o render)
  const token = localStorage.getItem('carebridge_token');
  if (!token) return;

  try {
    const response = await fetch(`${API_URL}/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      const pref = data.user?.font_size_preference || 'medium';
      localStorage.setItem('carebridge_font_size', pref);
      document.documentElement.classList.remove('font-size-medium', 'font-size-large');
      document.documentElement.classList.add(`font-size-${pref}`);
      // T2: Notificar páginas que precisam de recalcular alturas após mudança de fonte
      document.dispatchEvent(new CustomEvent('fontSizeApplied', { detail: { pref } }));
    }
  } catch (e) {
    // Manter valor do localStorage se a API não responder
  }
}

// Aplicar automaticamente em todas as páginas que incluem utils.js
applyFontSizePreference();
