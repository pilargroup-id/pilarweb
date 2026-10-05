import { createRouter, createWebHistory } from 'vue-router'

const APP_TITLE = 'Asset Management Template'

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
      path: '/master/categories',
      name: 'Asset Categories',
      component: () => import('../components/pages/master/AssetCategoriesPage.vue'),
      meta: {
        title: 'Asset Categories',
      },
    },
    {
      path: '/master/brands',
      name: 'Brands',
      component: () => import('../components/pages/master/BrandsPage.vue'),
      meta: {
        title: 'Brands',
      },
    },
    {
      path: '/master/locations',
      name: 'Locations',
      component: () => import('../components/pages/master/LocationsPage.vue'),
      meta: {
        title: 'Locations',
      },
    },
    {
      path: '/master/uoms',
      name: 'Units of Measure',
      component: () => import('../components/pages/master/UomsPage.vue'),
      meta: {
        title: 'Units of Measure',
      },
    },
    {
      path: '/master/numbering',
      name: 'Numbering',
      component: () => import('../components/pages/master/NumberingPage.vue'),
      meta: {
        title: 'Numbering',
      },
    },
    {
      path: '/depreciation/policies',
      name: 'Depreciation Policies',
      component: () => import('../components/pages/depreciation/DepreciationPoliciesPage.vue'),
      meta: {
        title: 'Depreciation Policies',
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
      path: '/financial-closing',
      name: 'Financial Closing',
      component: () => import('../components/pages/financial/FinancialClosingPage.vue'),
      meta: {
        title: 'Financial Closing',
      },
    },
    {
      path: '/data/import',
      name: 'Import',
      component: () => import('../components/pages/data/ImportPage.vue'),
      meta: {
        title: 'Import',
      },
    },
    {
      path: '/data/export',
      name: 'Export',
      component: () => import('../components/pages/data/ExportPage.vue'),
      meta: {
        title: 'Export & Reports',
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
      path: '/permissions/list',
      name: 'Permission List',
      component: () => import('../components/pages/permissions/PermissionListPage.vue'),
      meta: {
        title: 'Permission List',
      },
    },
    {
      path: '/permissions/assignments',
      name: 'Permission Assignments',
      component: () => import('../components/pages/permissions/PermissionAssignments.vue'),
      meta: {
        title: 'Permission Assignments',
      },
    },
    {
      path: '/chat',
      name: 'AI Assistant',
      component: () => import('../components/pages/chat/ChatRoomPage.vue'),
      meta: {
        title: 'AI Assistant',
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
  next()
})
