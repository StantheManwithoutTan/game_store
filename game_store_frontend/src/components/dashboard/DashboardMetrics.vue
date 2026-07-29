<script setup lang="ts">
import type { DashboardMetrics } from '../../types/dashboard'

defineProps<{
  metrics: DashboardMetrics
}>()
</script>

<template>
  <section
      class="metrics-grid"
      aria-label="Métricas principales"
  >
    <article class="metric-card">
      <p>Total de productos</p>
      <strong>{{ metrics.totalProducts }}</strong>
      <span>Productos registrados</span>
    </article>

    <article class="metric-card metric-card-critical">
      <p>Productos críticos</p>
      <strong>{{ metrics.criticalProducts }}</strong>
      <span>Requieren reposición</span>
    </article>

    <article class="metric-card">
      <p>Unidades disponibles</p>
      <strong>{{ metrics.totalUnits }}</strong>
      <span>Existencias acumuladas</span>
    </article>

    <article class="metric-card">
      <p>Movimientos</p>
      <strong>{{ metrics.totalMovements }}</strong>
      <span>Operaciones registradas</span>
    </article>
  </section>
</template>