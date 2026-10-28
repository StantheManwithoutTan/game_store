<script setup lang="ts">
import { getAppUrl, getKeycloakUrl } from '../config'

const appUrl = getAppUrl()
const keycloakUrl = getKeycloakUrl()

console.log("APP_URL:", import.meta.env.VITE_APP_URL)
console.log("KEYCLOAK_URL:", import.meta.env.VITE_KEYCLOAK_URL)

const keycloakLoginUrl =
    `${keycloakUrl}/realms/game-store/protocol/openid-connect/auth` +
    `?client_id=game-store-client` +
    `&redirect_uri=${encodeURIComponent(appUrl + '/login/callback')}` +
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