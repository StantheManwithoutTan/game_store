<script setup lang="ts">
import type { Product } from '../../types/product'

defineProps<{
  products: Product[]
  page: number
  totalPages: number
}>()

const emit = defineEmits<{
  edit: [product: Product]
  delete: [product: Product]
  'change-page': [page: number]
}>()

function formatPrice(price: string): string {
  const numericPrice = Number(price)

  if (Number.isNaN(numericPrice)) {
    return price
  }

  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
  }).format(numericPrice)
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    discontinued: 'Descontinuado',
  }

  return labels[status] ?? status
}
</script>

<template>
  <div>
    <div
        v-if="products.length === 0"
        class="empty-state"
    >
      No hay productos registrados.
    </div>

    <template v-else>
      <div class="table-container">
        <table class="products-table">
          <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">SKU</th>
            <th scope="col">Categoría</th>
            <th scope="col">Precio</th>
            <th scope="col">Cantidad</th>
            <th scope="col">Stock mínimo</th>
            <th scope="col">Estado</th>
            <th scope="col">Descripción</th>
            <th scope="col">Acciones</th>
          </tr>
          </thead>

          <tbody>
          <tr
              v-for="product in products"
              :key="product.id"
          >
            <td>
              <strong>{{ product.name }}</strong>
            </td>

            <td>{{ product.sku }}</td>

            <td>
              {{ product.category || 'Sin categoría' }}
            </td>

            <td>{{ formatPrice(product.price) }}</td>

            <td>
                <span
                    class="stock-badge"
                    :class="{
                    'stock-badge-critical':
                      product.critico_stock,
                  }"
                >
                  {{ product.quantity }}
                </span>
            </td>

            <td>{{ product.min_stock }}</td>

            <td>
                <span
                    class="status-badge"
                    :class="`status-${product.status}`"
                >
                  {{ statusLabel(product.status) }}
                </span>
            </td>

            <td>
              {{ product.description || 'Sin descripción' }}
            </td>

            <td>
              <div class="table-actions">
                <button
                    class="btn btn-secondary btn-small"
                    type="button"
                    @click="emit('edit', product)"
                >
                  Editar
                </button>

                <button
                    class="btn btn-danger btn-small"
                    type="button"
                    @click="emit('delete', product)"
                >
                  Eliminar
                </button>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <nav
          v-if="totalPages > 1"
          class="pagination"
          aria-label="Paginación de productos"
      >
        <button
            class="btn btn-secondary"
            type="button"
            :disabled="page <= 1"
            @click="emit('change-page', page - 1)"
        >
          Anterior
        </button>

        <span>
          Página {{ page }} de {{ totalPages }}
        </span>

        <button
            class="btn btn-secondary"
            type="button"
            :disabled="page >= totalPages"
            @click="emit('change-page', page + 1)"
        >
          Siguiente
        </button>
      </nav>
    </template>
  </div>
</template>