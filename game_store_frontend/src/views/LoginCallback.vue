<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  const code = new URLSearchParams(window.location.search).get('code')
  if (code) {
    try {
      await authStore.loginWithKeycloak(code)
      router.push('/')
    } catch (error) {
      router.push('/login')
    }
  }
})
</script>

<template>
  <div>Loading...</div>
</template>