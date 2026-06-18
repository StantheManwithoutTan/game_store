<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const API = 'http://localhost:5000/api/products/'

interface Product {
  id: number; name: string; sku: string; quantity: number
  min_stock: number; status: string
}

const router = useRouter()
const products = ref<Product[]>([])
const loading = ref(false)
const savingId = ref<number | null>(null)
const error = ref('')

function authHeaders() {
  const token = localStorage.getItem('session_token')
  return { Authorization: `Bearer ${token}` }
}

function stockLevelClass(p: Product): string {
  if (p.quantity <= p.min_stock) return 'level-danger'
  if (p.quantity <= p.min_stock * 2) return 'level-warning'
  return 'level-ok'
}

async function fetchProducts() {
  loading.value = true
  try {
    const res = await axios.get(API, { headers: authHeaders(), params: { per_page: 100 } })
    products.value = res.data
  } catch (e: any) {
    if (e.response?.status === 401) router.push('/login')
    else error.value = 'Error al cargar stock'
  } finally { loading.value = false }
}

async function updateStock(p: Product) {
  savingId.value = p.id
  try {
    await axios.put(`${API}/${p.id}`, { quantity: p.quantity, min_stock: p.min_stock }, { headers: authHeaders() })
  } catch (e: any) {
    if (e.response?.status === 401) router.push('/login')
    else error.value = 'Error al actualizar stock'
  } finally { savingId.value = null }
}

onMounted(fetchProducts)
</script>


<template>
  <div class="stock">
    <h1>Gestión de Stock</h1>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading" class="loading">Cargando...</div>

    <table v-else-if="products.length">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>SKU</th>
          <th>Cantidad</th>
          <th>Stock Mínimo</th>
          <th>Estado</th>
          <th>Acción</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in products" :key="p.id" :class="stockLevelClass(p)">
          <td>{{ p.name }}</td>
          <td>{{ p.sku }}</td>
          <td><input v-model.number="p.quantity" type="number" min="0" /></td>
          <td><input v-model.number="p.min_stock" type="number" min="0" /></td>
          <td>{{ p.status }}</td>
          <td><button @click="updateStock(p)" :disabled="savingId === p.id">Guardar</button></td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty">No hay productos.</div>
  </div>
</template>

<style lang="css" scoped>
  .level-danger { background: #ffe0e0; }
  .level-warning { background: #fff3cd; }
  .level-ok { background: #d4edda; }
</style>