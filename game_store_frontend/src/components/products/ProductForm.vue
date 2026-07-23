<script setup lang="ts">
import type { ProductFormData } from '../../types/product'

defineProps<{
  modelValue: ProductFormData
  editing: boolean
  submitting: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ProductFormData]
  submit: []
  cancel: []
}>()
</script>

<template>
  <form
      class="product-form"
      @submit.prevent="emit('submit')"
  >
    <fieldset>
      <legend>Información básica</legend>

      <div class="form-group">
        <label for="product-name">
          Nombre
        </label>

        <input
            id="product-name"
            :value="modelValue.name"
            type="text"
            placeholder="Nombre del producto"
            required
            @input="
            emit('update:modelValue', {
              ...modelValue,
              name: ($event.target as HTMLInputElement).value,
            })
          "
        >
      </div>

      <div class="form-group">
        <label for="product-sku">
          SKU
        </label>

        <input
            id="product-sku"
            :value="modelValue.sku"
            type="text"
            placeholder="Código único"
            required
            :disabled="editing"
            @input="
            emit('update:modelValue', {
              ...modelValue,
              sku: ($event.target as HTMLInputElement).value,
            })
          "
        >
      </div>

      <div class="form-group">
        <label for="product-description">
          Descripción
        </label>

        <textarea
            id="product-description"
            :value="modelValue.description"
            rows="3"
            placeholder="Descripción del producto"
            @input="
            emit('update:modelValue', {
              ...modelValue,
              description:
                ($event.target as HTMLTextAreaElement).value,
            })
          "
        />
      </div>

      <div class="form-group">
        <label for="product-category">
          Categoría
        </label>

        <input
            id="product-category"
            :value="modelValue.category"
            type="text"
            placeholder="Videojuegos, consolas, accesorios..."
            @input="
            emit('update:modelValue', {
              ...modelValue,
              category:
                ($event.target as HTMLInputElement).value,
            })
          "
        >
      </div>
    </fieldset>

    <fieldset>
      <legend>Precio e inventario</legend>

      <div class="form-row">
        <div class="form-group">
          <label for="product-price">
            Precio
          </label>

          <input
              id="product-price"
              :value="modelValue.price"
              type="number"
              min="0"
              step="0.01"
              required
              @input="
              emit('update:modelValue', {
                ...modelValue,
                price: Number(
                  ($event.target as HTMLInputElement).value,
                ),
              })
            "
          >
        </div>

        <div class="form-group">
          <label for="product-quantity">
            Cantidad
          </label>

          <input
              id="product-quantity"
              :value="modelValue.quantity"
              type="number"
              min="0"
              step="1"
              required
              @input="
              emit('update:modelValue', {
                ...modelValue,
                quantity: Number(
                  ($event.target as HTMLInputElement).value,
                ),
              })
            "
          >
        </div>
      </div>

      <div class="form-group">
        <label for="product-min-stock">
          Stock mínimo
        </label>

        <input
            id="product-min-stock"
            :value="modelValue.min_stock"
            type="number"
            min="0"
            step="1"
            @input="
            emit('update:modelValue', {
              ...modelValue,
              min_stock: Number(
                ($event.target as HTMLInputElement).value,
              ),
            })
          "
        >
      </div>
    </fieldset>

    <fieldset>
      <legend>Estado</legend>

      <div class="form-group">
        <label for="product-status">
          Estado del producto
        </label>

        <select
            id="product-status"
            :value="modelValue.status"
            @change="
            emit('update:modelValue', {
              ...modelValue,
              status:
                ($event.target as HTMLSelectElement)
                  .value as ProductFormData['status'],
            })
          "
        >
          <option value="active">
            Activo
          </option>

          <option value="inactive">
            Inactivo
          </option>

          <option value="discontinued">
            Descontinuado
          </option>
        </select>
      </div>

      <label class="checkbox-group">
        <input
            :checked="modelValue.critico_stock"
            type="checkbox"
            @change="
            emit('update:modelValue', {
              ...modelValue,
              critico_stock:
                ($event.target as HTMLInputElement).checked,
            })
          "
        >

        <span>Marcar como stock crítico</span>
      </label>
    </fieldset>

    <div class="form-actions">
      <button
          class="btn btn-primary"
          type="submit"
          :disabled="submitting"
      >
        {{
          submitting
              ? 'Guardando...'
              : editing
                  ? 'Actualizar producto'
                  : 'Crear producto'
        }}
      </button>

      <button
          class="btn btn-secondary"
          type="button"
          :disabled="submitting"
          @click="emit('cancel')"
      >
        Cancelar
      </button>
    </div>
  </form>
</template>