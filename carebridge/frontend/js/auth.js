/**
 * CareBridge - Frontend Autenticação
 * --------------------------------------------------
 * Suporta login email/palavra-passe e Google (Firebase).
 */
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const googleBtn = document.getElementById('googleLoginBtn');

  function saveSession(data) {
    localStorage.setItem('carebridge_token', data.token);
    localStorage.setItem('carebridge_role', data.user.role || 'user');
    window.location.href = 'dashboard.html';
  }

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
          saveSession(data);
        } else {
          alert('Login failed: ' + (data.error || 'Invalid credentials'));
        }
      } catch (error) {
        const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
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

  if (googleBtn) {
    googleBtn.addEventListener('click', signInWithGoogle);
  }
});

async function signInWithGoogle() {
  const googleBtn = document.getElementById('googleLoginBtn');

  if (!window.firebaseAuth) {
    alert('Login Google ainda não está configurado. Preencha o ficheiro js/firebase-config.js.');
    return;
  }

  const originalHtml = googleBtn.innerHTML;
  googleBtn.disabled = true;
  googleBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> A ligar...';

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await window.firebaseAuth.signInWithPopup(provider);
    const idToken = await result.user.getIdToken();

    const response = await fetch(`${window.API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('carebridge_token', data.token);
      localStorage.setItem('carebridge_role', data.user.role || 'user');
      window.location.href = 'dashboard.html';
      return;
    }

    alert(data.error || 'Erro ao iniciar sessão com Google.');
  } catch (error) {
    if (error.code !== 'auth/popup-closed-by-user') {
      console.error('Google sign-in error:', error);
      alert('Erro ao iniciar sessão com Google. Verifique a configuração Firebase.');
    }
  } finally {
    googleBtn.disabled = false;
    googleBtn.innerHTML = originalHtml;
  }
}
