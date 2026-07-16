<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: []
  create: []
}>()

function handleInput(event: Event): void {
  const input = event.target as HTMLInputElement

  emit('update:modelValue', input.value)
  emit('search')
}
</script>

<template>
  <div class="product-toolbar">
    <div class="search-container">
      <label
          class="sr-only"
          for="product-search"
      >
        Buscar productos
      </label>

      <input
          id="product-search"
          :value="modelValue"
          class="search-input"
          type="search"
          placeholder="Buscar productos..."
          @input="handleInput"
      >
    </div>

    <button
        class="btn btn-primary"
        type="button"
        @click="emit('create')"
    >
      Nuevo producto
    </button>
  </div>
</template>