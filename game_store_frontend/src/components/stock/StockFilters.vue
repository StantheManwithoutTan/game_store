<script setup lang="ts">
import type { Product } from '../../types/product'
import type { StockHistoryFilters } from '../../types/stock'

const props = defineProps<{
  products: Product[]
  modelValue: StockHistoryFilters
  filtering: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: StockHistoryFilters]
  apply: []
  clear: []
}>()

function updateField<
    K extends keyof StockHistoryFilters,
>(
    field: K,
    value: StockHistoryFilters[K],
): void {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}
</script>

<template>
  <form
      class="filter-form"
      @submit.prevent="emit('apply')"
  >
    <div class="form-group">
      <label for="history-product">
        Producto
      </label>

      <select
          id="history-product"
          :value="modelValue.product_id ?? ''"
          @change="
          updateField(
            'product_id',
            ($event.target as HTMLSelectElement).value
              ? Number(
                  ($event.target as HTMLSelectElement).value,
                )
              : undefined,
          )
        "
      >
        <option value="">
          Todos
        </option>

        <option
            v-for="product in products"
            :key="product.id"
            :value="product.id"
        >
          {{ product.name }}
        </option>
      </select>
    </div>

    <div class="form-group">
      <label for="date-from">
        Desde
      </label>

      <input
          id="date-from"
          :value="modelValue.fecha_desde"
          type="date"
          @input="
          updateField(
            'fecha_desde',
            ($event.target as HTMLInputElement).value,
          )
        "
      >
    </div>

    <div class="form-group">
      <label for="date-to">
        Hasta
      </label>

      <input
          id="date-to"
          :value="modelValue.fecha_hasta"
          type="date"
          @input="
          updateField(
            'fecha_hasta',
            ($event.target as HTMLInputElement).value,
          )
        "
      >
    </div>

    <div class="filter-actions">
      <button
          class="btn btn-secondary"
          type="submit"
          :disabled="filtering"
      >
        {{ filtering ? 'Filtrando...' : 'Filtrar' }}
      </button>

      <button
          class="btn btn-outline"
          type="button"
          :disabled="filtering"
          @click="emit('clear')"
      >
        Limpiar
      </button>
    </div>
  </form>
</template>