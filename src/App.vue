<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
// To git push
//git add .
//git commit -m "Second interface"
//git push
// --- ESTADO (Antes data()) ---
const licitaciones = ref([]);
const pagination = ref({ total: 0, pages: 1, currentPage: 1, pageSize: 10 });
const loading = ref(false);
const search = ref('');

// --- LÓGICA / MÉTODOS (Antes methods) ---

// Función para traer datos de tu API de NestJS
const obtenerDatos = async (targetPage = pagination.value.currentPage) => {
  loading.value = true;
  try {
    // Cambia esta URL por la de tu backend
    const { data } = await axios.get('/api/licitaciones', {
      params: {
        page: targetPage,
        limit: pagination.value.pageSize,
        search: search.value.trim() || undefined,
      },
    });
    console.log('Datos obtenidos:', data);
    licitaciones.value = data.results;
    pagination.value = data.info;
  } catch (error) {
    console.error('Error al obtener licitaciones:', error);
    alert('No se pudo conectar con el servidor.');
  } finally {
    loading.value = false;
  }
};

const goToPage = (nextPage) => {
  const total = pagination.value.pages || 1;
  const safePage = Math.min(Math.max(1, nextPage), total);
  if (safePage === pagination.value.currentPage) return;
  obtenerDatos(safePage);
};

const formatMoneda = (valor) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(valor);
};

const streamUrlFor = (fileId) => `/api/stream?file_id=${encodeURIComponent(fileId)}`;
const downloadUrlFor = (fileId) => `/api/download?file_id=${encodeURIComponent(fileId)}`;

const generarPropuesta = (id) => {
  console.log(`Iniciando agente AI para licitación: ${id}`);
  // Aquí llamarías a tu proceso de OpenClaw o LangChain
};

// --- PROPIEDADES COMPUTADAS (Computed) ---
const normalizeDate = (value) => {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const str = String(value).trim();
  if (!str) return "";
  const iso = str.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const dmy = str.match(/(\d{2})[\/.-](\d{2})[\/.-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return "";
};

const licitacionesFiltradas = computed(() => licitaciones.value);

const debounce = (fn, wait = 400) => {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

const debouncedSearch = debounce(() => {
  obtenerDatos(1);
}, 400);

watch(search, () => {
  debouncedSearch();
});

// --- HOOKS (Antes created/mounted) ---

// En Vue 3.5, lo que quieres que pase al "crearse" el componente
// simplemente se escribe aquí en la raíz del script.
console.log("Componente inicializado...");

// Si necesitas que algo pase específicamente cuando el DOM esté listo:
onMounted(() => {
  console.log("Componente montado en el DOM.");
  obtenerDatos();
});

const dateFilter = ref('');
const isDark = ref(false);

// --- GENERATE BUTTON LOGIC (PER CARD) ---
const summaryById = ref({});
const generatingById = ref({});
const speedMs = 0;
const expandedById = ref({});
const hoverById = ref({});

const demoText = `Fixed-price public contract (€157,337.86 excl. VAT) for full creativity, design, and production of a national campaign, to be executed in 40 calendar days, with single payment after completion, no price revision, and a 5% performance guarantee required.
Scope is broad and complex: multiple creative proposals (TV, radio, digital, social, print, merchandising), detailed technical deliverables, competitive scoring weighted 60% on subjective quality, and extensive administrative compliance, creating high upfront workload and execution risk within a short timeframe.
Overall assessment: financially acceptable only for well-resourced agencies; tight schedule, deferred payment, no price adjustment, and high creative demands reduce margin flexibility and increase risk, making the contract demanding relative to its budget and execution period.`;

const getRequestId = (request, idx) => {
  if (request && request.id !== undefined && request.id !== null && String(request.id).trim() !== "") {
    return String(request.id);
  }
  if (request && request.expediente) return `expediente:${request.expediente}`;
  if (request && request.url) return `url:${request.url}`;
  return `row:${idx}`;
};

function handleGenerateClick(requestId) {
  generatingById.value = { ...generatingById.value, [requestId]: true };
  summaryById.value = { ...summaryById.value, [requestId]: "" };
  let i = 0;
  const tick = () => {
    summaryById.value = { ...summaryById.value, [requestId]: demoText.slice(0, i) };
    i++;
    if (i <= demoText.length) {
      setTimeout(tick, speedMs);
    } else {
      generatingById.value = { ...generatingById.value, [requestId]: false };
    }
  };
  tick();
}

const isExpanded = (requestId) => Boolean(expandedById.value[requestId]);

const toggleExpanded = (requestId) => {
  expandedById.value = {
    ...expandedById.value,
    [requestId]: !expandedById.value[requestId],
  };
};

const needsExpandToggle = (text, maxLength = 120) => {
  const value = String(text ?? '').trim();
  return value.length > maxLength;
};

const getCollapsedText = (text, maxLength = 120) => {
  const value = String(text ?? '').trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
};

const setGifHover = (requestId, isHover) => {
  hoverById.value = {
    ...hoverById.value,
    [requestId]: isHover,
  };
};

const gifSrcFor = (requestId) => (hoverById.value[requestId] ? '/hoover_button.gif' : '/button.gif');
</script>

<template>
  <div :class="['page-wrapper', isDark ? 'dark-mode' : '']">
    <!-- Header (fixed) -->
    <header class="header fixed-header">
      <div class="header-content">
        <a class="navbar-brand d-inline-block h-blur" href="/">
          <img class="hidden md:block logo-img" src="/main_logo.svg" alt="Logo" width="260" height="0">
          <img class="md:hidden logo-img" src="/main_logo2.svg" alt="Logo" width="125" height="0">
        </a>
        <div>
          <h1>Sokorro Public Design Requests</h1>
          <p class="subtitle">Find and explore the latest public design requests, filtered by AI.</p>
        </div>
        <input v-model="search" type="text" placeholder="Search by keywords..."
          class="filter-input header-search-input" />
        <div class="theme-toggle">
          <!-- From Uiverse.io by artginzburg -->
          <label class="switch">
            <input v-model="isDark" class="checkbox" type="checkbox" />
            <span class="slider"></span>
            <!--Copyright - 2026 Praashoo7 (Prashant) 
Copyright - 2026 artginzburg (Arthur Ginzburg) 

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
-->
          </label>
        </div>
      </div>
    </header>

    <!-- Everything else scrolls -->
    <div class="main-scrollable">
      <!-- Mobile search under header -->
      <section class="filters filters-bar mobile-search-section mt-[50px] lg:mt-[5px]">
        <input v-model="search" type="text" placeholder="Search by keywords..." class="filter-input" />
      </section>

      <!-- Requests list -->
      <main class="container mt-[40px] lg:mt-[0px]">
        <div v-if="licitacionesFiltradas.length === 0" class="no-results">
          No requests found.
        </div>
        <div v-else class="request-list">
          <div v-for="(request, idx) in licitacionesFiltradas" :key="getRequestId(request, idx)"
            class="request-card neumorph-card mb-4">
            <div class="request-card-content">
              <div class="request-col request-col-main">
                <h2 class="request-title">
                  {{
                    isExpanded(getRequestId(request, idx))
                      ? request.objeto_cont
                      : getCollapsedText(request.objeto_cont)
                  }}
                  <span
                    v-if="needsExpandToggle(request.objeto_cont)"
                    class="expand-toggle"
                    role="button"
                    tabindex="0"
                    @click="toggleExpanded(getRequestId(request, idx))"
                    @keyup.enter="toggleExpanded(getRequestId(request, idx))"
                    @keyup.space.prevent="toggleExpanded(getRequestId(request, idx))"
                  >
                    {{ isExpanded(getRequestId(request, idx)) ? ' Moins' : ' Plus' }}
                  </span>
                </h2>
                <div class="request-card-footer">
                  <div class="request-genre">{{ request.expediente }}</div>
                  <div class="request-action flex">
                    <button
                      v-if="!summaryById[getRequestId(request, idx)] && !generatingById[getRequestId(request, idx)]"
                      class="gif_button" @mouseenter="setGifHover(getRequestId(request, idx), true)"
                      @mouseleave="setGifHover(getRequestId(request, idx), false)"
                      @focus="setGifHover(getRequestId(request, idx), true)"
                      @blur="setGifHover(getRequestId(request, idx), false)"
                      @click="handleGenerateClick(getRequestId(request, idx))">
                      <img :src="gifSrcFor(getRequestId(request, idx))" alt="Resume PDF" class="gif-img" />
                    </button>
                    <div v-else class="generated-text-area whitespace-pre-wrap">
                      {{ summaryById[getRequestId(request, idx)] }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="request-col request-col-meta">
                <div class="meta-row"><strong>Price:</strong><span>{{ request.importe }}</span></div>
                <div class="meta-row"><strong>Published:</strong><span>{{ request.f_publicacion }}</span></div>
                <div class="meta-row"><strong>Deadline:</strong><span>{{ request.fecha_fin_po }}</span></div>
                <div class="meta-row"><strong>Place:</strong><span>{{ request.lugar_ejecucion }}</span></div>
              </div>

              <div class="request-col request-col-links">
                <div class="meta-row">
                  <strong>URL:</strong>
                  <a :href="request.url" target="_blank" rel="noopener">Licitacion</a>
                </div>
                <div v-if="request.archivos_principales && request.archivos_principales.length" class="files-block">
                  <div class="file-list">
                    <div class="file-items gap-2 flex" v-for="archivo in request.archivos_principales"
                      :key="archivo.telegram_file_id">

                      <a class="file-badge items-center rounded-md bg-indigo-50 px-2 py-1 text-sm font-medium text-indigo-700 inset-ring inset-ring-indigo-700/10"
                        :href="streamUrlFor(archivo.telegram_file_id)" target="_blank" rel="noopener">
                        {{ archivo.etiqueta?.replace(/_/g, ' ') || 'Sans nom' }}
                      </a>
                      <a class="download-btn download-badge inline-flex rounded-md bg-red-50 px-1.5 py-1 text-sm font-medium text-red-700 inset-ring inset-ring-red-600/10"
                        :href="downloadUrlFor(archivo.telegram_file_id)" target="_blank" rel="noopener">
                        <svg class="w-4 h-4 text-gray-800 dark:text-dark" aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 18">
                          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M8 1v11m0 0 4-4m-4 4L4 8m11 4v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-3" />
                        </svg>
                      </a>
                    </div>
                  </div>
                  <!--Copyright - 2026 Ashon-G (Vashon Gonzales) 
Copyright - 2026 adamgiebl (Adam Giebl) 

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
-->
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="licitacionesFiltradas.length > 0" class="pagination">
          <button class="pagination-btn" :disabled="loading || pagination.currentPage <= 1"
            @click="goToPage(pagination.currentPage - 1)">
            Previous
          </button>
          <div class="pagination-info">
            Page {{ pagination.currentPage }} / {{ pagination.pages }} • {{ pagination.total }} total
          </div>
          <div class="pagination-pages">
            <button v-for="pageNumber in pagination.pages" :key="pageNumber" class="pagination-btn page-number-btn"
              :class="{ 'is-active': pageNumber === pagination.currentPage }" :disabled="loading"
              @click="goToPage(pageNumber)">
              {{ pageNumber }}
            </button>
          </div>
          <button class="pagination-btn" :disabled="loading || pagination.currentPage >= pagination.pages"
            @click="goToPage(pagination.currentPage + 1)">
            Next
          </button>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.page-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(120deg, #e0e7ef 0%, #f4f6fa 100%);
  position: relative;
  overflow-x: hidden;
  border-radius: 15px;
  background: #e0e0e0;
  box-shadow: 32px 32px 64px #5a5a5a,
    -32px -32px 64px #ffffff;
}

.header {
  /*background: rgba(255,255,255,0.7);*/
  backdrop-filter: blur(8px);
  color: #222;
  padding: 0.7rem 0 0.3rem 0;
  box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.07);
}

.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  z-index: 100;
  box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.07);
}

.main-scrollable {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-top: 110px;
  /* header (50-60px) + filters (50px) */
}

.header-content {
  max-width: 100vw;
  margin: 10px;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0 1.2rem;
}

.h-blur:hover {
  filter: blur(1.5px);
}

h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.subtitle {
  margin: 0.1rem 0 0 0;
  font-size: 0.95rem;
  color: #0078d4;
  font-weight: 500;
}

.theme-toggle {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transform: rotate(90deg);
}

.filters {
  width: 100vw;
  max-width: none;

  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  border-radius: 0 0 12px 0;
  padding: 0.5rem 1.2rem 0.5rem 1.2rem;
  position: fixed;
  top: 90px;
  left: 0;
  z-index: 101;
  box-sizing: border-box;
}

.filters-bar {
  justify-content: flex-start;
}

.filter-input,
.filter-select {
  min-width: 180px;
  max-width: 320px;
  width: 100%;
  flex: 1 1 180px;
  padding: 0.7rem 1.2rem;
  border-radius: 10px;
  border: none;
  font-size: 1rem;
  background: #f4f6fa;
  box-shadow: 2px 2px 8px #969aa0, -2px -2px 8px #fff;
  outline: none;
  transition: box-shadow 0.2s;
}

.filter-input:focus,
.filter-select:focus {
  box-shadow: 2px 2px 8px #060707, -2px -2px 8px #fff;
}

.summary-blur {
  min-width: 400px;
  min-height: 60px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 18px;
  box-shadow: 0 4px 32px 0 rgba(0, 0, 0, 0.10);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  color: #0078d4;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.container {
  width: 100%;
  max-width: 1100%;
  flex: 1;
  padding: 0 8rem;
  box-sizing: border-box;
}

.request-list {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  margin-top: 0.7rem;
}

.request-card {
  width: 100%;
  min-height: 10px;
  display: flex;
  align-items: center;
  background: #f4f6fa;
  border-radius: 14px;
  box-shadow: 4px 4px 12px #d1d9e6, -4px -4px 12px #fff;
  transition: box-shadow 0.2s, transform 0.2s;
  padding: 0;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

.neumorph-card:hover {
  box-shadow: 0 1px 32px 0 #b0c4de, 0 0.001px 8px 0 #fff;
  transform: translateY(-2px) scale(1.01);
}

.request-card-content {
  display: grid;
  grid-template-columns: minmax(280px, 1.7fr) minmax(250px, 1.2fr) minmax(240px, 1fr);
  align-items: start;
  width: 100%;
  padding: 0.85rem 1rem;
  gap: 1.3rem;
}

.request-col {
  min-width: 0;
}

.request-col-main {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.75rem;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  padding-right: 1rem;
}

.request-col-main h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #222;
  line-height: 1.28;
}

.request-title {
  min-height: 3.3em;
}

.expand-toggle {
  display: inline;
  margin-left: 0.15rem;
  color: #475569;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.request-card-footer {
  display: flex;
  align-items: center;
}

.request-genre {
  font-size: 1.05rem;
  color: #00b4d4;
  font-weight: 600;
}

.request-action {
  margin-left: auto; /* pousse Generate à droite */
  min-width: 0;      /* évite de réserver trop d'espace */
}

.request-col-meta {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 1.05rem;
  color: #444;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  padding-right: 1rem;
}

.request-col-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 1.05rem;
  color: #444;
}

.meta-row {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  line-height: 1.35;
}

.meta-row strong {
  flex: 0 0 auto;
}

.request-col-meta .meta-row strong {
  min-width: 88px;
}

.request-col-links a {
  color: #0078d4;

  font-weight: 500;
}

.files-block {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.file-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.65rem;
  flex-wrap: wrap;
}

a.download-btn {
  text-decoration: none;
  /* Supprime le soulignement */
  color: inherit;
  /* Utilise la couleur du texte environnant */
}



.no-results {
  text-align: center;
  color: #888;
  font-size: 1.2rem;
  margin-top: 3rem;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 1.2rem 0 2rem 0;
}

.pagination-btn {
  padding: 0.5rem 1rem;
  border-radius: 10px;
  border: none;
  background: #f4f6fa;
  box-shadow: 2px 2px 8px #e3e9f1, -2px -2px 8px #fff;
  cursor: pointer;
  font-weight: 600;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.95rem;
  color: #555;
  font-weight: 600;
}

.pagination-pages {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.page-number-btn {
  min-width: 40px;
}

.page-number-btn.is-active {
  background: #0078d4;
  color: #fff;
  box-shadow: none;
}

.generated-text-area {
  padding: 0.7rem 1rem;
  border-radius: 15px;
  background: #e0e0e0;
  box-shadow: inset 7px 7px 19px #bebebe,
    inset -7px -7px 19px #ffffff;
  font-size: 1rem;
  color: #222;
  min-width: 200px;
  max-width: 100%;
  word-break: break-word;
}

@media (max-width: 1180px) {
  .request-card-content {
    grid-template-columns: 1.35fr 1fr;
  }

  .request-col-main,
  .request-col-meta {
    border-right: none;
    padding-right: 0;
  }

  .request-col-links {
    grid-column: 1 / -1;
    border-top: 1px dashed rgba(0, 0, 0, 0.16);
    padding-top: 0.7rem;
  }
}

@media (max-width: 800px) {
  .main-scrollable {
    margin-top: 150px;
  }

  .header-content,
  .filters,
  .container {
    max-width: 100vw;
    padding-left: 0.2rem;
    padding-right: 0.2rem;
  }

  .request-card-content {
    grid-template-columns: 1fr;
    gap: 0.7rem;
    padding: 0.7rem 0.5rem;
  }

  .request-col-main,
  .request-col-meta {
    border-right: none;
    padding-right: 0;
  }

  .request-col-links {
    border-top: 1px dashed rgba(0, 0, 0, 0.14);
    padding-top: 0.65rem;
  }

  .request-action {
    margin-left: 0;
    min-width: 0;
    width: 100%;
  }

  .summary-blur {
    min-width: 98vw;
    font-size: 1rem;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    padding: 0.5rem 0.5rem;
    top: 85px;
  }

  .filter-input,
  .filter-select {
    min-width: 0;
    max-width: none;
    width: 100%;
    flex: 1 1 100%;
  }

  .logo {
    width: 28px;
    height: 28px;
  }

  h1 {
    font-size: 1.1rem;
  }

  .container {
    padding: 0 0.1rem;
  }

  .header-search-input {
    display: none;
  }

  .mobile-search-section {
    display: flex !important;
  }
}

.mobile-search-section {
  display: none;
}

/* Hide summary button in offers */
.summary-btn {
  display: none !important;
}

/* The switch - the box around the slider */
.switch {
  --container-width: 3.5em;

  font-size: 17px;
  position: relative;
  display: inline-block;
  width: var(--container-width);
  height: 2em;
}

/* Hide default HTML checkbox */
.switch .checkbox {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The slider */
.slider {
  --width: 0.4em;
  --offset: 0.3em;
  --transition-duration: 0.4s;

  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #ccc;
  box-shadow: inset 2px 5px 10px rgba(0, 0, 0, 0.3);
  transition: var(--transition-duration);
  transition-property: background-color, box-shadow;
  border-radius: 5px;
}

.slider::before {
  position: absolute;
  content: "";
  height: 1.4em;
  width: var(--width);
  border-radius: 0.1em;
  left: var(--offset);
  bottom: var(--offset);
  background-color: white;
  transition: transform var(--transition-duration);
}

.checkbox:checked+.slider {
  background-color: #171717;
  box-shadow: inset 2px 5px 10px transparent;
}

.checkbox:checked+.slider::before {
  transform: translateX(calc(var(--container-width) - var(--offset) * 2 - var(--width))) rotate(1turn);
}

.dark-mode {
  background: #1a1a1a;
  color: #f0f0f0;
}

.dark-mode .header {
  color: #f0f0f0;
  background: rgba(28, 28, 28, 0.85);
  box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.45);
}

.logo-img {
  transition: filter 0.2s ease;
}

.dark-mode .logo-img {
  filter: brightness(0) invert(1);
}

.dark-mode .subtitle {
  color: #c4c4c4;
}

.dark-mode .filters {
  background: transparent;
}

.dark-mode .filter-input,
.dark-mode .filter-select {
  background: #222222;
  color: #f0f0f0;
  box-shadow: inset 2px 2px 8px #121212, inset -2px -2px 8px #2c2c2c;
}

.dark-mode .filter-input::placeholder {
  color: #9a9a9a;
}

.dark-mode .filter-input:focus,
.dark-mode .filter-select:focus {
  box-shadow: 0 0 0 2px #5a5a5a;
}

.dark-mode .request-col-main h2 {
  color: #f6f6f6;
}

.dark-mode .expand-toggle {
  color: #e2e8f0;
}

.dark-mode .request-col-meta,
.dark-mode .request-col-links,
.dark-mode .meta-row span {
  color: #f0f0f0;
}

.dark-mode .meta-row strong {
  color: #ffffff;
}

.dark-mode .request-card-content {
  background-color: #1f1f1f;
}

.dark-mode .request-col-main,
.dark-mode .request-col-meta {
  border-right-color: rgba(255, 255, 255, 0.15);
}

.dark-mode .request-col-links {
  border-top-color: rgba(255, 255, 255, 0.2);
}

.dark-mode .request-genre {
  color: #d0d0d0;
}

.dark-mode .request-col-links a {
  color: #e0e0e0;
}

.dark-mode .download-btn {
  border-color: #e0e0e0;
  color: #e0e0e0;
}

.dark-mode .file-badge {
  background-color: #1e293b !important;
  color: #dbeafe !important;
  box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.35);
}

.dark-mode .download-badge {
  background-color: #3f1d1d !important;
  color: #fecaca !important;
  box-shadow: inset 0 0 0 1px rgba(252, 165, 165, 0.4);
}

.dark-mode .download-badge svg {
  color: inherit;
}

.dark-mode .request-card {
  background: #202020;
  box-shadow: 4px 4px 12px #0f0f0f, -4px -4px 12px #2a2a2a;
}

.dark-mode .neumorph-card:hover {
  box-shadow: 0 8px 32px 0 #0f0f0f, 0 1.5px 8px 0 #2a2a2a;
}

.dark-mode .no-results {
  color: #bdbdbd;
}

.dark-mode .generated-text-area {
  background: #1c1c1c;
  color: #f0f0f0;
  box-shadow: inset 7px 7px 19px #0f0f0f, inset -7px -7px 19px #2a2a2a;
}

.dark-mode .pagination-btn {
  background: #222222;
  color: #f0f0f0;
  box-shadow: inset 2px 2px 8px #121212, inset -2px -2px 8px #2c2c2c;
}

.dark-mode .pagination-info {
  color: #cfcfcf;
}

.dark-mode .page-number-btn.is-active {
  background: #f0f0f0;
  color: #1a1a1a;
}

.gif_button {
  width: 130px;
  height: 48px;
  overflow: hidden;
  border-radius: 50px;
}
  .gif-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scale(1.12);
    /* augmente pour rogner plus */
    transform-origin: center;
}
</style>

<script>
import { ref, computed, onMounted } from "vue"
const text = ``

const speedMs = 40

const displayedText = ref("")
let i = 0

onMounted(() => {
  const tick = () => {
    displayedText.value = text.slice(0, i)
    i++

    if (i <= text.length) {
      setTimeout(tick, speedMs)
    }
  }

  tick()
})




</script>
