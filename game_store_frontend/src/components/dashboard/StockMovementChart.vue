<script setup lang="ts">
import { computed } from 'vue'
import {
  Bar,
} from 'vue-chartjs'

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'

import type { StockMovement } from '../../types/stock'

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
)

const props = defineProps<{
  movements: StockMovement[]
}>()

const totals = computed(() => {
  return props.movements.reduce(
      (accumulator, movement) => {
        const type = movement.type_movement.toLowerCase()

        if (type === 'entrada') {
          accumulator.entries += 1
        } else if (type === 'salida') {
          accumulator.exits += 1
        } else {
          accumulator.adjustments += 1
        }

        return accumulator
      },
      {
        entries: 0,
        exits: 0,
        adjustments: 0,
      },
  )
})

const chartData = computed(() => ({
  labels: ['Entradas', 'Salidas', 'Ajustes'],
  datasets: [
    {
      label: 'Movimientos registrados',
      data: [
        totals.value.entries,
        totals.value.exits,
        totals.value.adjustments,
      ],
      backgroundColor: [
        '#16a34a',
        '#dc2626',
        '#2563eb',
      ],
      borderRadius: 8,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
}
</script>

<template>
  <div class="chart-wrapper">
    <Bar
        :data="chartData"
        :options="chartOptions"
        aria-label="Gráfico de movimientos de stock"
    />
  </div>
</template>

<style scoped>
.chart-wrapper {
  position: relative;
  min-height: 320px;
}
</style>