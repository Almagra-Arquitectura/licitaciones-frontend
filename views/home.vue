<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import axios from '@/services/axios';
import { useRoute, useRouter } from 'vue-router';

// Inicializamos el router
const route = useRoute();
const router = useRouter();

// --- CONFIGURACIÓN ---
//const HF_BACKEND_URL = "http://localhost:8000";
const HF_BACKEND_URL = "https://combined-christabel-sokorro-1f18a293.koyeb.app";
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
const THEME_STORAGE_KEY = 'theme_mode';
const isDark = ref(true);

// Almacén de intervalos de polling activos: { [idLicitacion]: intervalId }
const activePolls = ref({});

// --- LÓGICA DE IA Y POLLING ---

// 1. Acción del botón: Dispara la IA
const handleGenerateClick = async (licitacion) => {
  // Evitar doble clic si ya está analizando
  if (licitacion.status === STATUS.ANALYZING) return;

  try {
    // a) Actualización Optimista: Cambiamos visualmente a "Analizando" de inmediato
    actualizarLicitacionLocal(licitacion._id, { status: STATUS.ANALYZING });

    // b) Llamada al Backend de Hugging Face
    const response = await axios.post(`${HF_BACKEND_URL}/procesar-completo/${licitacion._id}`);
    
    // c) Si el backend confirma, iniciamos el polling
    // Nota: Ajusta esto si tu backend devuelve texto "ANALYZING" o número 2.
    // Aquí asumo que responde confirmando el inicio.
    iniciarPolling(licitacion._id);

  } catch (err) {
    console.error("Error al conectar con la IA:", err);
    actualizarLicitacionLocal(licitacion._id, { status: STATUS.ERROR });
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
      const token = localStorage.getItem('auth_token');

      // Consultamos solo ESTA licitación a tu API (NestJS/Vercel)
      // Ajusta la ruta '/api/licitaciones/' según tu backend real
      const { data: licitacionActualizada } = await axios.get(`/api/licitaciones/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`Polling ${id}: estado actual ${licitacionActualizada.status}`);
      // Actualizamos solo este registro en el array local
      licitaciones.value[index] = { 
        ...licitaciones.value[index], 
        ...licitacionActualizada 
      };

      const nuevoEstado = licitacionActualizada.status;

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

const logout = () => {
  // 1. Eliminamos el token de localStorage
  localStorage.removeItem('auth_token');
  
  // 2. (Opcional) Si usas una instancia de Axios personalizada, 
  // podrías limpiar los headers aquí si fuera necesario.
  
  // 3. Redirigimos al Login
  router.push('/login');
};



const goToPage = (nextPage) => {
  const total = pagination.value.pages || 1;
  const safePage = Math.min(Math.max(1, nextPage), total);

  // Si ya estamos en esa página en la URL, no hacemos nada
  if (safePage === Number(route.query.page)) return;

  // Empujamos el cambio a la URL manteniendo otros filtros (ej: búsqueda)
  router.push({ 
    query: { 
      ...route.query, 
      page: safePage 
    } 
  });
};

const visiblePages = computed(() => {
  const total = pagination.value.pages; // Nota: si 'pagination' es una prop, usa props.pagination.pages
  const current = pagination.value.currentPage;
  const maxVisibleButtons = 7;

  // 1. Si hay pocas páginas, mostramos todas (ej: [1, 2, 3, 4, 5])
  if (total <= maxVisibleButtons) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  // 2. Estamos cerca del inicio (ej: [1, 2, 3, 4, 5, '...', 100])
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }

  // 3. Estamos cerca del final (ej: [1, '...', 96, 97, 98, 99, 100])
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }

  // 4. Estamos en medio (ej: [1, '...', 49, 50, 51, '...', 100])
  return [1, '...', current - 1, current, current + 1, '...', total];
});

// Función auxiliar para manejar el clic
const handlePageClick = (page) => {
  if (page === '...' || page === pagination.value.currentPage) return;
  goToPage(page);
};

// --- UTILIDADES ---
const formatMoneda = (valor) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(valor);
//const streamUrlFor = (fileId) => `/api/stream?file_id=${encodeURIComponent(fileId)}`;
const streamUrlFor = (fileId, etiqueta, expediente) => {
  const token = localStorage.getItem('auth_token'); // Recuperamos el token guardado
  // Devolvemos el link con el token pegado para que el backend deje pasar
  return `/api/stream?file_id=${encodeURIComponent(fileId)}&token=${token}&title=${encodeURIComponent(expediente)+ '-' + encodeURIComponent(etiqueta) }`;
};
//const downloadUrlFor = (fileId) => `/api/download?file_id=${encodeURIComponent(fileId)}`;
const downloadUrlFor = (fileId) => {
  const token = localStorage.getItem('auth_token');
  // Construimos la URL con el token pegado
  return `/api/download?file_id=${fileId}&token=${token}`;
};
const getRequestId = (request, idx) => request._id || `row:${idx}`;

const licitacionesFiltradas = computed(() => licitaciones.value);

const debounce = (fn, wait = 400) => {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

watch(isDark, (enabled) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, enabled ? 'dark' : 'light');
});

const search = ref(route.query.search || '');

// 1. Debounce: Solo para empujar el cambio a la URL
const actualizarUrl = debounce((val) => {
  router.push({
    query: {
      ...route.query,
      search: val.trim() || undefined,
      page: 1 // Reiniciamos página al buscar
    }
  });
}, 500);

// 2. Watcher del Input: Dispara el debounce
watch(search, (nuevoValor) => {
  actualizarUrl(nuevoValor);
});

// 3. Watcher de la Ruta: Carga los datos cuando la URL cambia
watch(
  () => [route.query.page, route.query.search],
  ([newPage, newSearch], [oldPage, oldSearch]) => {
    // Solo actualizamos el ref 'search' si el cambio viene de fuera 
    // (ej: botón atrás del navegador), no si nosotros mismos lo cambiamos
    if (newSearch !== search.value) {
      search.value = newSearch || '';
    }
    obtenerDatos();
  }
);

const obtenerDatos = async (targetPage) => {
  const token = localStorage.getItem('auth_token');
  // Si no nos pasan página, miramos la URL. Si no hay URL, es la 1.
  const page = targetPage || Number(route.query.page) || 1;
  const searchTerm = route.query.search || ''; 

  // Sincronizamos el ref del input con la URL (por si el usuario refresca la página)
  // Opcional: sincroniza el input si el usuario entró por link directo o refrescó
  if (search.value !== searchTerm) {
    search.value = searchTerm;
  }
  loading.value = true;
  
  // LIMPIEZA: Al cambiar de página, limpiamos los pollings anteriores
  // para no gastar recursos buscando IDs que ya no están visibles.
  Object.keys(activePolls.value).forEach(id => detenerPolling(id));

  try {
    const { data } = await axios.get('/api/licitaciones', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        page: page,
        limit: pagination.value.pageSize,
        search: searchTerm.trim() || undefined,
      },
    });
    
    licitaciones.value = data.results;
    pagination.value = data.info;

    // Reactivar polling: Si cargamos la página y hay licitaciones en estado "2" (Analyzing),
    // debemos reanudar su vigilancia automáticamente.
    licitaciones.value.forEach(lic => {
      if (lic.status === STATUS.ANALYZING) {
        iniciarPolling(lic._id);
      }
    });

  } catch (error) {
    console.error('Error al obtener licitaciones:', error);
  } finally {
    loading.value = false;
  }
};

// --- CICLO DE VIDA ---
onMounted(() => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    isDark.value = savedTheme === 'dark';
  }
  // console.log("Componente montado.");
  obtenerDatos();
});

// Importante: Limpiar todos los intervalos si el usuario cierra el componente
onUnmounted(() => {
  Object.keys(activePolls.value).forEach(id => detenerPolling(id));
});

const expandedById = ref({});
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


// Función para formatear fechas
const formatearFecha = (fechaString) => {
  if (!fechaString) return 'Pendiente'; // O 'N/A' si viene nulo

  const fecha = new Date(fechaString);

  // Usamos Intl.DateTimeFormat que es más eficiente y moderno
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC' // Mantenemos UTC como querías, o quítalo para usar la hora local del usuario
  }).format(fecha);
};

const esNueva = (fechaString) => {
  if (!fechaString) return false;
  
  const fechaPublicacion = new Date(fechaString);
  const ahora = new Date();
  
  // Calculamos la diferencia en milisegundos
  const diferenciaMs = ahora - fechaPublicacion;
  
  // Convertimos a horas (1000ms * 60s * 60m = 1 hora)
  const horasTranscurridas = diferenciaMs / (1000 * 60 * 60);
  
  // Retorna TRUE si han pasado menos de 24 horas y la fecha no es futura
  return horasTranscurridas < 24 && horasTranscurridas >= 0;
};

</script>

<template>
  <div :class="['page-wrapper', isDark ? 'dark-mode' : '']">
    <!-- Header (fixed) -->
    <header class="header fixed-header">
      <div class="header-content">
        <a class="navbar-brand d-inline-block h-blur" href="/">
          <img class="hidden md:block logo-img" src="/main_logo.svg" alt="Logo" width="200" height="0">
          <img class="md:hidden logo-img" src="/main_logo2.svg" alt="Logo" width="125" height="0">
        </a>
        <div>
          <h1 class="text-[1.05rem]">Licitaciones de servicios de publicidad</h1>
          <!-- <p class="subtitle">Encuentra y explora las últimas licitaciones públicas, filtradas por IA.</p> -->
        </div>
        <input v-model="search" type="text" placeholder="Buscar por palabras clave..."
          class="filter-input header-search-input" />
        <div class="theme-toggle">
          <button 
            @click="logout" 
            class="logout-btn text-gray-500 hover:text-red-600 transition-colors p-1 mr-[-10px]"
            title="Cerrar sesión"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
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
    <div class="main-scrollable mt-[190px] md:mt-[200px] lg:mt-[120px] xl:mt-[120px]">
      <!-- Mobile search under header -->
      <section class="filters filters-bar mobile-search-section mt-[40px] sm:mt-[50px] lg:mt-[5px]">
        <input v-model="search" type="text" placeholder="Buscar por palabras clave..." class="filter-input" />
      </section>

      <!-- Requests list -->
      <main class="container mt-[40px] lg:mt-[0px] lg:px-4">
        <div v-if="licitacionesFiltradas.length === 0" class="no-results">
          No se encontraron solicitudes.
        </div>
        <div v-else class="request-list">
          <div v-for="(request, idx) in licitacionesFiltradas" :key="getRequestId(request, idx)"
            class="request-card neumorph-card mb-4">
            <span 
              v-if="esNueva(request.f_publicacion)" 
              class="absolute top-0 right-0 px-2 py-1 bg-indigo-200 text-indigo-800 text-[10px] font-bold rounded-md uppercase tracking-wider shadow-sm z-10"
            >
              Nuevo
            </span>
            <div class="licitation-card grid grid-cols-1 lg:grid-cols-12 gap-4 md:p-6 p-3 sm:p-4 w-full items-start">
              <div class="request-col-main lg:col-span-5 flex flex-col gap-3">
                <h2 :title="request.objeto_cont" :class="{'cursor-pointer': needsExpandToggle(request.objeto_cont)}" class="request-title" @click.="toggleExpanded(getRequestId(request, idx))"
                    @keyup.enter="toggleExpanded(getRequestId(request, idx))"
                    @keyup.space.prevent="toggleExpanded(getRequestId(request, idx))" >
                  {{
                    isExpanded(getRequestId(request, idx))
                      ? request.objeto_cont
                      : getCollapsedText(request.objeto_cont)
                  }}
                  <span
                    v-if="needsExpandToggle(request.objeto_cont)"
                    class="expand-toggle text-indigo-400"
                  >
                    {{ isExpanded(getRequestId(request, idx)) ? 'Ver Menos' : 'Ver Más' }}
                  </span>
                </h2>
                <div class="request-card-footer">
                  <div class="request-genre">{{ request.expediente }}</div>
                  <div class="request-action flex">
                    <button
                      v-if="!request.status || request.status === 1 || request.status === 4"
                      class="gif_button rounded-md px-2 py-1"
                      @click="handleGenerateClick(request)"><span id="resume1" class="text-md">GENERAR RESUMEN</span>
                      <img src="/button.gif" alt="Resume PDF" class="gif-img gif-img-default" />
                      <img src="/hover_button.gif" alt="Resume PDF hover" class="gif-img gif-img-hover" />
                    </button>

                    <button
                      v-else-if="request.status === 2"
                      class="gif_button rounded-md px-2 py-1 is-disabled animate-pulse pulse-fast"
                      type="button"
                      disabled
                    ><span>ANALIZANDO ...</span>
                      <img src="/button.gif" alt="Analizando" class="gif-img gif-img-default" />
                      <img src="/hover_button.gif" alt="Analizando" class="gif-img gif-img-hover" />
                    </button>

                    <!-- <div v-else-if="request.status === 3" class="generated-text-area whitespace-pre-wrap" >
                      <strong style="color: #0078d4">Resumen Auditoría:</strong>
                      <br>
                      {{ request.analisis_ia?.resumen || "Informe generado. Click para ver detalles." }}
                    </div> -->

                    <div v-else-if="request.status === 3" class="completed-actions">
                      <router-link
                        :to="{ name: 'LicitacionResumen', params: { id: request._id }}"
                        class="btn-completed-main text-indigo-600 bg-indigo-100 rounded-md px-2 py-1 text-md inset-ring inset-ring-indigo-700/10"
                      >
                        VER RESUMEN IA
                      </router-link>
                      <button
                        class="gif_button gif_button-round p-2"
                        type="button"
                        @click="handleGenerateClick(request)"
                        aria-label="Rehacer analisis"
                        title="Rehacer analisis"
                      >
                        <span class="loop-icon text-lg">&#x21BB;</span>
                        <img src="/button.gif" alt="Rehacer analisis" class="gif-img gif-img-default" />
                        <img src="/hover_button.gif" alt="Rehacer analisis" class="gif-img gif-img-hover" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="request-col-meta lg:col-span-4 flex flex-col gap-2 text-sm text-gray-600 lg:border-l lg:border-gray-200 lg:pl-3">
                <div class="meta-row"><strong>Precio:</strong><span>{{ request.importe }}</span></div>
                <div class="meta-row"><strong>Publicado:</strong><span>{{ formatearFecha(request.f_publicacion) }}</span></div>
                <div class="meta-row"><strong>Fecha límite:</strong><span>{{ formatearFecha(request.fecha_fin_po) }}</span></div>
                <div class="meta-row"><strong>Lugar:</strong><span>{{ request.lugar_ejecucion }}</span></div>
              </div>

              <div class="lg:col-span-3 flex flex-col gap-2  lg:pl-3">
                <div class="meta-row">
                  <a class="file-badge rounded-md px-2 py-1 flex items-center font-[500]" :href="request.url" target="_blank" rel="noopener">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      class="w-4 h-4 mr-1" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      stroke-width="2" 
                      stroke-linecap="round" 
                      stroke-linejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Licitación Original
                  </a>
                </div>
                <div v-if="request.archivos_principales && request.archivos_principales.length" class="files-block">
                  <div class="file-list">
                    <div class="file-items gap-2 flex" v-for="archivo in request.archivos_principales"
                      :key="archivo.telegram_file_id">

                      <a class="file-badge items-center rounded-md px-2 py-1 text-md font-medium inset-ring inset-ring-indigo-700/10"
                        :href="streamUrlFor(archivo.telegram_file_id,  archivo.etiqueta, request.expediente)" target="_blank" rel="noopener">
                        {{ archivo.etiqueta?.replace(/_/g, ' ') || 'Sin nombre' }}
                      </a>
                      <a title="Descargar pliego" class="download-btn download-badge inline-flex rounded-md bg-blue-100 px-2 py-1 text-md font-medium text-indigo-700 inset-ring inset-ring-red-600/10"
                        :href="downloadUrlFor(archivo.telegram_file_id)" target="_blank" rel="noopener">
                        <svg class="w-3 text-gray-800 dark:text-dark" aria-hidden="true"
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
        <div v-if="licitacionesFiltradas.length > 0" class="pagination-wrapper">
  
          <div class="pagination-info">
            <span class="info-text">
              Pagina {{ pagination.currentPage }} / {{ pagination.pages }}
            </span>
            <span class=""> - {{ pagination.total }} licitaciones totales</span>
          </div>

          <div class="pagination-controls">
            
            <button 
              class="pagination-btn nav-btn" 
              :disabled="loading || pagination.currentPage <= 1"
              @click="goToPage(pagination.currentPage - 1)"
            >&lt;</button>

            <div class="pagination-numbers desktop-only">
              <template v-for="(pageItem, index) in visiblePages" :key="index">
                <button 
                  v-if="pageItem !== '...'"
                  class="pagination-btn page-number-btn"
                  :class="{ 'is-active': pageItem === pagination.currentPage }"
                  :disabled="loading"
                  @click="goToPage(pageItem)"
                >
                  {{ pageItem }}
                </button>
                <span v-else class="pagination-dots">...</span>
              </template>
            </div>

            <button 
              class="pagination-btn nav-btn" 
              :disabled="loading || pagination.currentPage >= pagination.pages"
              @click="goToPage(pagination.currentPage + 1)"
            >&gt;</button>

          </div>
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
  font-size: 1.05rem;
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
}

.theme-toggle .switch {
  transform: rotate(90deg);
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 8px;
  transform: rotate(180deg);
}

/* Efecto suave de fondo al pasar el ratón por el icono de logout */
.logout-btn:hover {
  background-color: rgba(239, 68, 68, 0.1); /* Un fondo rojo muy tenue */
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
  margin: 0 auto;
  flex: 1;
  box-sizing: border-box;
}

.request-list {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  margin-top: 0.7rem;
}
.dark-mode .licitation-card {
  border: 2px solid rgba(227, 197, 197, 0.12);
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

/* .request-card-content {
  display: grid;
  grid-template-columns: minmax(280px, 1.7fr) minmax(250px, 1.2fr) minmax(240px, 1fr);
  align-items: start;
  width: 100%;
  padding: 1rem 1rem;
  gap: 1.3rem;
} */

.request-col {
  min-width: 0;
}

.request-col-main {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.75rem;
}

.request-col-main h2 {
  margin: 0;
  font-size: 1.05rem;
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
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.request-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 0.6rem;
}

.request-genre {
  font-size: 0.9rem;
  color: #00b4d4;
  font-weight: 600;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.request-action {
  margin-left: auto; /* pousse Generate à droite */
  min-width: 0;      /* évite de réserver trop d'espace */
}

.request-col-meta {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: .90rem;
  color: #444;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  padding-right: .6rem;
}

.request-col-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: .9rem;
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


@media (max-width: 1280px) {
  .request-card-content {
    grid-template-columns: 1.35fr 1fr;
  }

  
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
  }

  .request-col-mainç {
    border-right: none;
    padding-right: 0;
  }
  .request-col-meta {
    border-right: none;
    padding-right: 0;
    border-top: 1px dashed rgba(0, 0, 0, 0.14);
    padding-top: 10px;
  }

  .request-col-links {
    border-top: 1px dashed rgba(0, 0, 0, 0.14);
    padding-top: 0.65rem;
  }

  .request-action {
    margin-left: auto;
    min-width: 0;
    width: auto;
  }

  .request-card-footer {
    align-items: center;
    flex-wrap: nowrap;
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
    top: 88px;
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
    padding: 0 0.5rem;
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

/* The switch - the box around the slider font-size: 17px;*/
.switch {
  --container-width: 3.5em;
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
  border: 2px solid rgba(255, 255, 255, 0.12);
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

.file-badge {
  color: #0078d4;
  box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.35);
}
.dark-mode .file-badge {
  background-color: #1e293b !important;
  color: #dbeafe !important;
  box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.35);
}

.dark-mode .download-badge {
  background-color: #1e293b !important;
  color: #dbeafe !important;
  box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.35);
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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 0;
  background: transparent;
  cursor: pointer;
  z-index: 0;
}

.gif_button span {
  position: relative;
  z-index: 3;
  color: #fff;
  font-weight: 700;
  white-space: nowrap;
}

.gif_button #resume1 {
  position: relative;
  z-index: 3;
  color: #fff;
  font-weight: 700;
  font-size: .95rem;
  white-space: nowrap;
}

.gif_button.is-disabled {
  opacity: 0.8;
  cursor: wait;
}

.pulse-fast {
  animation-duration: 0.9s;
}

.completed-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-completed-main {
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  color: #0078d4;
  font-weight: 500;
  font-weight: 600;
}

.dark-mode .btn-completed-main {
  background-color: #1e293b !important;
  color: #dbeafe !important;
  box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.35);
}

.gif_button-round {
  border-radius: 50%;
}

.gif_button-round .gif-img {
  transform: scale(1.45);
}

.loop-icon {
  z-index: 3;
  font-weight: 900;
  line-height: 1;
  font-family: "Segoe UI Symbol", "Noto Sans Symbols", sans-serif;
}

.gif-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: none;
  transform: scale(1.12);
  transform-origin: center;
  transition: opacity 0.15s ease;
  z-index: 1;
}

.gif-img-default {
  opacity: 1;
}

.gif-img-hover {
  opacity: 0;
}

.gif_button:hover .gif-img-default,
.gif_button:focus-visible .gif-img-default {
  opacity: 0;
}

.gif_button:hover .gif-img-hover,
.gif_button:focus-visible .gif-img-hover {
  opacity: 1;
}

/* CONTENEDOR PRINCIPAL: Columna vertical */
.pagination-wrapper {
  display: flex;
  flex-direction: column; /* Pone la info arriba y controles abajo */
  align-items: center;      /* Centra todo horizontalmente */
  gap: 15px;                /* Espacio entre el texto y los botones */
  width: 100%;
  padding: 20px 0;
}

/* TEXTO DE INFORMACIÓN */
.pagination-info {
  font-size: 0.9rem;
  color: #666;
  text-align: center;
  font-weight: 500;
}

/* CONTENEDOR DE BOTONES (La clave para que no se separen) */
.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center; /* IMPORTANTE: Junta todo al centro */
  gap: 8px;                /* Espacio pequeñito entre botones */
  flex-wrap: wrap;         /* Por seguridad, si la pantalla es enana */
}

/* ESTILO DE LOS BOTONES */
.pagination-btn {
  width: 34px;             /* Tamaño fijo cuadrado */
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;      /* Bordes redondeados */
  cursor: pointer;
  color: #333;
  font-size: 1.2rem;       /* Tamaño de la flecha */
  line-height: 1;
      /* Ajuste visual para centrar la flecha */
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #f1f5f9;
  border-color: #cbd5e0;
}

.pagination-btn.is-active {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background-color: #f8fafc;
}

.pagination-dots {
  color: #94a3b8;
  padding: 0 4px;
}

/* NÚMEROS (Contenedor interno) */
.pagination-numbers {
  display: flex;
  gap: 8px;
}

/* --- MÓVIL (Pantallas pequeñas) --- */
@media (max-width: 640px) {
  
  /* Ocultar números y texto extra */
  .desktop-only, .desktop-text {
    display: none;
  }

  /* En móvil, las flechas se quedan juntas en el centro */
  .pagination-controls {
    gap: 15px; /* Un poco más de espacio entre flechas para el dedo */
  }

  /* Botones un poco más grandes para tocar mejor */
  .pagination-btn.nav-btn {
    width: 44px;
    height: 44px;
    font-size: 1.6rem;
  }
}

</style>
