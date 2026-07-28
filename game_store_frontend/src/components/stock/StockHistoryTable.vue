<script setup lang="ts">
import { formatDateTime } from '../../utils/date'
import { computed, ref } from 'vue'


import {
  getMovementClass,
  getMovementLabel,
} from '../../utils/movement'

import type { StockMovement } from '../../types/stock'

const props = defineProps<{
  movements: StockMovement[]
  productNames: Record<number, string>
}>()

const currentPage = ref(1)
const PER_PAGE = 20

const totalPages = computed(() =>
  Math.max(1, Math.ceil(props.movements.length / PER_PAGE))
)

const startIndex = computed(() =>
  (currentPage.value - 1) * PER_PAGE
)

const paginatedMovements = computed(() =>
  props.movements.slice(startIndex.value, startIndex.value + PER_PAGE)
)

function prevPage(): void {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage(): void {
  if (currentPage.value < totalPages.value) currentPage.value++
}


</script>

<template>
  <div
      v-if="paginatedMovements.length === 0"
      class="empty-state"
  >
    No existen movimientos para los filtros seleccionados.
  </div>

  <div
      v-else
      class="table-container"
  >
    <table>
      <thead>
      <tr>
        <th scope="col">Fecha</th>
        <th scope="col">Producto</th>
        <th scope="col">Tipo</th>
        <th scope="col">Cantidad</th>
        <th scope="col">Antes</th>
        <th scope="col">Después</th>
        <th scope="col">Usuario</th>
        <th scope="col">Motivo</th>
      </tr>
      </thead>

      <tbody>
      <tr
          v-for="movement in paginatedMovements"
          :key="movement.id"
      >
        <td>
          {{ formatDateTime(movement.created_at) }}
        </td>

        <td>
          {{
            productNames[movement.product_id] ??
            `Producto #${movement.product_id}`
          }}
        </td>

        <td>
            <span
                class="movement-badge"
                :class="
                getMovementClass(
                  movement.type_movement,
                )
              "
            >
              {{
                getMovementLabel(
                    movement.type_movement,
                )
              }}
            </span>
        </td>

        <td>{{ movement.amount }}</td>
        <td>{{ movement.stock_before }}</td>
        <td>{{ movement.stock_after }}</td>
        <td>{{ movement.usuario || 'Sistema' }}</td>
        <td>{{ movement.motive || 'Sin motivo' }}</td>
      </tr>
      </tbody>
    </table>
    <div class="pagination">
    <p class="pagination-info">
      Mostrando {{ startIndex + 1 }}–{{ Math.min(startIndex + PER_PAGE, movements.length) }}
      de {{ movements.length }} movimientos
    </p>

    <div class="pagination-controls">
      <button
        class="btn btn-outline btn-sm"
        :disabled="currentPage <= 1"
        @click="prevPage"
      >
        Anterior
      </button>

      <span class="page-indicator">
        Página {{ currentPage }} de {{ totalPages }}
      </span>

      <button
        class="btn btn-outline btn-sm"
        :disabled="currentPage >= totalPages"
        @click="nextPage"
      >
        Siguiente
      </button>
    </div>
  </div>
  </div>
</template>