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
        // Fallback to allow demo navigation if backend is down
        if (email === 'demo@carebridge.com') {
          console.log('Backend not available, using offline demo mode');
          localStorage.setItem('carebridge_token', 'demo_token');
          localStorage.setItem('carebridge_role', 'user');
          window.location.href = 'dashboard.html';
        } else if (email === 'demoadmin@carebridge.com') {
          console.log('Backend not available, using offline admin demo mode');
          localStorage.setItem('carebridge_token', 'demoadmin_token');
          localStorage.setItem('carebridge_role', 'admin');
          window.location.href = 'dashboard.html';
        } else {
          alert('Error connecting to server. Is it running?');
        }
      }
    });
  }
});
