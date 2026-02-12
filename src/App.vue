<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import axios from 'axios';

// --- CONFIGURACIÓN ---
const HF_BACKEND_URL = "http://localhost:8000";
//const HF_BACKEND_URL = "https://vipaugusto-backend-ai-hf.hf.space";
// Mapa de estados para usar nombres en lugar de números mágicos
const STATUS = {
  PENDING: 1,
  ANALYZING: 2,
  COMPLETED: 3,
  ERROR: 4
};

// --- ESTADO ---
const licitaciones = ref([]);
const pagination = ref({ total: 0, pages: 1, currentPage: 1, pageSize: 10 });
const loading = ref(false);
const search = ref('');
const isDark = ref(false);

// Almacén de intervalos de polling activos: { [idLicitacion]: intervalId }
const activePolls = ref({});

// --- LÓGICA DE IA Y POLLING ---

// 1. Acción del botón: Dispara la IA
const handleGenerateClick = async (licitacion) => {
  // Evitar doble clic si ya está analizando
  if (licitacion.estado_proceso === STATUS.ANALYZING) return;

  try {
    // a) Actualización Optimista: Cambiamos visualmente a "Analizando" de inmediato
    actualizarLicitacionLocal(licitacion._id, { estado_proceso: STATUS.ANALYZING });

    // b) Llamada al Backend de Hugging Face
    const response = await axios.post(`${HF_BACKEND_URL}/procesar-completo/${licitacion._id}`);
    
    // c) Si el backend confirma, iniciamos el polling
    // Nota: Ajusta esto si tu backend devuelve texto "ANALYZING" o número 2.
    // Aquí asumo que responde confirmando el inicio.
    iniciarPolling(licitacion._id);

  } catch (err) {
    console.error("Error al conectar con la IA:", err);
    actualizarLicitacionLocal(licitacion._id, { estado_proceso: STATUS.ERROR });
    alert("Error al iniciar el análisis. Revisa la consola.");
  }
};

// 2. Función de Polling (Cada 10 segundos)
const iniciarPolling = (id) => {
  // Si ya existe un polling para este ID, no creamos otro
  if (activePolls.value[id]) return;

  console.log(`Iniciando vigilancia para licitación ${id}`);

  const intervalId = setInterval(async () => {
    // VALIDACIÓN CRÍTICA: ¿La licitación sigue existiendo en la vista actual?
    // Si el usuario cambió de página, este findIndex dará -1
    const index = licitaciones.value.findIndex(l => l._id === id);

    if (index === -1) {
      console.log(`Licitación ${id} ya no está en pantalla. Deteniendo polling.`);
      detenerPolling(id);
      return;
    }

    try {
      // Consultamos solo ESTA licitación a tu API (NestJS/Vercel)
      // Ajusta la ruta '/api/licitaciones/' según tu backend real
      const { data: licitacionActualizada } = await axios.get(`/api/licitaciones/${id}`);
      console.log()(`Polling ${id}: estado actual ${licitacionActualizada.estado_proceso}`);
      // Actualizamos solo este registro en el array local
      licitaciones.value[index] = { 
        ...licitaciones.value[index], 
        ...licitacionActualizada 
      };

      const nuevoEstado = licitacionActualizada.estado_proceso;

      // Si terminó o dio error, dejamos de preguntar
      if (nuevoEstado === STATUS.COMPLETED || nuevoEstado === STATUS.ERROR) {
        detenerPolling(id);
        if (nuevoEstado === STATUS.COMPLETED) {
            console.log("¡Análisis completado!");
        }
      }
    } catch (error) {
      console.error(`Error en polling ${id}:`, error);
      // Opcional: detener polling tras varios errores
    }
  }, 10000); // 10 segundos

  // Guardamos el ID del intervalo para poder cancelarlo luego
  activePolls.value[id] = intervalId;
};

const detenerPolling = (id) => {
  if (activePolls.value[id]) {
    clearInterval(activePolls.value[id]);
    delete activePolls.value[id];
  }
};

// Helper para actualizar el array local sin recargar todo
const actualizarLicitacionLocal = (id, camposNuevos) => {
  const index = licitaciones.value.findIndex(l => l._id === id);
  if (index !== -1) {
    licitaciones.value[index] = { ...licitaciones.value[index], ...camposNuevos };
  }
};

// --- DATA FETCHING (Paginación y búsqueda) ---

const obtenerDatos = async (targetPage = pagination.value.currentPage) => {
  loading.value = true;
  
  // LIMPIEZA: Al cambiar de página, limpiamos los pollings anteriores
  // para no gastar recursos buscando IDs que ya no están visibles.
  Object.keys(activePolls.value).forEach(id => detenerPolling(id));

  try {
    const { data } = await axios.get('/api/licitaciones', {
      params: {
        page: targetPage,
        limit: pagination.value.pageSize,
        search: search.value.trim() || undefined,
      },
    });
    
    licitaciones.value = data.results;
    pagination.value = data.info;

    // Reactivar polling: Si cargamos la página y hay licitaciones en estado "2" (Analyzing),
    // debemos reanudar su vigilancia automáticamente.
    licitaciones.value.forEach(lic => {
      if (lic.estado_proceso === STATUS.ANALYZING) {
        iniciarPolling(lic._id);
      }
    });

  } catch (error) {
    console.error('Error al obtener licitaciones:', error);
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

// --- UTILIDADES ---
const formatMoneda = (valor) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(valor);
const streamUrlFor = (fileId) => `/api/stream?file_id=${encodeURIComponent(fileId)}`;
const downloadUrlFor = (fileId) => `/api/download?file_id=${encodeURIComponent(fileId)}`;
const getRequestId = (request, idx) => request._id || `row:${idx}`;

const licitacionesFiltradas = computed(() => licitaciones.value);

const debounce = (fn, wait = 400) => {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

const debouncedSearch = debounce(() => obtenerDatos(1), 400);

watch(search, () => debouncedSearch());

// --- CICLO DE VIDA ---
onMounted(() => {
  console.log("Componente montado.");
  obtenerDatos();
});

// Importante: Limpiar todos los intervalos si el usuario cierra el componente
onUnmounted(() => {
  Object.keys(activePolls.value).forEach(id => detenerPolling(id));
});
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
                <h2>{{ request.objeto_cont }}</h2>
                <div class="request-card-footer">
                  <div class="request-genre">{{ request.expediente }}</div>
                  <div class="request-action">
                    <button
                      v-if="!request.estado_proceso || request.estado_proceso === 1 || request.estado_proceso === 4"
                      class="uiverse" 
                      @click="handleGenerateClick(request)">
                      <div class="wrapper">
                        <span>{{ request.estado_proceso === 4 ? 'REINTENTAR' : 'RESUME PDF' }}</span>
                        <div class="circle circle-12"></div>
                        <div class="circle circle-11"></div>
                        <div class="circle circle-10"></div>
                        <div class="circle circle-9"></div>
                        <div class="circle circle-8"></div>
                        <div class="circle circle-7"></div>
                        <div class="circle circle-6"></div>
                        <div class="circle circle-5"></div>
                        <div class="circle circle-4"></div>
                        <div class="circle circle-3"></div>
                        <div class="circle circle-2"></div>
                        <div class="circle circle-1"></div>
                      </div>
                    </button>

                    <div v-else-if="request.estado_proceso === 2" class="uiverse" style="cursor: wait; opacity: 0.8;">
                      <div class="wrapper">
                        <span>ANALIZANDO... ⏳</span>
                        </div>
                    </div>

                    <div v-else-if="request.estado_proceso === 3" class="generated-text-area whitespace-pre-wrap">
                      <strong style="color: #0078d4">Resumen Auditoría:</strong>
                      <br>
                      {{ request.analisis_ia?.resumen || "Informe generado. Click para ver detalles." }}
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
                    <div class="file-items" v-for="archivo in request.archivos_principales"
                      :key="archivo.telegram_file_id">

                      <a class=" items-center rounded-md bg-indigo-50 px-2 py-1 text-sm font-medium text-indigo-700 inset-ring inset-ring-indigo-700/10"
                        :href="streamUrlFor(archivo.telegram_file_id)" target="_blank" rel="noopener">
                        {{ archivo.etiqueta?.replace(/_/g, ' ') || 'Sans nom' }}
                      </a>
                      <a class="download-btn inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-sm font-medium text-red-700 inset-ring inset-ring-red-600/10"
                        :href="downloadUrlFor(archivo.telegram_file_id)" target="_blank" rel="noopener">
                        Download
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
  min-height: 80px;
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

.request-card-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.request-genre {
  font-size: 1.05rem;
  color: #00b4d4;
  font-weight: 600;
}

.request-action {
  margin-left: auto;
  min-width: 220px;
  max-width: 100%;
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

/* .boutondegael{
  background-color: #311C3B;
  width: 100px;
  height: 50px;
  color: rgb(255, 255, 255);
  transition: 0.5s;
  font-family: Helvetica;
}

.boutondegael:hover{
  background-color: #c4c4c4;
  color: black;
}

.dark-mode .boutondegael{
  background-color: #fdfdfd;
  width: 100px;
  height: 50px;
  color: rgb(0, 0, 0);
  transition: 0.5s;
}

.dark-mode .boutondegael:hover{
  background-color: #311C3B;
  width: 100px;
  height: 50px;
  color: rgb(0, 0, 0);
} */

.uiverse {
  --duration: 5s;
  --easing: ease-in-out;
  --c-color-1: #ff6f00;
  --c-color-2: #1a23ff;
  --c-color-3: #e21bda;
  --c-color-4: #ffd800;
  --c-shadow: rgba(0, 0, 0, 0.2);
  --c-shadow-inset-top: rgba(0, 0, 0, 0.1);
  --c-shadow-inset-bottom: rgba(0, 0, 0, 0.1);
  --c-radial-inner: #ffd215;
  --c-radial-outer: #fff172;
  --c-color: #fff;
  -webkit-tap-highlight-color: transparent;
  -webkit-appearance: none;
  outline: none;
  position: relative;
  cursor: pointer;
  border: none;
  display: table;
  border-radius: 24px;
  padding: 0;
  margin: 0;
  text-align: center;
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 0.02em;
  line-height: 1.5;
  color: var(--c-color);
  background: radial-gradient(circle, var(--c-radial-inner), var(--c-radial-outer) 80%);
  box-shadow: 0 0 14px var(--c-shadow);
}

.uiverse:focus-visible {
  outline: 3px solid #000;
  outline-offset: 3px;
}

.dark-mode .uiverse:focus-visible {
  outline-color: #f5f5f5;
}
</style>
<style>
.uiverse:before {
  content: '';
  pointer-events: none;
  position: absolute;
  z-index: 3;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  border-radius: 24px;
  box-shadow: inset 0 3px 12px var(--c-shadow-inset-top), inset 0 -3px 4px var(--c-shadow-inset-bottom);
}

.uiverse:before {
  content: "";
  pointer-events: none;
  position: absolute;
  z-index: 3;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  border-radius: 24px;
  box-shadow:
    inset 0 3px 12px var(--c-shadow-inset-top),
    inset 0 -3px 4px var(--c-shadow-inset-bottom);
}

.uiverse .wrapper {
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  overflow: hidden;
  border-radius: 24px;
  min-width: 132px;
  padding: 12px 0;
}

.uiverse .wrapper span {
  display: inline-block;
  position: relative;
  z-index: 1;
  font-family: ;
}

.uiverse:hover {
  --duration: 1400ms;
}

.uiverse .wrapper .circle {
  position: absolute;
  left: 0;
  top: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  filter: blur(var(--blur, 8px));
  background: var(--background, transparent);
  transform: translate(var(--x, 0), var(--y, 0)) translateZ(0);
  animation: var(--animation, none) var(--duration) var(--easing) infinite;
}

.uiverse .wrapper .circle.circle-1,
.uiverse .wrapper .circle.circle-9,
.uiverse .wrapper .circle.circle-10 {
  --background: var(--c-color-4);
}

.uiverse .wrapper .circle.circle-3,
.uiverse .wrapper .circle.circle-4 {
  --background: var(--c-color-2);
  --blur: 14px;
}

.uiverse .wrapper .circle.circle-5,
.uiverse .wrapper .circle.circle-6 {
  --background: var(--c-color-3);
  --blur: 100px;
}

.uiverse .wrapper .circle.circle-2,
.uiverse .wrapper .circle.circle-7,
.uiverse .wrapper .circle.circle-8,
.uiverse .wrapper .circle.circle-11,
.uiverse .wrapper .circle.circle-12 {
  --background: var(--c-color-1);
  --blur: 12px;
}

.uiverse .wrapper .circle.circle-1 {
  --x: 0;
  --y: -40px;
  --animation: circle-1;
}

.uiverse .wrapper .circle.circle-2 {
  --x: 92px;
  --y: 8px;
  --animation: circle-2;
}

.uiverse .wrapper .circle.circle-3 {
  --x: -12px;
  --y: -12px;
  --animation: circle-3;
}

.uiverse .wrapper .circle.circle-4 {
  --x: 80px;
  --y: -12px;
  --animation: circle-4;
}

.uiverse .wrapper .circle.circle-5 {
  --x: 12px;
  --y: -4px;
  --animation: circle-5;
}

.uiverse .wrapper .circle.circle-6 {
  --x: 56px;
  --y: 16px;
  --animation: circle-6;
}

.uiverse .wrapper .circle.circle-7 {
  --x: 8px;
  --y: 28px;
  --animation: circle-7;
}

.uiverse .wrapper .circle.circle-8 {
  --x: 28px;
  --y: -4px;
  --animation: circle-8;
}

.uiverse .wrapper .circle.circle-9 {
  --x: 20px;
  --y: -12px;
  --animation: circle-9;
}

.uiverse .wrapper .circle.circle-10 {
  --x: 64px;
  --y: 16px;
  --animation: circle-10;
}

.uiverse .wrapper .circle.circle-11 {
  --x: 4px;
  --y: 4px;
  --animation: circle-11;
}

.uiverse .wrapper .circle.circle-12 {
  --blur: 14px;
  --x: 52px;
  --y: 4px;
  --animation: circle-12;
}

@keyframes circle-1 {
  33% {
    transform: translate(0px, 16px) translateZ(0);
  }

  66% {
    transform: translate(12px, 64px) translateZ(0);
  }
}

@keyframes circle-2 {
  33% {
    transform: translate(80px, -10px) translateZ(0);
  }

  66% {
    transform: translate(72px, -48px) translateZ(0);
  }
}

@keyframes circle-3 {
  33% {
    transform: translate(20px, 12px) translateZ(0);
  }

  66% {
    transform: translate(12px, 4px) translateZ(0);
  }
}

@keyframes circle-4 {
  33% {
    transform: translate(76px, -12px) translateZ(0);
  }

  66% {
    transform: translate(112px, -8px) translateZ(0);
  }
}

@keyframes circle-5 {
  33% {
    transform: translate(84px, 28px) translateZ(0);
  }

  66% {
    transform: translate(40px, -32px) translateZ(0);
  }
}

@keyframes circle-6 {
  33% {
    transform: translate(28px, -16px) translateZ(0);
  }

  66% {
    transform: translate(76px, -56px) translateZ(0);
  }
}

@keyframes circle-7 {
  33% {
    transform: translate(8px, 28px) translateZ(0);
  }

  66% {
    transform: translate(20px, -60px) translateZ(0);
  }
}

@keyframes circle-8 {
  33% {
    transform: translate(32px, -4px) translateZ(0);
  }

  66% {
    transform: translate(56px, -20px) translateZ(0);
  }
}

@keyframes circle-9 {
  33% {
    transform: translate(20px, -12px) translateZ(0);
  }

  66% {
    transform: translate(80px, -8px) translateZ(0);
  }
}

@keyframes circle-10 {
  33% {
    transform: translate(68px, 20px) translateZ(0);
  }

  66% {
    transform: translate(100px, 28px) translateZ(0);
  }
}

@keyframes circle-11 {
  33% {
    transform: translate(4px, 4px) translateZ(0);
  }

  66% {
    transform: translate(68px, 20px) translateZ(0);
  }
}

@keyframes circle-12 {
  33% {
    transform: translate(56px, 0px) translateZ(0);
  }

  66% {
    transform: translate(60px, -32px) translateZ(0);
  }
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
