<script setup lang="ts">
withDefaults(
    defineProps<{
      message?: string
    }>(),
    {
      message: 'Cargando...',
    },
)
</script>

<template>
  <div
      class="loading-state"
      role="status"
      aria-live="polite"
  >
    <span class="loading-spinner" />

    <span>{{ message }}</span>
  </div>
</template>