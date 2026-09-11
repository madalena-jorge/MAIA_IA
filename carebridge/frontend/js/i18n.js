/**
 * CareBridge - Gestão de Tradução e Idiomas (i18n)
 */

let currentTranslations = {};

async function loadTranslations(lang) {
  try {
    const response = await fetch(`locales/${lang}.json`);
    if (response.ok) {
      currentTranslations = await response.json();
      applyTranslations();
      updateSwitcherUI(lang);
    }
  } catch (error) {
    console.error('Failed to load translations:', error);
  }
}

function applyTranslations() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (currentTranslations[key]) {
      // Check if it's an input or textarea with placeholder
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = currentTranslations[key];
      } else {
        // Keep icons inside the element if there are any
        const iconEl = el.querySelector('i');
        if (iconEl) {
          const temp = iconEl.outerHTML;
          el.innerHTML = temp + ' ' + currentTranslations[key];
        } else {
          el.innerHTML = currentTranslations[key];
        }
      }
    }
  });
  
  // Set html lang attribute
  const lang = localStorage.getItem('carebridge_language') || 'pt';
  document.documentElement.setAttribute('lang', lang === 'pt' ? 'pt-PT' : 'en');
}

function updateSwitcherUI(lang) {
  const btnPt = document.getElementById('lang-btn-pt');
  const btnEn = document.getElementById('lang-btn-en');
  if (btnPt && btnEn) {
    if (lang === 'pt') {
      btnPt.classList.add('active');
      btnEn.classList.remove('active');
    } else {
      btnPt.classList.remove('active');
      btnEn.classList.add('active');
    }
  }
}

async function setLanguage(lang) {
  localStorage.setItem('carebridge_language', lang);
  await loadTranslations(lang);
  
  // Sync preference with backend
  const token = localStorage.getItem('carebridge_token');
  if (token) {
    try {
      await fetch('http://localhost:3000/api/profile/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ language: lang })
      });
    } catch (e) {
      console.error('Failed to sync language preference:', e);
    }
  }
}

function injectSwitcher() {
  const navbarNav = document.getElementById('navbarNav') || document.querySelector('.navbar .container');
  if (navbarNav) {
    if (!document.getElementById('langSwitcherContainer')) {
      const switcher = document.createElement('div');
      switcher.id = 'langSwitcherContainer';
      switcher.className = 'd-flex align-items-center ms-lg-3 mt-2 mt-lg-0';
      
      const currentLang = localStorage.getItem('carebridge_language') || 'pt';
      
      switcher.innerHTML = `
        <div class="btn-group btn-group-sm shadow-sm" role="group" aria-label="Language Selector">
          <button type="button" class="btn btn-outline-primary py-1 px-2 ${currentLang === 'pt' ? 'active' : ''}" id="lang-btn-pt">PT</button>
          <button type="button" class="btn btn-outline-primary py-1 px-2 ${currentLang === 'en' ? 'active' : ''}" id="lang-btn-en">EN</button>
        </div>
      `;
      
      if (document.getElementById('navbarNav')) {
        document.getElementById('navbarNav').appendChild(switcher);
      } else {
        navbarNav.appendChild(switcher);
      }
      
      document.getElementById('lang-btn-pt').addEventListener('click', () => setLanguage('pt'));
      document.getElementById('lang-btn-en').addEventListener('click', () => setLanguage('en'));
    }
  }
}

// Initialize i18n
document.addEventListener('DOMContentLoaded', async () => {
  injectSwitcher();
  
  // Try to load cached preference first
  let lang = localStorage.getItem('carebridge_language') || 'pt';
  
  // Sincronizar com o perfil do servidor se autenticado
  const token = localStorage.getItem('carebridge_token');
  if (token) {
    try {
      const response = await fetch('http://localhost:3000/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.language) {
          lang = data.user.language;
          localStorage.setItem('carebridge_language', lang);
        }
      }
    } catch (e) {
      // Ignorar e manter local
    }
  }
  
  await loadTranslations(lang);
});
