import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import LogsView from '../views/LogsView.vue';
import ManageGamesView from '../views/ManageGamesView.vue';

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
  },
  {
    path: '/logs',
    name: 'Logs',
    component: LogsView,
  },
  {
    path: '/manage-games',
    name: 'ManageGames',
    component: ManageGamesView,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // Using import.meta.env.BASE_URL for Vite
  routes,
});

export default router;
