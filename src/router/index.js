import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import BarangView from '../views/BarangView.vue'
import BarangMasukView from '../views/BarangMasukView.vue'
import BarangKeluarView from '../views/BarangKeluarView.vue'
import MonitoringView from '../views/MonitoringView.vue'
import { supabase } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      component: LoginView,
      meta: { requiresAuth: false }
    },
    {
      path: '/dashboard',
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    {
      path: '/barang',
      component: BarangView,
      meta: { requiresAuth: true }
    },
    {
      path: '/barang-masuk',
      component: BarangMasukView,
      meta: { requiresAuth: true }
    },
    {
      path: '/barang-keluar',
      component: BarangKeluarView,
      meta: { requiresAuth: true }
    },
    {
      path: '/monitoring',
      component: MonitoringView,
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach(async (to) => {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (to.meta.requiresAuth && !session) {
    return {
      path: '/login',
      query: { redirect: to.fullPath }
    }
  }

  if (to.meta.requiresAuth && session && !isAdminUser(session.user)) {
    await supabase.auth.signOut()
    return {
      path: '/login',
      query: { redirect: to.fullPath }
    }
  }

  if (to.path === '/login' && session && isAdminUser(session.user)) {
    return '/dashboard'
  }
})

export default router