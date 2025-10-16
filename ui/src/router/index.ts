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
      import(/* webpackChunkName: "onboarding" */ '@/views/OnBoarding.vue'),
  },
  {
    path: '/lobby',
    name: 'lobby',
    component: () =>
      import(/* webpackChunkName: "lobby" */ '@/views/Lobby.vue'),
  },
  {
    path: '/my-games',
    name: 'my-games',
    component: () =>
      import(/* webpackChunkName: "myGames" */ '@/views/MyGames.vue'),
  },
  {
    path: '/rank',
    name: 'leaderboard',
    component: () =>
      import(/* webpackChunkName: "leaderboard" */ '@/views/Leaderboard.vue'),
  },
  {
    path: '/tournament/:name',
    name: 'tournamentRank',
    component: () =>
      import(
        /* webpackChunkName: "tournamentRank" */ '@/views/TournamentRank.vue'
      ),
  },
  {
    path: '/announcement',
    name: 'announcement',
    component: () =>
      import(/* webpackChunkName: "gameplay" */ '@/views/Announcement.vue'),
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
router.beforeEach(async (to, _from, next) => {
  const completedOnboarding = localStorage.getItem('completedOnboarding');
  if (to.name === 'announcement') {
    next();
    return;
  }
  if (
    (to.name !== 'onboarding' && !completedOnboarding) ||
    completedOnboarding === 'false'
  ) {
    next({ name: 'onboarding', query: { redirect: to.fullPath } });
    return;
  }
  next();
  return;
});

export default router;
