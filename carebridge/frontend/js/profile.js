/**
 * CareBridge - Lógica de Perfil (Frontend)
 * --------------------------------------------------
 * NOTA ACADÉMICA (Dashboard de Saúde):
 * Faz o fetch dos dados estruturados do cuidador e do doente a partir da API.
 * A visualização imediata destes dados permite uma consulta rápida em caso
 * de emergência médica (redução da sobrecarga cognitiva do cuidador).
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Verifica se está autenticado
  const token = localStorage.getItem('carebridge_token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  await loadProfileData();
  await loadChatHistoryForTab();

  // === T8: Inicializar e ligar o toggle de tamanho de letra ===
  initFontSizeToggle();
});

function initFontSizeToggle() {
  const currentPref = localStorage.getItem('carebridge_font_size') || 'medium';

  // Selecionar o radio correto
  const radio = document.getElementById(currentPref === 'large' ? 'fontSizeLarge' : 'fontSizeMedium');
  if (radio) radio.checked = true;

  // Listener em cada radio button
  document.querySelectorAll('input[name="fontSize"]').forEach(input => {
    input.addEventListener('change', async () => {
      const newPref = input.value; // 'medium' ou 'large'

      // Aplicar imediatamente na página
      document.documentElement.classList.remove('font-size-medium', 'font-size-large');
      document.documentElement.classList.add(`font-size-${newPref}`);
      localStorage.setItem('carebridge_font_size', newPref);

      // Guardar no servidor
      try {
        await fetchWithAuth('/profile/preferences', {
          method: 'PATCH',
          body: JSON.stringify({ font_size_preference: newPref })
        });

        // Mostrar feedback "Guardado!"
        const feedback = document.getElementById('fontSaveFeedback');
        if (feedback) {
          feedback.style.display = 'inline';
          setTimeout(() => { feedback.style.display = 'none'; }, 2500);
        }
      } catch (e) {
        console.warn('Não foi possível guardar a preferência no servidor:', e);
      }
    });
  });
}

async function loadProfileData() {
  try {
    // Corrige o endpoint de '/profile/dashboard' para '/profile'
    const response = await fetchWithAuth('/profile');
    if (!response.ok) throw new Error('Failed to load profile');
    const data = await response.json();
    
    // Render Cuidador
    const caregiverArea = document.getElementById('caregiverProfileArea');
    if (caregiverArea && data.user) {
      caregiverArea.innerHTML = `
        <div class="d-flex flex-column gap-2 mt-2">
          <p class="mb-1"><span class="fw-bold text-dark">${data.user.name || 'Sem nome'}</span></p>
          <p class="mb-1 text-muted small"><i class="bi bi-envelope me-1"></i> ${data.user.email}</p>
          <p class="mb-1 text-muted small"><i class="bi bi-telephone me-1"></i> Contato: ${data.user.contact || 'Não especificado'}</p>
          <p class="mb-1 text-muted small"><i class="bi bi-heart-pulse me-1"></i> Nível de Experiência: <span class="badge bg-primary bg-opacity-10 text-primary">${data.user.experience || 'Iniciante'}</span></p>
          <p class="mb-1 text-muted small"><i class="bi bi-chat-quote me-1"></i> Preocupações: <span class="text-secondary italic">"${data.user.concerns || 'Nenhuma preocupação listada.'}"</span></p>
          <hr class="my-2 opacity-25">
          <p class="mb-0 text-muted" style="font-size: 0.75rem;">Membro desde: ${new Date(data.user.created_at).toLocaleDateString('pt-PT')}</p>
        </div>
      `;
      
      // Populate Emergency Quick-sheet caregiver phone
      const quickCaregiverPhone = document.getElementById('quickCaregiverPhone');
      if (quickCaregiverPhone) quickCaregiverPhone.textContent = data.user.contact || '-';
    }

    // Render Paciente
    const patientArea = document.getElementById('patientProfileArea');
    if (patientArea) {
      if (data.patient) {
        const medical = data.medicalRecords || {};
        patientArea.innerHTML = `
          <div class="d-flex flex-column gap-2 mt-2">
            <p class="mb-1"><span class="fw-bold text-dark">${data.patient.name}</span> (${data.patient.age || '-'} anos)</p>
            <p class="mb-1 text-muted small"><i class="bi bi-heart-pulse text-info me-1"></i> Diagnóstico: <span class="badge bg-info bg-opacity-10 text-info fw-semibold">${data.patient.diagnosis || 'Não especificado'}</span></p>
            <p class="mb-1 text-muted small"><i class="bi bi-stars text-info me-1"></i> Crenças: ${data.patient.beliefs || 'Nenhuma'}</p>
            <p class="mb-1 text-muted small"><i class="bi bi-shield-fill-exclamation text-danger me-1"></i> Contacto de Emergência: <strong>${data.patient.emergency_contact || 'Nenhum'}</strong></p>
            <p class="mb-1 text-muted small"><i class="bi bi-clipboard2-pulse me-1"></i> Alergias: <span class="text-danger fw-semibold">${medical.allergies || 'Nenhuma'}</span></p>
            <p class="mb-1 text-muted small"><i class="bi bi-activity me-1"></i> Comportamentos: <span class="text-muted">${medical.behaviors || 'Nenhum registo'}</span></p>
          </div>
        `;

        // Populate Emergency Quick-sheet details
        const quickAlergias = document.getElementById('quickAlergias');
        const quickDiagnostico = document.getElementById('quickDiagnostico');
        const quickComportamentos = document.getElementById('quickComportamentos');
        
        if (quickAlergias) {
          quickAlergias.textContent = medical.allergies || 'Nenhuma alergia registada';
          if (!medical.allergies) {
            quickAlergias.className = 'badge bg-success bg-opacity-10 text-success fw-semibold';
          }
        }
        if (quickDiagnostico) quickDiagnostico.textContent = `${data.patient.diagnosis || 'Não especificado'} (${data.patient.age || '-'} anos)`;
        if (quickComportamentos) quickComportamentos.textContent = medical.behaviors || 'Sem observações especiais.';
      } else {
        patientArea.innerHTML = `
          <div class="text-center text-muted py-4">
            <i class="bi bi-emoji-neutral display-6 text-muted mb-2"></i>
            <p class="small mb-0">Ainda não inseriu os dados da pessoa de quem cuida.</p>
          </div>
        `;
      }
    }

    // Render Medicações
    const medicationsList = document.getElementById('medicationsList');
    if (medicationsList) {
      if (data.medications && data.medications.length > 0) {
        medicationsList.innerHTML = data.medications.map(med => `
          <li class="list-group-item d-flex justify-content-between align-items-center py-3">
            <div>
              <strong class="text-dark">${med.name}</strong> <span class="text-muted small">(${med.dosage})</span>
              <div class="text-muted small mt-1"><i class="bi bi-clock me-1"></i> Horário: ${med.schedule}</div>
            </div>
            ${med.notes ? `<span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill small">${med.notes}</span>` : ''}
          </li>
        `).join('');
      } else {
        medicationsList.innerHTML = `<li class="list-group-item text-muted p-4 text-center">Nenhuma medicação registada para o paciente.</li>`;
      }
    }

  } catch (error) {
    console.error('Erro ao carregar perfil:', error);
    // Fallback if offline / backend is down
    const caregiverArea = document.getElementById('caregiverProfileArea');
    if (caregiverArea) caregiverArea.innerHTML = '<p class="text-danger small">Erro ao ligar ao servidor.</p>';
  }
}

async function loadChatHistoryForTab() {
  const historyList = document.getElementById('tabChatHistoryList');
  if (!historyList) return;

  try {
    const response = await fetchWithAuth('/chat/conversations');
    if (!response.ok) throw new Error('Failed to load conversations');
    const conversations = await response.json();

    if (conversations && conversations.length > 0) {
      historyList.innerHTML = conversations.map(conv => `
        <a href="allycare.html?conv=${conv.id}" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3">
          <div>
            <strong class="text-dark">${conv.title || 'Conversa sem título'}</strong>
            <div class="text-muted small mt-1"><i class="bi bi-calendar-event me-1"></i> Criado em: ${new Date(conv.created_at).toLocaleString('pt-PT')}</div>
          </div>
          <span class="badge bg-primary bg-opacity-10 text-primary rounded-pill"><i class="bi bi-chevron-right"></i></span>
        </a>
      `).join('');
    } else {
      historyList.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="bi bi-chat-left-dots text-muted display-6 mb-2"></i>
          <p class="small mb-0">Ainda não tem conversas salvas no seu histórico.</p>
        </div>
      `;
    }
  } catch (err) {
    console.warn('Erro ao carregar histórico para o perfil:', err);
    // Fallback if offline
    historyList.innerHTML = `
      <div class="text-center text-muted py-4">
        <i class="bi bi-chat-left-dots text-muted display-6 mb-2"></i>
        <p class="small mb-0">Conversas de demonstração offline (Servidor indisponível).</p>
      </div>
    `;
  }
}

