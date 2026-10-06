import { createRouter, createWebHistory } from 'vue-router'
import { setToken } from '@/service/auth'

const APP_TITLE = 'Pilarweb'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('../components/pages/dashboard/DashboardPage.vue'),
      meta: {
        title: 'Dashboard',
      },
    },
    {
      path: '/asset/fixed',
      name: 'Asset Fixed',
      component: () => import('../components/pages/assets/AssetFixed.vue'),
      meta: {
        title: 'Asset Fixed',
      },
    },
    {
      path: '/asset/consumeable',
      name: 'Asset Consumeable',
      component: () => import('../components/pages/assets/AssetConsumeable.vue'),
      meta: {
        title: 'Asset Consumeable',
      },
    },
    {
      path: '/request/my',
      name: 'My Request',
      component: () => import('../components/pages/request/MyRequest.vue'),
      meta: {
        title: 'My Request',
      },
    },
    {
      path: '/request/new',
      name: 'New Request',
      component: () => import('../components/pages/request/NewRequest.vue'),
      meta: {
        title: 'New Request',
      },
    },
    {
      path: '/request/:id',
      name: 'Request Detail',
      component: () => import('../components/pages/request/RequestDetailPage.vue'),
      meta: {
        title: 'Request Detail',
      },
    },
    {
      path: '/approvals',
      name: 'Approvals',
      component: () => import('../components/pages/approval/ApprovalsPage.vue'),
      meta: {
        title: 'Approvals',
      },
    },
    {
      path: '/finance-review',
      name: 'Finance Review',
      component: () => import('../components/pages/financial/FinanceReviewPage.vue'),
      meta: {
        title: 'Finance Review',
      },
    },
    {
      path: '/financial-closing',
      name: 'Financial Closing',
      component: () => import('../components/pages/financial/FinancialClosingPage.vue'),
      meta: {
        title: 'Financial Closing',
      },
    },
    {
      path: '/warehouse/requests',
      name: 'Warehouse Request Queue',
      component: () => import('../components/pages/werehouse/RequestQueuePage.vue'),
      meta: {
        title: 'Warehouse Request Queue',
      },
    },
    {
      path: '/warehouse/fulfillments',
      name: 'Warehouse Fulfillment Picking',
      component: () => import('../components/pages/werehouse/FullfilmentPage.vue'),
      meta: {
        title: 'Fulfillment / Picking',
      },
    },
    {
      path: '/returns',
      name: 'Returns',
      component: () => import('../components/pages/werehouse/ReturnPage.vue'),
      meta: {
        title: 'Returns',
      },
    },
    {
      path: '/data/WHLocations',
      name: 'WH Locations',
      component: () => import('../components/pages/werehouse/WHLocations.vue'),
      meta: {
        title: 'Warehouse Locations',
      },
    },
    {
      path: '/data/RequestPurpose',
      name: 'Request Purpose',
      component: () => import('../components/pages/master/RequestPurpose.vue'),
      meta: {
        title: 'Request Purpose',
      },
    },
    {
      path: '/data/ApprovalRules',
      name: 'Approval Rules',
      component: () => import('../components/pages/master/ApprovalRulesPage.vue'),
      meta: {
        title: 'Approval Rules',
      },
    },
    {
      path: '/error-404',
      name: '404 Error',
      component: () => import('../views/Errors/FourZeroFour.vue'),
      meta: {
        title: '404 Error',
      },
    },

    {
      path: '/signin',
      name: 'Signin',
      component: () => import('../views/Auth/Signin.vue'),
      meta: {
        title: 'Sign In',
      },
    },
    {
      path: '/signup',
      name: 'Signup',
      component: () => import('../views/Auth/Signup.vue'),
      meta: {
        title: 'Sign Up',
      },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/error-404',
    },
  ],
})

export default router

router.beforeEach((to, from, next) => {
  document.title = `${String(to.meta.title || 'Page')} | ${APP_TITLE}`

  const tokenParam = to.query.token
  if (typeof tokenParam === 'string' && tokenParam) {
    setToken(tokenParam)
    const query = { ...to.query }
    delete query.token
    next({ path: to.path, query, hash: to.hash, replace: true })
    return
  }

  next()
})
