import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: () => import(/* webpackChunkName: "home" */ '@/views/Home.vue'),
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () =>
      import(/* webpackChunkName: "gameplay" */ '@/views/OnBoarding.vue'),
  },
  {
    path: '/lobby',
    name: 'lobby',
    component: () =>
      import(/* webpackChunkName: "gameplay" */ '@/views/Lobby.vue'),
  },
  {
    path: '/:id',
    name: 'gameplay',
    component: () =>
      import(/* webpackChunkName: "gameplay" */ '@/views/Gameplay.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});
router.beforeEach(async (to, from, next) => {
  const completedOnboarding = localStorage.getItem('completedOnboarding');
  if (to.name !== 'onboarding' && !completedOnboarding || completedOnboarding === 'false') {
    next({ name: 'onboarding', query: { redirect: to.fullPath } });
    return;
  }
  next();
  return;
});

export default router;
