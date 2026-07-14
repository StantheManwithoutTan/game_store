<script setup lang="ts">
import type { Product } from '../../types/product'

defineProps<{
  products: Product[]
}>()
</script>

<template>
  <article class="panel critical-panel">
    <div class="panel-header">
      <div>
        <p class="panel-label">
          Atención requerida
        </p>

        <h2>Productos críticos</h2>
      </div>

      <span class="critical-counter">
        {{ products.length }}
      </span>
    </div>

    <div
        v-if="products.length === 0"
        class="empty-state"
    >
      No hay productos con stock crítico.
    </div>

    <ul
        v-else
        class="critical-list"
    >
      <li
          v-for="product in products"
          :key="product.id"
          class="critical-item"
      >
        <div>
          <strong>{{ product.name }}</strong>
          <span>{{ product.sku }}</span>
        </div>

        <div class="critical-stock">
          <span>{{ product.quantity }}</span>

          <small>
            mínimo {{ product.min_stock }}
          </small>
        </div>
      </li>
    </ul>
  </article>
</template>