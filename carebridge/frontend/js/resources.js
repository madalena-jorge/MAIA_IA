/**
 * CareBridge - Biblioteca de Recursos (Frontend)
 * --------------------------------------------------
 * T4: Suporte a upload real de ficheiros (multipart/form-data + dropzone)
 */

let allDocuments = [];
let selectedFile = null; // Ficheiro selecionado na dropzone

document.addEventListener('DOMContentLoaded', async () => {
  // Verifica autenticação
  const token = localStorage.getItem('carebridge_token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // Mostrar botão admin apenas para admins
  const userRole = localStorage.getItem('carebridge_role');
  const addDocBtn = document.getElementById('addDocBtn');
  if (userRole === 'admin') {
    if (addDocBtn) addDocBtn.classList.remove('d-none');
  }

  await loadDocuments();

  // Search & Filter listeners
  const searchBar = document.getElementById('searchBar');
  const categoryFilter = document.getElementById('categoryFilter');
  if (searchBar) searchBar.addEventListener('input', filterAndRenderDocuments);
  if (categoryFilter) categoryFilter.addEventListener('change', filterAndRenderDocuments);

  // === Dropzone Setup ===
  const dropzone = document.getElementById('docDropzone');
  const fileInput = document.getElementById('docFileInput');
  const filePreview = document.getElementById('docFilePreview');
  const dropzonePrompt = document.getElementById('dropzonePrompt');
  const docFileName = document.getElementById('docFileName');
  const docFileSize = document.getElementById('docFileSize');
  const docFileIcon = document.getElementById('docFileIcon');
  const removeBtn = document.getElementById('docFileRemoveBtn');

  function getFileIconHtml(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '<i class="bi bi-file-earmark-pdf-fill text-danger" style="font-size:1.75rem;"></i>';
    if (['doc', 'docx'].includes(ext)) return '<i class="bi bi-file-earmark-word-fill text-primary" style="font-size:1.75rem;"></i>';
    if (['ppt', 'pptx'].includes(ext)) return '<i class="bi bi-file-earmark-ppt-fill text-warning" style="font-size:1.75rem;"></i>';
    return '<i class="bi bi-file-earmark-text-fill text-secondary" style="font-size:1.75rem;"></i>';
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function showFilePreview(file) {
    selectedFile = file;
    docFileName.textContent = file.name;
    docFileSize.textContent = formatFileSize(file.size);
    docFileIcon.innerHTML = getFileIconHtml(file.name);
    dropzonePrompt.classList.add('d-none');
    filePreview.classList.remove('d-none');
  }

  function clearFileSelection() {
    selectedFile = null;
    fileInput.value = '';
    dropzonePrompt.classList.remove('d-none');
    filePreview.classList.add('d-none');
  }

  if (dropzone) {
    // Drag & Drop events
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) showFilePreview(file);
    });

    // Click to open file picker (handled by the native input overlay)
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) showFilePreview(fileInput.files[0]);
      });
    }
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', clearFileSelection);
  }

  // === T4: Validação em tempo real do botão de submissão ===
  const submitDocBtn = document.getElementById('submitDocBtn');

  function validateUploadForm() {
    const titleFilled = (document.getElementById('docTitle')?.value.trim().length ?? 0) > 0;
    const descFilled = (document.getElementById('docDescription')?.value.trim().length ?? 0) > 0;
    const filePicked = selectedFile !== null;
    if (submitDocBtn) {
      submitDocBtn.disabled = !(titleFilled && descFilled && filePicked);
    }
  }

  document.getElementById('docTitle')?.addEventListener('input', validateUploadForm);
  document.getElementById('docDescription')?.addEventListener('input', validateUploadForm);

  // Integração com os eventos de seleção de ficheiro já existentes
  const origShowFilePreview = showFilePreview;
  function showFilePreviewAndValidate(file) {
    origShowFilePreview(file);
    validateUploadForm();
  }
  // Sobrescrever referências para usar a versão com validação
  if (fileInput) {
    fileInput.removeEventListener('change', fileInput._changeHandler);
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) showFilePreviewAndValidate(fileInput.files[0]);
    });
  }
  if (dropzone) {
    dropzone.addEventListener('drop', (e) => {
      validateUploadForm();
    });
  }
  if (removeBtn) {
    removeBtn.addEventListener('click', validateUploadForm);
  }

  // Limpar seleção quando o modal fecha
  const uploadModal = document.getElementById('uploadDocModal');
  if (uploadModal) {
    uploadModal.addEventListener('hidden.bs.modal', () => {
      clearFileSelection();
      document.getElementById('addDocForm').reset();
    });
  }

  // === Form Submit com multipart/form-data ===
  const addDocForm = document.getElementById('addDocForm');
  if (addDocForm) {
    addDocForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('docTitle').value.trim();
      const category = document.getElementById('docCategory').value;
      const description = document.getElementById('docDescription').value.trim();

      if (!title || !category) {
        alert('Por favor preencha o Título e a Categoria.');
        return;
      }

      const submitBtn = addDocForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> A carregar...';

      try {
        let response;

        if (selectedFile) {
          // Upload real com ficheiro
          const formData = new FormData();
          formData.append('title', title);
          formData.append('category', category);
          formData.append('description', description);
          formData.append('document', selectedFile);

          const token = localStorage.getItem('carebridge_token');
          response = await fetch('http://localhost:3000/api/resources/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
        } else {
          // Sem ficheiro — apenas metadados
          response = await fetchWithAuth('/resources', {
            method: 'POST',
            body: JSON.stringify({ title, category, description, file_path: null })
          });
        }

        if (response.ok) {
          // Fechar modal
          const modalEl = document.getElementById('uploadDocModal');
          const modalInstance = bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) modalInstance.hide();
          clearFileSelection();
          addDocForm.reset();
          await loadDocuments();
        } else {
          const err = await response.json();
          alert('Erro ao carregar: ' + (err.error || 'Erro desconhecido.'));
        }
      } catch (error) {
        console.error('Erro de rede:', error);
        alert('Erro de rede ao carregar o documento.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Carregar Artigo';
      }
    });
  }
});

async function loadDocuments() {
  const grid = document.getElementById('documentsGrid');
  if (!grid) return;

  try {
    const response = await fetchWithAuth('/resources');
    if (!response.ok) throw new Error('Failed to fetch resources');
    allDocuments = await response.json();
    renderDocuments(allDocuments);
  } catch (error) {
    console.error('Erro ao carregar biblioteca:', error);
    allDocuments = getMockDocuments();
    renderDocuments(allDocuments);
  }
}

function renderDocuments(docs) {
  const grid = document.getElementById('documentsGrid');
  if (!grid) return;

  if (docs.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-file-earmark-x display-4 text-muted mb-2"></i>
        <p class="text-muted">Nenhum documento encontrado.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = docs.map(doc => {
    let iconClass = 'bi-file-earmark-pdf text-danger';
    if (doc.category === 'Manual') iconClass = 'bi-file-earmark-text text-success';
    if (doc.category === 'Orientação') iconClass = 'bi-file-earmark-play text-warning';
    if (doc.category === 'Estudo') iconClass = 'bi-file-earmark-medical text-primary';
    if (doc.category === 'Recurso Externo') iconClass = 'bi-box-arrow-up-right text-info';

    const isExternal = doc.file_path && doc.file_path.startsWith('http');
    const actionBtn = isExternal
      ? `<a href="${doc.file_path}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-info btn-sm rounded-3"><i class="bi bi-box-arrow-up-right me-1"></i>Ver Recurso</a>`
      : `<button class="btn btn-outline-primary btn-sm rounded-3" onclick="viewDocumentDetail(${doc.id})">Consultar</button>`;

    return `
      <div class="col-md-6 col-lg-4">
        <div class="card h-100 border-0 rounded-4 shadow-sm card-accent-primary">
          <div class="card-body d-flex flex-column">
            <div class="d-flex align-items-center gap-2 mb-3">
              <i class="bi ${iconClass} fs-3"></i>
              <span class="badge bg-primary bg-opacity-10 text-primary small fw-semibold">${doc.category}</span>
            </div>
            <h5 class="card-title fw-bold text-dark mb-2">${doc.title}</h5>
            <p class="card-text text-muted small flex-grow-1">${doc.description || 'Sem descrição.'}</p>
            <div class="mt-3 pt-3 border-top d-flex justify-content-between align-items-center">
              <span class="text-muted" style="font-size: 0.7rem;"><i class="bi bi-calendar me-1"></i> ${new Date(doc.created_at || Date.now()).toLocaleDateString('pt-PT')}</span>
              ${actionBtn}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterAndRenderDocuments() {
  const query = document.getElementById('searchBar').value.toLowerCase();
  const category = document.getElementById('categoryFilter').value;

  const filtered = allDocuments.filter(doc => {
    const matchesQuery = doc.title.toLowerCase().includes(query) || (doc.description && doc.description.toLowerCase().includes(query));
    const matchesCategory = !category || doc.category === category;
    return matchesQuery && matchesCategory;
  });

  renderDocuments(filtered);
}

function viewDocumentDetail(docId) {
  const doc = allDocuments.find(d => d.id === docId);
  if (!doc) return;

  document.getElementById('viewDocModalLabel').textContent = doc.title;
  document.getElementById('viewDocCategory').textContent = doc.category;
  document.getElementById('viewDocUploader').textContent = doc.uploader_name || 'Sistema';
  document.getElementById('viewDocDate').textContent = new Date(doc.created_at || Date.now()).toLocaleDateString('pt-PT');
  document.getElementById('viewDocDescription').textContent = doc.description || 'Nenhuma descrição fornecida.';
  document.getElementById('viewDocPath').textContent = doc.file_path || 'Sem ficheiro físico associado.';

  const downloadLink = document.getElementById('viewDocDownloadLink');
  if (doc.file_path) {
    const href = doc.file_path.startsWith('http') ? doc.file_path : `http://localhost:3000/${doc.file_path}`;
    downloadLink.href = href;
    downloadLink.classList.remove('disabled');
  } else {
    downloadLink.href = '#';
    downloadLink.classList.add('disabled');
  }

  const modalEl = document.getElementById('viewDocModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

window.viewDocumentDetail = viewDocumentDetail;

function getMockDocuments() {
  return [
    {
      id: 9991,
      title: 'Manual de Sobrevivência do Cuidador',
      category: 'Manual',
      description: 'Como lidar com episódios de agitação psicomotora, recusa de medicação e desorientação temporal em casa.',
      file_path: null,
      uploader_name: 'CareBridge Sistema',
      created_at: '2026-06-15T10:00:00.000Z'
    },
    {
      id: 9992,
      title: 'Estratégias de Comunicação Não-Verbal',
      category: 'Orientação',
      description: 'Recomendações clínicas para comunicação empática a doentes com afasia decorrente de Alzheimer em estágio avançado.',
      file_path: null,
      uploader_name: 'CareBridge Sistema',
      created_at: '2026-06-20T14:30:00.000Z'
    },
    {
      id: 9993,
      title: 'Estudo Clínico: Nutrição e Cognição',
      category: 'Estudo',
      description: 'Artigo clínico focado no impacto de dietas ricas em ómega-3 e antioxidantes na progressão de défices cognitivos ligeiros.',
      file_path: null,
      uploader_name: 'CareBridge Sistema',
      created_at: '2026-06-25T09:15:00.000Z'
    }
  ];
}
