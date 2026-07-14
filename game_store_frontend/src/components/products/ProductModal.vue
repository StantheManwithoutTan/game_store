<script setup lang="ts">
import ProductForm from './ProductForm.vue'

import type {
  Product,
  ProductFormData,
} from '../../types/product'

defineProps<{
  product: Product | null
  form: ProductFormData
  submitting: boolean
}>()

const emit = defineEmits<{
  'update:form': [value: ProductFormData]
  save: []
  close: []
}>()

function handleBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <div
      class="modal-backdrop"
      role="presentation"
      @click="handleBackdropClick"
  >
    <section
        class="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
    >
      <header class="modal-header">
        <h2 id="product-modal-title">
          {{
            product
                ? 'Editar producto'
                : 'Nuevo producto'
          }}
        </h2>

        <button
            class="modal-close"
            type="button"
            aria-label="Cerrar formulario"
            @click="emit('close')"
        >
          ×
        </button>
      </header>

      <ProductForm
          :model-value="form"
          :editing="Boolean(product)"
          :submitting="submitting"
          @update:model-value="emit('update:form', $event)"
          @submit="emit('save')"
          @cancel="emit('close')"
      />
    </section>
  </div>
</template>