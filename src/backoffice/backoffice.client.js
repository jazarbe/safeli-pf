/* ═══════════════════════════════════════════════════════════════
   ESTADO GLOBAL Y CONTROLES
═══════════════════════════════════════════════════════════════ */
let currentPage   = 1;
let totalPages    = 1;
let totalCount    = 0;
let activeFilters = {};

/* ═══════════════════════════════════════════════════════════════
   REFS DOM
═══════════════════════════════════════════════════════════════ */
const tableBody   = document.getElementById('table-body');
const pagination  = document.getElementById('pagination');
const resultCount = document.getElementById('result-count');
const emptyState  = document.getElementById('empty-state');
const loader      = document.getElementById('loader');

/* TEMA TOGGLE REFS */
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon      = document.getElementById('theme-icon');
const themeText      = document.getElementById('theme-text');

/* ═══════════════════════════════════════════════════════════════
   UTILIDADES Y MANEJO DE TEMA
═══════════════════════════════════════════════════════════════ */
function showLoader(on) { loader.style.display = on ? 'flex' : 'none'; }

function gravedadPill(g) {
  if (g === null || g === undefined) return '<span class="gravedad-pill baja">—</span>';
  const n   = parseFloat(g);
  const cls = n >= 7 ? 'alta' : n >= 4 ? 'media' : 'baja';
  return `<span class="gravedad-pill ${cls}">${n.toFixed(2)}</span>`;
}

function skeletonRows(n) {
  return Array.from({ length: n }, () => `
    <tr>
      <td><div class="skel w30"></div></td>
      <td><div class="skel w80"></div></td>
      <td><div class="skel w40"></div></td>
      <td><div class="skel w30"></div></td>
      <td><div class="skel w60"></div></td>
      <td><div class="skel w60"></div></td>
      <td><div class="skel w30"></div></td>
    </tr>`).join('');
}

function initTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  updateThemeUI(currentTheme);
}

function updateThemeUI(theme) {
  if (theme === 'dark') {
    themeIcon.textContent = '☀️';
    themeText.textContent = 'Modo Claro';
  } else {
    themeIcon.textContent = '🌙';
    themeText.textContent = 'Modo Oscuro';
  }
}

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeUI(newTheme);
});

/* ═══════════════════════════════════════════════════════════════
   TABLA — RENDER Y FETCH
═══════════════════════════════════════════════════════════════ */
function renderRows(rows) {
  if (!rows || rows.length === 0) {
    tableBody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  tableBody.innerHTML = rows.map(r => `
    <tr>
      <td class="td-id"><b>#${r.id}</b></td>
      <td class="td-ubicacion">${r.ubicacion ?? '—'}</td>
      <td class="td-fecha">${r.fecha ?? '—'}</td>
      <td>${gravedadPill(r.gravedad)}</td>
      <td class="td-tipo">${r.tipo ?? '—'}</td>
      <td class="td-subtipo">${r.subtipo ?? '—'}</td>
      <td class="td-idsubtipo">${r.idSubtipo ?? '—'}</td>
    </tr>`).join('');
}

function renderPagination(total, current) {
  const pages = [];
  const delta = 2;
  const left  = current - delta;
  const right = current + delta;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= left && i <= right)) pages.push(i);
    else if (i === left - 1 || i === right + 1) pages.push('...');
  }

  pagination.innerHTML = `
    <button class="pg-btn" id="pg-prev" ${current === 1 ? 'disabled' : ''}>←</button>
    ${pages.map(p => p === '...'
      ? `<span class="pg-ellipsis">…</span>`
      : `<button class="pg-btn ${p === current ? 'active' : ''}" data-page="${p}">${p}</button>`
    ).join('')}
    <button class="pg-btn" id="pg-next" ${current === total ? 'disabled' : ''}>→</button>`;

  pagination.querySelectorAll('[data-page]').forEach(btn =>
    btn.addEventListener('click', () => fetchDelitos(parseInt(btn.dataset.page)))
  );
  document.getElementById('pg-prev')?.addEventListener('click', () => fetchDelitos(current - 1));
  document.getElementById('pg-next')?.addEventListener('click', () => fetchDelitos(current + 1));
}

function updateSortHeaders() {
  const sortBy  = document.getElementById('sort-by').value;
  const sortDir = document.getElementById('sort-dir').value;
  document.querySelectorAll('th[data-col]').forEach(th => {
    const col = th.dataset.col;
    th.classList.toggle('active', col === sortBy);
    const sortIcon = th.querySelector('.sort-icon');
    if (sortIcon) {
      sortIcon.textContent = col !== sortBy ? '↕' : sortDir === 'asc' ? '↑' : '↓';
    }
  });
}

async function fetchDelitos(page = 1) {
  currentPage = page;
  tableBody.innerHTML = skeletonRows(10);
  emptyState.style.display = 'none';

  const pageSize = parseInt(document.getElementById('page-size').value);
  const sortBy   = document.getElementById('sort-by').value;
  const sortDir  = document.getElementById('sort-dir').value;

  const params = new URLSearchParams({
    page, pageSize, sortBy, sortDir,
    ...Object.fromEntries(
      Object.entries(activeFilters).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    )
  });

  try {
    const res  = await fetch(`/delitos/delitos?${params}`);
    const data = await res.json();

    totalCount = data.total ?? 0;
    totalPages = Math.ceil(totalCount / pageSize) || 1;

    resultCount.innerHTML = `<b>${totalCount.toLocaleString('es-AR')}</b> registros`;
    renderRows(data.data);
    renderPagination(totalPages, currentPage);
    updateSortHeaders();
  } catch (err) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="color:var(--danger);padding:24px;font-family:var(--mono);font-size:12px;">
          Error al cargar datos: ${err.message}
        </td>
      </tr>`;
  }
}

/* ═══════════════════════════════════════════════════════════════
   FILTROS — DROPDOWNS Y EVENTOS
═══════════════════════════════════════════════════════════════ */
async function cargarTipos() {
  try {
    const res  = await fetch('/delitos/tipos');
    const data = await res.json();
    const sel  = document.getElementById('f-tipo');
    data.forEach(t => {
      const opt = document.createElement('option');
      opt.value       = t.id;
      opt.textContent = t.nombre;
      sel.appendChild(opt);
    });
  } catch (e) { console.warn('No se pudieron cargar los tipos:', e); }
}

async function cargarSubtipos(idTipo = '') {
  const sel = document.getElementById('f-subtipo');
  sel.innerHTML = '<option value="">Todos los subtipos</option>';
  if (!idTipo) return;
  try {
    const res  = await fetch(`/delitos/subtipos?idTipo=${idTipo}`);
    const data = await res.json();
    data.forEach(s => {
      const opt = document.createElement('option');
      opt.value       = s.id;
      opt.textContent = s.nombre;
      sel.appendChild(opt);
    });
  } catch (e) { console.warn('No se pudieron cargar los subtipos:', e); }
}

document.getElementById('f-tipo').addEventListener('change', e => cargarSubtipos(e.target.value));

document.getElementById('btn-aplicar').addEventListener('click', () => {
  activeFilters = {
    idDesde:   document.getElementById('f-id-desde').value,
    idHasta:   document.getElementById('f-id-hasta').value,
    mes:       document.getElementById('f-mes').value,
    anio:      document.getElementById('f-anio').value,
    gravMin:   document.getElementById('f-grav-min').value,
    gravMax:   document.getElementById('f-grav-max').value,
    idTipo:    document.getElementById('f-tipo').value,
    idSubtipo: document.getElementById('f-subtipo').value,
  };
  fetchDelitos(1);
});

document.getElementById('btn-limpiar').addEventListener('click', () => {
  ['f-id-desde', 'f-id-hasta', 'f-anio', 'f-grav-min', 'f-grav-max']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-mes').value = '';
  document.getElementById('f-tipo').value = '';
  cargarSubtipos('');
  activeFilters = {};
  fetchDelitos(1);
});

document.querySelectorAll('th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    const col     = th.dataset.col;
    const sortBy  = document.getElementById('sort-by');
    const sortDir = document.getElementById('sort-dir');
    if (sortBy.value === col) {
      sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy.value  = col;
      sortDir.value = 'asc';
    }
    fetchDelitos(1);
  });
});

document.getElementById('sort-by').addEventListener('change',   () => fetchDelitos(1));
document.getElementById('sort-dir').addEventListener('change',  () => fetchDelitos(1));
document.getElementById('page-size').addEventListener('change', () => fetchDelitos(1));

/* ═══════════════════════════════════════════════════════════════
   IMPORTACIÓN — DRAG & DROP + PICKER (CORREGIDO)
═══════════════════════════════════════════════════════════════ */
const fileDrop     = document.getElementById('file-drop');
const fileInput    = document.getElementById('file-input');
const fileNameDiv  = document.getElementById('file-name');
const btnImportar  = document.getElementById('btn-importar');
const importResult = document.getElementById('import-result');
let selectedFile   = null;

function setFile(file) {
  if (!file) return;
  selectedFile              = file;
  fileNameDiv.textContent   = file.name;
  fileNameDiv.style.display = 'block';
  btnImportar.disabled      = false;
  importResult.style.display = 'none';
}

fileDrop.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => setFile(e.target.files[0]));

fileDrop.addEventListener('dragover', e => { e.preventDefault(); fileDrop.classList.add('dragging'); });
fileDrop.addEventListener('dragleave', ()  => fileDrop.classList.remove('dragging'));
fileDrop.addEventListener('drop', e => {
  e.preventDefault();
  fileDrop.classList.remove('dragging');
  setFile(e.dataTransfer.files[0]);
});

btnImportar.addEventListener('click', async () => {
  if (!selectedFile) return;

  btnImportar.disabled      = true;
  btnImportar.textContent   = 'Importando…';
  importResult.style.display = 'none';
  showLoader(true);

  const formData = new FormData();
  formData.append('archivo', selectedFile);

  try {
    // CORRECCIÓN: Apuntamos al endpoint raíz unificado configurado en index.js
    const res  = await fetch('/importar', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.success) {
      importResult.className   = 'ok';
      importResult.textContent = data.message;
      fetchDelitos(1); // Recarga la tabla en la página 1 para ver lo nuevo
    } else {
      importResult.className   = 'err';
      importResult.textContent = `Error: ${data.error}` + (data.details ? `\n${data.details}` : '');
    }
  } catch (err) {
    importResult.className   = 'err';
    importResult.textContent = `Error de red: ${err.message}`;
  } finally {
    importResult.style.display = 'block';
    btnImportar.textContent    = 'Importar';
    showLoader(false);
    selectedFile              = null;
    fileNameDiv.style.display = 'none';
    fileInput.value           = '';
    btnImportar.disabled      = true;
  }
});

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */
(async () => {
  initTheme();
  await cargarTipos();
  fetchDelitos(1);
})();