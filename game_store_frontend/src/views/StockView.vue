<script setup lang="ts">
import AppAlert from '../components/common/AppAlert.vue'
import LoadingState from '../components/common/LoadingState.vue'

import CriticalStockList from '../components/stock/CriticalStockList.vue'
import StockFilters from '../components/stock/StockFilters.vue'
import StockHistoryTable from '../components/stock/StockHistoryTable.vue'
import StockMovementForm from '../components/stock/StockMovementForm.vue'
import StockSummaryTable from '../components/stock/StockSummaryTable.vue'

import { useStock } from '../composables/useStock'

const {
  products,
  criticalProducts,
  movements,

  loading,
  submitting,
  filtering,

  error,
  successMessage,

  filters,
  form,

  productNames,
  selectedProduct,
  valueLabel,

  submitMovement,
  applyFilters,
  clearFilters,
} = useStock()
</script>

<template>
  <main class="stock-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">
          Inventario
        </p>

        <h1>Control de stock</h1>

        <p class="page-description">
          Registra entradas, salidas y ajustes, y consulta
          el historial de movimientos.
        </p>
      </div>

      <RouterLink
          class="btn btn-outline"
          to="/dashboard"
          aria-label="Volver al dashboard"
      >
        Volver al dashboard
      </RouterLink>
    </header>

    <AppAlert
        v-if="error"
        type="error"
    >
      {{ error }}
    </AppAlert>

    <AppAlert
        v-if="successMessage"
        type="success"
    >
      {{ successMessage }}
    </AppAlert>

    <LoadingState
        v-if="loading"
        message="Cargando información de inventario..."
    />

    <template v-else>
      <section class="inventory-grid">
        <StockMovementForm
            v-model="form"
            :products="products"
            :selected-product="selectedProduct"
            :value-label="valueLabel"
            :submitting="submitting"
            @submit="submitMovement"
        />

        <CriticalStockList
            :products="criticalProducts"
        />
      </section>

      <StockSummaryTable
          :products="products"
      />

      <section class="panel history-panel">
        <div class="panel-header">
          <div>
            <p class="panel-label">
              Trazabilidad
            </p>

            <h2>Historial de movimientos</h2>
          </div>
        </div>

        <StockFilters
            v-model="filters"
            :products="products"
            :filtering="filtering"
            @apply="applyFilters"
            @clear="clearFilters"
        />

        <StockHistoryTable
            :movements="movements"
            :product-names="productNames"
        />
      </section>
    </template>
  </main>
</template>

