<script setup lang="ts">
import { formatDateTime } from '../../utils/date'
import {
  getMovementClass,
  getMovementLabel,
} from '../../utils/movement'

import type { StockMovement } from '../../types/stock'

defineProps<{
  movements: StockMovement[]
  productNames: Record<number, string>
}>()
</script>

<template>
  <article class="panel">
    <div class="panel-header">
      <div>
        <p class="panel-label">
          Actividad reciente
        </p>

        <h2>Últimos movimientos</h2>
      </div>

      <RouterLink
          class="panel-link"
          to="/stock"
      >
        Ver historial
      </RouterLink>
    </div>

    <div
        v-if="movements.length === 0"
        class="empty-state"
    >
      No existen movimientos registrados.
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
        </tr>
        </thead>

        <tbody>
        <tr
            v-for="movement in movements"
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
        </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>