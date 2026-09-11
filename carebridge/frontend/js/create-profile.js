/**
 * CareBridge - Registo e Criação de Perfil (Frontend)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const accountType = document.getElementById('accountType');
  const keywordGroup = document.getElementById('keywordGroup');
  const addMedicationBtn = document.getElementById('addMedicationBtn');
  const medicationsContainer = document.getElementById('medicationsContainer');
  const noMedsText = document.getElementById('noMedsText');
  const profileForm = document.getElementById('profileForm');

  // Check URL parameters for Edit Mode
  const urlParams = new URLSearchParams(window.location.search);
  const editMode = urlParams.get('edit');

  if (editMode) {
    // We are in Edit Mode
    document.getElementById('pageTitle').textContent = 'Editar Perfil CareBridge';
    document.getElementById('sectionAccount').style.display = 'none';
    document.getElementById('sectionRole').style.display = 'none';
    document.getElementById('submitBtn').textContent = 'Guardar Alterações';
    document.getElementById('cancelBtn').href = 'profile.html';
    
    // Disable required fields for credentials
    document.getElementById('regName').removeAttribute('required');
    document.getElementById('regEmail').removeAttribute('required');
    document.getElementById('regPassword').removeAttribute('required');
    document.getElementById('regConfirmPassword').removeAttribute('required');

    await loadCurrentProfileData();
  }

  // Handle Account Type (Role) changes
  if (accountType) {
    accountType.addEventListener('change', () => {
      if (accountType.value === 'admin') {
        keywordGroup.classList.remove('d-none');
        document.getElementById('accessKeyword').setAttribute('required', 'true');
      } else {
        keywordGroup.classList.add('d-none');
        document.getElementById('accessKeyword').removeAttribute('required');
      }
    });
  }

  // Handle dynamic medications addition
  if (addMedicationBtn) {
    addMedicationBtn.addEventListener('click', () => {
      if (noMedsText) noMedsText.classList.add('d-none');
      addMedicationRow('', '', '', '');
    });
  }

  function addMedicationRow(name, dosage, schedule, notes) {
    const rowId = 'med_row_' + Date.now();
    const div = document.createElement('div');
    div.className = 'row g-2 align-items-center mb-2 medication-item';
    div.id = rowId;
    div.innerHTML = `
      <div class="col-md-3">
        <input type="text" class="form-control bg-light form-control-sm med-name" placeholder="Nome" value="${name}" required>
      </div>
      <div class="col-md-2">
        <input type="text" class="form-control bg-light form-control-sm med-dosage" placeholder="Dose (Ex: 1 comp)" value="${dosage}" required>
      </div>
      <div class="col-md-3">
        <input type="text" class="form-control bg-light form-control-sm med-schedule" placeholder="Horário (Ex: 8h/20h)" value="${schedule}" required>
      </div>
      <div class="col-md-3">
        <input type="text" class="form-control bg-light form-control-sm med-notes" placeholder="Notas (Opcional)" value="${notes}">
      </div>
      <div class="col-md-1 text-center">
        <button type="button" class="btn btn-outline-danger btn-sm border-0" onclick="document.getElementById('${rowId}').remove()"><i class="bi bi-trash"></i></button>
      </div>
    `;
    medicationsContainer.appendChild(div);
  }

  async function loadCurrentProfileData() {
    try {
      const response = await fetchWithAuth('/profile');
      if (!response.ok) return;
      const data = await response.json();

      // Populate Caregiver
      if (data.user) {
        document.getElementById('cgAge').value = data.user.age || '';
        document.getElementById('cgRelationship').value = data.user.relationship || '';
        document.getElementById('cgContact').value = data.user.contact || '';
        document.getElementById('cgExperience').value = data.user.experience || 'Iniciante';
        document.getElementById('cgConcerns').value = data.user.concerns || '';
      }

      // Populate Patient
      if (data.patient) {
        document.getElementById('ptName').value = data.patient.name || '';
        document.getElementById('ptAge').value = data.patient.age || '';
        document.getElementById('ptDiagnosis').value = data.patient.diagnosis || '';
        document.getElementById('ptEmergency').value = data.patient.emergency_contact || '';
        document.getElementById('ptBeliefs').value = data.patient.beliefs || '';
      }

      // Populate Medical details
      if (data.medicalRecords) {
        document.getElementById('ptHistory').value = data.medicalRecords.medical_history || '';
        document.getElementById('ptAllergies').value = data.medicalRecords.allergies || '';
        document.getElementById('ptBehaviors').value = data.medicalRecords.behaviors || '';
      }

      // Populate Medications
      if (data.medications && data.medications.length > 0) {
        if (noMedsText) noMedsText.classList.add('d-none');
        data.medications.forEach(med => {
          addMedicationRow(med.name, med.dosage, med.schedule, med.notes || '');
        });
      }
    } catch (err) {
      console.error('Erro ao ler perfil para edição:', err);
    }
  }

  // Form submit handler
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Custom form validation
    if (!profileForm.checkValidity()) {
      e.stopPropagation();
      profileForm.classList.add('was-validated');
      return;
    }

    // Extract values
    const accountTypeValue = accountType ? accountType.value : 'user';
    const accessKeywordValue = document.getElementById('accessKeyword') ? document.getElementById('accessKeyword').value : '';
    
    // Gather caregiver details
    const caregiverData = {
      age: parseInt(document.getElementById('cgAge').value) || null,
      relationship: document.getElementById('cgRelationship').value || null,
      contact: document.getElementById('cgContact').value || null,
      experience: document.getElementById('cgExperience').value || null,
      concerns: document.getElementById('cgConcerns').value || null,
      country: document.getElementById('cgCountry').value || 'Portugal'
    };

    // Gather patient details
    const patientData = {
      name: document.getElementById('ptName').value || null,
      age: parseInt(document.getElementById('ptAge').value) || null,
      diagnosis: document.getElementById('ptDiagnosis').value || null,
      emergency_contact: document.getElementById('ptEmergency').value || null,
      beliefs: document.getElementById('ptBeliefs').value || null,
      medical_history: document.getElementById('ptHistory').value || null,
      allergies: document.getElementById('ptAllergies').value || null,
      behaviors: document.getElementById('ptBehaviors').value || null
    };

    // Gather medications list
    const medicationRows = document.querySelectorAll('.medication-item');
    const medications = Array.from(medicationRows).map(row => {
      return {
        name: row.querySelector('.med-name').value,
        dosage: row.querySelector('.med-dosage').value,
        schedule: row.querySelector('.med-schedule').value,
        notes: row.querySelector('.med-notes').value || null
      };
    });

    try {
      if (editMode) {
        // Submit updates directly
        const updateResponse = await fetchWithAuth('/profile/update', {
          method: 'POST',
          body: JSON.stringify({ caregiver: caregiverData, patient: patientData, medications })
        });

        if (updateResponse.ok) {
          alert('Perfil atualizado com sucesso.');
          window.location.href = 'profile.html';
        } else {
          const err = await updateResponse.json();
          alert('Erro ao atualizar: ' + (err.error || 'Erro desconhecido.'));
        }
      } else {
        // Sign Up Mode
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        if (password !== confirmPassword) {
          alert('As palavras-passe não coincidem.');
          return;
        }

        // Register Account
        const regResponse = await fetch('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            password,
            role: accountTypeValue,
            keyword: accessKeywordValue
          })
        });

        const regData = await regResponse.json();

        if (!regResponse.ok) {
          alert('Erro no registo: ' + (regData.error || 'Erro desconhecido.'));
          return;
        }

        // Store Token & Role
        localStorage.setItem('carebridge_token', regData.token);
        localStorage.setItem('carebridge_role', regData.user.role || 'user');

        // Post caregiver and patient details under new account
        const updateResponse = await fetchWithAuth('/profile/update', {
          method: 'POST',
          body: JSON.stringify({ caregiver: caregiverData, patient: patientData, medications })
        });

        if (updateResponse.ok) {
          alert('Perfil criado com sucesso. Bem-vindo ao CareBridge!');
          window.location.href = 'dashboard.html';
        } else {
          // Fallback if update fails but registration succeeded
          console.warn('Account registered, but profile details failed. Routing to dashboard.');
          window.location.href = 'dashboard.html';
        }
      }
    } catch (error) {
      console.error('Erro de submissão do formulário:', error);
      // Fallback for offline demo mode
      if (!editMode && email === 'demo@carebridge.com') {
        localStorage.setItem('carebridge_token', 'demo_token');
        localStorage.setItem('carebridge_role', 'user');
        window.location.href = 'dashboard.html';
      } else {
        alert('Erro ao ligar ao servidor.');
      }
    }
  });
});
