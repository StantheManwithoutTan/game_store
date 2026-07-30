<script setup lang="ts">
import { computed } from 'vue'

import AppAlert from '../components/common/AppAlert.vue'
import AppNavbar from '../components/common/AppNavbar.vue'
import LoadingState from '../components/common/LoadingState.vue'

import CriticalProductsList from '../components/dashboard/CriticalProductsList.vue'
import DashboardChartPanel from '../components/dashboard/DashboardChartPanel.vue'
import DashboardMetrics from '../components/dashboard/DashboardMetrics.vue'
import RecentMovementsTable from '../components/dashboard/RecentMovementsTable.vue'

import { useDashboard } from '../composables/useDashboard'
import { useLogout } from '../composables/useLogout'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const {
  criticalProducts,
  recentMovements,
  metrics,
  productNames,
  loading,
  error,
} = useDashboard()

const {
  loggingOut,
  logout,
} = useLogout()

const userName = computed(
    () =>
        authStore.user?.name ||
        authStore.user?.email ||
        'Usuario',
)
</script>

<template>
  <main class="dashboard-page">
    <AppNavbar
        :user-name="userName"
        :logging-out="loggingOut"
        @logout="logout"
    />

    <header class="page-header">
      <div>
        <p class="eyebrow">
          Resumen operacional
        </p>

        <h1>Dashboard</h1>

        <p>
          Consulta el estado actual del inventario y los
          movimientos recientes.
        </p>
      </div>

      <div class="header-actions">
        <RouterLink
            class="btn btn-outline"
            to="/herramientas/token"
        >
          Token de prueba
        </RouterLink>

        <RouterLink
            class="btn btn-secondary"
            to="/productos"
        >
          Gestionar productos
        </RouterLink>

        <RouterLink
            class="btn btn-primary"
            to="/stock"
        >
          Controlar stock
        </RouterLink>
      </div>
    </header>

    <AppAlert
        v-if="error"
        type="error"
    >
      {{ error }}
    </AppAlert>

    <LoadingState
        v-if="loading"
        message="Cargando dashboard..."
    />

    <template v-else>
      <DashboardMetrics
          :metrics="metrics"
      />

      <DashboardChartPanel
          :movements="recentMovements"
      />

      <section class="dashboard-grid">
        <CriticalProductsList
            :products="criticalProducts"
        />

        <RecentMovementsTable
            :movements="recentMovements"
            :product-names="productNames"
        />
      </section>
    </template>
  </main>
</template>

