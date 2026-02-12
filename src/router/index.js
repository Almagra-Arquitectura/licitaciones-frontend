import { createRouter, createWebHistory } from 'vue-router'
import LicitacionResumen from '../../views/licitacion/licitacionResumen.vue'


const routes=[
  {
    path: '/',
    name: 'Home',
    component: () => import('../../views/home.vue') // O el nombre de tu componente de lista
  },
  {
    path: '/licitacion/:id/resumen',
    name: 'LicitacionResumen',
    component: LicitacionResumen,
    props: true // Para pasar el :id como prop al componente
  }
]


const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router
