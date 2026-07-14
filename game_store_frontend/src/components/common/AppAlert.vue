<script setup lang="ts">
withDefaults(
    defineProps<{
      type?: 'success' | 'error' | 'warning' | 'info'
    }>(),
    {
      type: 'info',
    },
)
</script>

<template>
  <div
      class="app-alert"
      :class="`app-alert-${type}`"
      role="alert"
  >
    <slot />
  </div>
</template>