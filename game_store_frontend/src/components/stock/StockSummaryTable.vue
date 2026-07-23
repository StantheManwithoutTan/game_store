<script setup lang="ts">
import {
  getStockLevelClass,
  getStockStatusClass,
  getStockStatusLabel,
} from '../../utils/stock'

import type { Product } from '../../types/product'

defineProps<{
  products: Product[]
}>()
</script>

<template>
  <section class="panel stock-summary">
    <div class="panel-header">
      <div>
        <p class="panel-label">
          Disponibilidad
        </p>

        <h2>Estado actual de productos</h2>
      </div>
    </div>

    <div
        v-if="products.length === 0"
        class="empty-state"
    >
      No hay productos registrados.
    </div>

    <div
        v-else
        class="table-container"
    >
      <table>
        <thead>
        <tr>
          <th scope="col">Producto</th>
          <th scope="col">SKU</th>
          <th scope="col">Cantidad</th>
          <th scope="col">Stock mínimo</th>
          <th scope="col">Estado</th>
        </tr>
        </thead>

        <tbody>
        <tr
            v-for="product in products"
            :key="product.id"
            :class="getStockLevelClass(product)"
        >
          <td>{{ product.name }}</td>
          <td>{{ product.sku }}</td>
          <td>{{ product.quantity }}</td>
          <td>{{ product.min_stock }}</td>

          <td>
              <span
                  class="status-badge"
                  :class="
                  getStockStatusClass(product)
                "
              >
                {{ getStockStatusLabel(product) }}
              </span>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>