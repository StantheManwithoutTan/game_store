<script setup lang="ts">
defineProps<{
  userName: string
  loggingOut?: boolean
}>()

const emit = defineEmits<{
  logout: []
}>()
</script>

<template>
  <nav class="app-navbar">
    <div>
      <p class="app-navbar-label">
        Usuario activo
      </p>

      <strong class="app-navbar-user">
        {{ userName }}
      </strong>
    </div>

    <button
        class="btn btn-danger"
        type="button"
        :disabled="loggingOut"
        @click="emit('logout')"
    >
      {{ loggingOut ? 'Cerrando...' : 'Cerrar sesión' }}
    </button>
  </nav>
</template>