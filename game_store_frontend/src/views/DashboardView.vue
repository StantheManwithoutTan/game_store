<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.logout()
  const logoutUrl = 'http://localhost:8080/realms/game-store/protocol/openid-connect/logout' +
    '?client_id=game-store-client' +
    '&post_logout_redirect_uri=' + encodeURIComponent('http://localhost:5173/login')
  window.location.href = logoutUrl
}
</script>
<template>
  <div class="dashboard">
    <nav class="navbar">
      <span class="user-name">{{ authStore.user?.name || authStore.user?.email }}</span>
      <button class="btn-logout" @click="handleLogout">Cerrar sesión</button>
    </nav>

    <h1>Dashboard</h1>
    <p>Bienvenido al sistema Game Store.</p>

    <div class="actions">
      <router-link to="/productos">
        <button>Gestionar Productos</button>
      </router-link>
      <router-link to="/stock">
        <button>Gestionar Stock</button>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 24px;
}
.user-name { font-weight: 500; color: #333; }
.btn-logout {
  padding: 8px 20px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-logout:hover { background: #c0392b; }

</style>