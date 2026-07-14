<script setup lang="ts">
import type { Product } from '../../types/product'

import type {
  StockMovementForm,
  StockMovementType,
} from '../../types/stock'

const props = defineProps<{
  products: Product[]
  selectedProduct?: Product
  modelValue: StockMovementForm
  valueLabel: string
  submitting: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: StockMovementForm]
  submit: []
}>()

function updateField<
    K extends keyof StockMovementForm,
>(
    field: K,
    value: StockMovementForm[K],
): void {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}
</script>

<template>
  <article class="panel">
    <div class="panel-header">
      <div>
        <p class="panel-label">
          Nuevo movimiento
        </p>

        <h2>Registrar operación</h2>
      </div>
    </div>

    <form
        class="movement-form"
        @submit.prevent="emit('submit')"
    >
      <div class="form-group">
        <label for="movement-product">
          Producto
        </label>

        <select
            id="movement-product"
            :value="modelValue.productId"
            required
            @change="
            updateField(
              'productId',
              Number(
                ($event.target as HTMLSelectElement)
                  .value,
              ),
            )
          "
        >
          <option
              disabled
              :value="0"
          >
            Selecciona un producto
          </option>

          <option
              v-for="product in products"
              :key="product.id"
              :value="product.id"
          >
            {{ product.name }} — {{ product.sku }}
          </option>
        </select>
      </div>

      <fieldset class="movement-types">
        <legend>Tipo de movimiento</legend>

        <label class="radio-option">
          <input
              :checked="modelValue.type === 'entrada'"
              type="radio"
              value="entrada"
              @change="
              updateField(
                'type',
                'entrada' as StockMovementType,
              )
            "
          >
          Entrada
        </label>

        <label class="radio-option">
          <input
              :checked="modelValue.type === 'salida'"
              type="radio"
              value="salida"
              @change="
              updateField(
                'type',
                'salida' as StockMovementType,
              )
            "
          >
          Salida
        </label>

        <label class="radio-option">
          <input
              :checked="modelValue.type === 'ajuste'"
              type="radio"
              value="ajuste"
              @change="
              updateField(
                'type',
                'ajuste' as StockMovementType,
              )
            "
          >
          Ajuste
        </label>
      </fieldset>

      <div
          v-if="selectedProduct"
          class="selected-product"
      >
        <div>
          <span>Stock actual</span>
          <strong>
            {{ selectedProduct.quantity }}
          </strong>
        </div>

        <div>
          <span>Stock mínimo</span>
          <strong>
            {{ selectedProduct.min_stock }}
          </strong>
        </div>
      </div>

      <div class="form-group">
        <label for="movement-value">
          {{ valueLabel }}
        </label>

        <input
            id="movement-value"
            :value="modelValue.value"
            type="number"
            :min="
            modelValue.type === 'ajuste'
              ? 0
              : 1
          "
            required
            @input="
            updateField(
              'value',
              Number(
                ($event.target as HTMLInputElement)
                  .value,
              ),
            )
          "
        >
      </div>

      <div class="form-group">
        <label for="movement-motive">
          Motivo
        </label>

        <textarea
            id="movement-motive"
            :value="modelValue.motive"
            rows="3"
            placeholder="Ejemplo: reposición del proveedor"
            @input="
            updateField(
              'motive',
              (
                $event.target as HTMLTextAreaElement
              ).value,
            )
          "
        />
      </div>

      <button
          class="btn btn-primary"
          type="submit"
          :disabled="
          submitting ||
          products.length === 0
        "
      >
        {{
          submitting
              ? 'Registrando...'
              : 'Registrar movimiento'
        }}
      </button>
    </form>
  </article>
</template>