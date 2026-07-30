<script setup lang="ts">
const keycloakLoginUrl = 
    `${import.meta.env.VITE_KEYCLOAK_URL}/realms/game-store/protocol/openid-connect/auth` +
    `?client_id=game-store-client` +
    `&redirect_uri=${import.meta.env.VITE_APP_URL}/login/callback` +
    `&response_type=code` +
    `&scope=openid`

function login() {
  window.location.href = keycloakLoginUrl
}
</script>

<template>
  <section class="page auth-page">
    <div class="card auth-card">
      <h1>Game Store Inventory</h1>
      <p>Inicia sesión con Keycloak para acceder al sistema de inventario.</p>

      <button class="primary-button" @click="login">
        Iniciar sesión
      </button>
    </div>
  </section>
</template>