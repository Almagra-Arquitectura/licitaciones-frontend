<template>
  <div :class="['page-shell', isDark ? 'dark-mode' : '']">
  <header class="global-navbar">
    <a class="navbar-brand" href="/">
      <img class="logo-img desktop-logo" src="/main_logo.svg" alt="Logo" width="200" height="0">
      <img class="logo-img mobile-logo" src="/main_logo2.svg" alt="Logo" width="120" height="0">
    </a>
    <div class="navbar-right">
      <div class="navbar-links">
      <router-link to="/" class="nav-link">Inicio</router-link>
      <span class="nav-sep">|</span>
      <span class="nav-current">Resumen IA</span>
      </div>
      <label class="switch">
        <input v-model="isDark" class="checkbox" type="checkbox" />
        <span class="slider"></span>
      </label>
    </div>
  </header>
  <div class="page-container">
    
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Consultando informe forense de la licitación...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-card">
        <h3>⚠️ No disponible</h3>
        <p>{{ error }}</p>
        <button @click="volver" class="btn-back">Volver al listado</button>
      </div>
    </div>

    <div v-else class="content-state pb-6">
      <div class="toolbar">
        <button @click="volver" class="btn-secondary">← Volver</button>
        <span class="badge">Expediente: {{ licitacionData.expediente }}</span>
      </div>

      <div class="markdown-viewer p-4 md:p-6 lg:p-8 text-xs sm:text-sm lg:text-lg" v-html="renderedMarkdown"></div>
    </div>

  </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import axios from '@/services/axios';

// Hacemos que la tabla ocupe el 100%
marked.setOptions({
  breaks: true, // Enter es salto de línea
  gfm: true     // GitHub Flavored Markdown (tablas, etc)
});

const route = useRoute();
const router = useRouter();
const THEME_STORAGE_KEY = 'theme_mode';

// Estados
const loading = ref(true);
const error = ref(null);
const licitacionData = ref(null);
const markdownContent = ref('');
const isDark = ref(true);

// ID que viene de la URL
const licitacionId = route.params.id;

const fetchLicitacion = async () => {
  loading.value = true;
  error.value = null;

  try {
    const token = localStorage.getItem('auth_token');

    // 1. CAMBIO: Usamos axios.get en lugar de fetch
    const response = await axios.get(`/api/licitaciones/${licitacionId}`, {
      headers: { 
        'Authorization': `Bearer ${token}` 
      }
    });

    // 2. CAMBIO: En Axios, los datos JSON ya vienen en 'response.data'
    const data = response.data;

    // VALIDACIÓN CRÍTICA
    // Usamos ?. (optional chaining) para que no falle si analisis_ia es null
    if (!data.analisis_ia?.informe_detallado) {
      throw new Error("Esta licitación aún no ha sido auditada por la IA.");
    }

    licitacionData.value = data;
    markdownContent.value = data.analisis_ia.informe_detallado;

  } catch (err) {
    console.error(err);

    // 3. SOLUCIÓN AL PROBLEMA DE EXPIRACIÓN
    // Si el servidor responde "401 Unauthorized", mandamos al login
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('auth_token'); // Limpiamos token viejo
      router.push('/login'); // Redirigimos
      return;
    }

    error.value = err.response?.data?.error || err.message || "Error al cargar la licitación";
  } finally {
    loading.value = false;
  }
};

// Computada para renderizar el HTML seguro
const renderedMarkdown = computed(() => {
  if (!markdownContent.value) return '';
  const html = marked.parse(markdownContent.value);
  return DOMPurify.sanitize(html);
});

const volver = () => {
  /**
   * window.history.state.back contiene la URL previa en la SPA.
   * Si es nulo, significa que el usuario entró directamente a esta URL
   * o abrió el detalle en una pestaña nueva (historial limpio).
   */
  if (window.history.state && window.history.state.back) {
    // Escenario A: El usuario tiene historial (Viene de la pag 2, 3, etc.)
    router.back();
  } else {
    // Escenario B: Entrada directa (Link compartido)
    // Lo mandamos al listado principal por defecto
    router.push('/');
  }
};

watch(isDark, (enabled) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, enabled ? 'dark' : 'light');
});

onMounted(() => {
  if (typeof window !== 'undefined') {
    isDark.value = localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  }
  fetchLicitacion();
});
</script>

<style scoped>
/* Fond plein ecran */
.page-shell {
  min-height: 100vh;
  background: #e0e0e0;
  padding-top: 88px;
}

.global-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 120;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: rgba(240, 244, 248, 0.9);
  border-bottom: 1px solid #d0d7df;
  backdrop-filter: blur(8px);
}

.navbar-brand {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
  max-width: 240px;
}

.logo-img {
  display: block;
  width: 200px;
  max-width: 100%;
  height: auto;
}

.navbar-brand:hover .logo-img {
  filter: blur(1.5px);
}

.mobile-logo {
  display: none;
}

.navbar-links {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
}

.navbar-right {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  flex: 0 0 auto;
  margin-left: 12px;
}

.nav-link {
  color: #1f2937;
  text-decoration: none;
}

.nav-link:hover {
  text-decoration: underline;
}

.nav-sep {
  color: #6b7280;
}

.nav-current {
  color: #374151;
}

.switch {
  --container-width: 3.5em;
  font-size: 16px;
  position: relative;
  display: inline-block;
  width: var(--container-width);
  height: 2em;
}

.switch .checkbox {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  --width: 0.4em;
  --offset: 0.3em;
  --transition-duration: 0.4s;
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #c7cdd4;
  box-shadow: inset 2px 5px 10px rgba(0, 0, 0, 0.2);
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
  background-color: #ffffff;
  transition: transform var(--transition-duration);
}

.checkbox:checked + .slider {
  background-color: #171717;
  box-shadow: inset 2px 5px 10px transparent;
}

.checkbox:checked + .slider::before {
  transform: translateX(calc(var(--container-width) - var(--offset) * 2 - var(--width))) rotate(1turn);
}

/* Contenedor principal centrado */
.page-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 20px;
  font-family: 'Segoe UI', sans-serif;
  color: #1f2937;
}

/* Estilos de Carga */
.loading-state {
  text-align: center;
  padding: 50px;
  color: #666;
}
.spinner {
  border: 4px solid #d9d9d9;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

/* Estilos de Error */
.error-card {
  background: #ffe8e8;
  border: 1px solid #feb2b2;
  color: #c53030;
  padding: 30px;
  border-radius: 8px;
  text-align: center;
}

/* Barra superior */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.badge {
  background: #d9e1ea;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.9em;
  font-weight: bold;
}

.btn-secondary, .btn-back {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #dfe6ef;
  color: #2d3748;
  font-weight: 600;
  transition: background 0.2s;
}
.btn-back {
  background: #c53030;
  color: white;
  margin-top: 15px;
}
.btn-secondary:hover {
  background: #d2dce8;
}

/* --- ESTILOS DEL MARKDOWN (Copiar los que te pasé antes) --- */
.markdown-viewer {
  background: #f4f6fa;
  border: 1px solid #d7dee8;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.dark-mode {
  background: #1a1a1a;
  color: #f0f0f0;
}

.dark-mode .global-navbar {
  background: rgba(20, 20, 20, 0.88);
  border-bottom-color: #2e2e2e;
}

.dark-mode .logo-img {
  filter: brightness(0) invert(1);
}

.dark-mode .navbar-brand:hover .logo-img {
  filter: brightness(0) invert(1) blur(1.5px);
}

.dark-mode .nav-link,
.dark-mode .nav-current,
.dark-mode .nav-sep {
  color: #f0f0f0;
}

.dark-mode .loading-state {
  color: #cfcfcf;
}

.dark-mode .error-card {
  background: #3f1d1d;
  border-color: #7f1d1d;
  color: #fecaca;
}

.dark-mode .badge {
  background: #2a2a2a;
  color: #f0f0f0;
}

.dark-mode .btn-secondary {
  background: #222222;
  color: #f0f0f0;
}

.dark-mode .btn-secondary:hover {
  background: #2c2c2c;
}

.dark-mode .btn-back {
  background: #b91c1c;
}

.dark-mode .markdown-viewer {
  background: #1c1c1c;
  border-color: #2a2a2a;
  color: #f0f0f0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

.dark-mode :deep(table) {
  color: #f0f0f0;
}

.dark-mode :deep(th),
.dark-mode :deep(td) {
  border-color: #2f2f2f;
}

.dark-mode :deep(th) {
  background-color: #222222;
  color: #f0f0f0;
}

.dark-mode :deep(h1) {
  border-bottom-color: #2f2f2f;
  color: #f0f0f0;
}

.dark-mode :deep(h2) {
  color: #f0f0f0;
}

/* Asegurar tablas bonitas dentro del visor */
:deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}
:deep(th), :deep(td) {
  border: 1px solid #cbd5e0;
  padding: 10px;
  text-align: left;
}
:deep(th) {
  background-color: #eef2f7;
  color: #2d3748;
}
:deep(h1) { border-bottom: 2px solid #dfe6ef; padding-bottom: 10px; color: #2b6cb0; }
:deep(h2) { color: #2c5282; margin-top: 30px; }

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .global-navbar {
    padding: 0 12px;
    height: 68px;
  }

  .logo-img {
    width: 190px;
  }

  .navbar-links {
    font-size: 0.9rem;
    gap: 6px;
  }

  .page-shell {
    padding-top: 80px;
  }
}

@media (max-width: 560px) {
  .logo-img {
    width: 160px;
  }

  .nav-current,
  .nav-sep {
    display: none;
  }

  .navbar-right {
    gap: 8px;
    margin-left: 8px;
  }
}

@media (max-width: 420px) {
  .desktop-logo {
    display: none;
  }

  .mobile-logo {
    display: block;
    width: 108px;
  }
}
</style>
