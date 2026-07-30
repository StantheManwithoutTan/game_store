import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import LoginCallback from '../views/LoginCallback.vue'
import DashboardView from '../views/DashboardView.vue'
import ProductsView from '../views/ProductsView.vue'
import StockView from '../views/StockView.vue'
import TestTokenView from '../views/TestTokenView.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            redirect: '/login',
        },
        {
            path: '/login',
            component: LoginView,
        },
        {
            path: '/login/callback',
            component: LoginCallback,
        },
        {
            path: '/dashboard',
            component: DashboardView,
        },
        {
            path: '/productos',
            component: ProductsView,
        },
        {
            path: '/stock',
            component: StockView,
        },
        {
            path: '/herramientas/token',
            component: TestTokenView,
        },
    ],
})

router.beforeEach((to, _from, next) => {
    const token = localStorage.getItem('session_token')

    if (to.path === '/login' || to.path === '/login/callback') {
        next()
    } else if (!token) {
        next('/login')
    } else {
        next()
    }
})

export default router