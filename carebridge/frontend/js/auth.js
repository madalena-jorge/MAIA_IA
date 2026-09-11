/**
 * CareBridge - Frontend Autenticação
 * --------------------------------------------------
 * NOTA ACADÉMICA (Segurança Frontend):
 * Este módulo interceta a submissão do formulário de login e faz
 * o pedido assíncrono (fetch) à API. Em vez de recarregar a página,
 * guarda o token JWT no localStorage, permitindo persistência 
 * da sessão no navegador (SPA approach).
 */
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('floatingInput').value;
      const password = document.getElementById('floatingPassword').value;
      
      try {
        const response = await fetch(`${window.API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          localStorage.setItem('carebridge_token', data.token);
          localStorage.setItem('carebridge_role', data.user.role || 'user');
          window.location.href = 'dashboard.html';
        } else {
          alert('Login failed: ' + (data.error || 'Invalid credentials'));
        }
      } catch (error) {
        const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
        // Modo demo offline apenas em desenvolvimento local
        if (isLocalDev && email === 'demo@carebridge.com') {
          console.log('Backend not available, using offline demo mode');
          localStorage.setItem('carebridge_token', 'demo_token');
          localStorage.setItem('carebridge_role', 'user');
          window.location.href = 'dashboard.html';
        } else if (isLocalDev && email === 'demoadmin@carebridge.com') {
          console.log('Backend not available, using offline admin demo mode');
          localStorage.setItem('carebridge_token', 'demoadmin_token');
          localStorage.setItem('carebridge_role', 'admin');
          window.location.href = 'dashboard.html';
        } else {
          alert('Erro ao ligar ao servidor. Verifique a ligação e tente novamente.');
        }
      }
    });
  }
});
