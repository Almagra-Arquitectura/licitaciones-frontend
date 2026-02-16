import { createRouter, createWebHistory } from 'vue-router'
import LicitacionResumen from '../../views/licitacion/licitacionResumen.vue'
import LoginView from '../../views/auth/login.vue'; // Importa el Login

const routes=[
  {
    path: '/login',
    name: 'Login',
    component: LoginView
  },
  {
    path: '/',
    name: 'Home',
    meta: { requiresAuth: true },
    component: () => import('../../views/home.vue') // O el nombre de tu componente de lista
  },
  {
    path: '/licitaciones/:id/resumen',
    name: 'LicitacionResumen',
    component: LicitacionResumen,
    meta: { requiresAuth: true },
    props: true // Para pasar el :id como prop al componente
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
});

// GUARDIA DE NAVEGACIÓN GLOBAL
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token');

  // Si la ruta requiere auth y NO hay token -> Login
  if (to.meta.requiresAuth && !token) {
    next('/login');
  } 
  // Si ya tiene token e intenta ir al Login -> Home
  else if (to.path === '/login' && token) {
    next('/');
  } 
  else {
    next();
  }
});

export default router
