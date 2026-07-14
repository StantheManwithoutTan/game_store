<script setup lang="ts">
import StockMovementChart from './StockMovementChart.vue'

import type { StockMovement } from '../../types/stock'

defineProps<{
  movements: StockMovement[]
}>()
</script>

<template>
  <section class="panel chart-panel">
    <div class="panel-header">
      <div>
        <p class="panel-label">
          Actividad de inventario
        </p>

        <h2>Movimientos por tipo</h2>
      </div>
    </div>

    <StockMovementChart
        v-if="movements.length > 0"
        :movements="movements"
    />

    <div
        v-else
        class="empty-state"
    >
      No hay movimientos suficientes para mostrar el gráfico.
    </div>
  </section>
</template>