<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const API = 'http://localhost:5000/api/products'

interface Product {
  id: number; name: string; sku: string; description?: string
  category?: string; price: string; quantity: number
  min_stock: number; status: string
}

const router = useRouter()
const products = ref<Product[]>([])
const search = ref('')
const page = ref(1)
const totalPages = ref(1)
const loading = ref(false)
const error = ref('')
const showForm = ref(false)
const editingProduct = ref<Product | null>(null)
const form = ref({ name: '', sku: '', price: 0, description: '', category: '', quantity: 0, min_stock: 0, status: 'active' })

function authHeaders() {
  const token = localStorage.getItem('session_token')
  return { Authorization: `Bearer ${token}` }
}

async function fetchProducts() {
  loading.value = true; error.value = ''
  try {
    const res = await axios.get(API, {
      headers: authHeaders(),
      params: { page: page.value, per_page: 10, search: search.value || undefined }
    })
    products.value = res.data
    // totalPages from response headers or default
    totalPages.value = parseInt(res.headers['x-total-pages'] || '1')
  } catch (e: any) {
    if (e.response?.status === 401) router.push('/login')
    else error.value = 'Error al cargar productos'
  } finally { loading.value = false }
}

function onSearch() {
  page.value = 1
  fetchProducts()
}

function changePage(p: number) {
  page.value = p
  fetchProducts()
}

function openCreateForm() {
  editingProduct.value = null
  form.value = { name: '', sku: '', price: 0, description: '', category: '', quantity: 0, min_stock: 0, status: 'active' }
  showForm.value = true
}

function openEditForm(p: Product) {
  editingProduct.value = p
  form.value = {
    name: p.name,
    sku: p.sku,
    price: parseFloat(p.price),
    description: p.description || '',
    category: p.category || '',
    quantity: p.quantity,
    min_stock: p.min_stock,
    status: p.status
  }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingProduct.value = null
}

async function saveProduct() {
  loading.value = true
  try {
    if (editingProduct.value) {
      await axios.put(`${API}/${editingProduct.value.id}`, form.value, { headers: authHeaders() })
    } else {
      await axios.post(API, form.value, { headers: authHeaders() })
    }
    closeForm()
    fetchProducts()
  } catch (e: any) {
    if (e.response?.status === 401) router.push('/login')
    else if (e.response?.status === 403) error.value = 'No tienes permiso para esta acción'
    else error.value = e.response?.data?.message || 'Error al guardar'
  } finally { loading.value = false }
}

async function deleteProduct(id: number) {
  if (!confirm('¿Eliminar este producto?')) return
  try {
    await axios.delete(`${API}/${id}`, { headers: authHeaders() })
    fetchProducts()
  } catch (e: any) {
    if (e.response?.status === 401) router.push('/login')
    else error.value = 'Error al eliminar'
  }
}

onMounted(fetchProducts)
</script>


<template>
  <div class="products">
    <h1>Productos</h1>

    <!-- Search bar -->
    <div class="toolbar">
      <input v-model="search" placeholder="Buscar productos..." @input="onSearch" />
      <button @click="openCreateForm">Nuevo Producto</button>
    </div>

    <!-- Error message -->
    <div v-if="error" class="error">{{ error }}</div>

    <!-- Create/Edit form modal -->
    <div v-if="showForm" class="modal">
      <div class="modal-content">
        <h2>{{ editingProduct ? 'Editar Producto' : 'Nuevo Producto' }}</h2>
                <form @submit.prevent="saveProduct" class="product-form">
          <fieldset>
            <legend>Información Básica</legend>
            <div class="form-group">
              <label for="name">Nombre </label>
              <input id="name" v-model="form.name" placeholder="Nombre del producto" required />
            </div>
            <div class="form-group">
              <label for="sku">SKU </label>
              <input id="sku" v-model="form.sku" placeholder="Código único" required :disabled="!!editingProduct" />
            </div>
            <div class="form-group">
              <label for="description">Descripción </label>
              <input id="description" v-model="form.description" placeholder="Descripción del producto" />
            </div>
            <div class="form-group">
              <label for="category">Categoría </label>
              <input id="category" v-model="form.category" placeholder="Ej: Videojuegos, Consolas, Accesorios" />
            </div>
          </fieldset>

          <fieldset>
            <legend>Precio e Inventario</legend>
            <div class="form-row">
              <div class="form-group">
                <label for="price">Precio (decimal)</label>
                <input id="price" v-model.number="form.price" type="number" step="0.01" placeholder="0.00" required />
              </div>
              <div class="form-group">
                <label for="quantity">Cantidad </label>
                <input id="quantity" v-model.number="form.quantity" type="number" placeholder="0" />
              </div>
            </div>
            <div class="form-group">
              <label for="min_stock">Stock mínimo </label>
              <input id="min_stock" v-model.number="form.min_stock" type="number" placeholder="0" />
            </div>
          </fieldset>

          <fieldset>
            <legend>Estado</legend>
            <div class="form-group">
              <label for="status">Estado del producto </label>
              <select id="status" v-model="form.status">
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="discontinued">Descontinuado</option>
              </select>
            </div>
          </fieldset>

          <div class="form-actions">
            <button type="submit" :disabled="loading" class="btn-primary">{{ loading ? 'Guardando...' : 'Guardar' }}</button>
            <button type="button" @click="closeForm" class="btn-secondary">Cancelar</button>
          </div>
        </form>

      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">Cargando...</div>

    <!-- Products table -->
    <table v-else-if="products.length">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>SKU</th>
          <th>Categoría</th>
          <th>Precio</th>
          <th>Cantidad</th>
          <th>Stock Min</th>
          <th>Estado</th>
          <th>Descripcion</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in products" :key="p.id">
          <td>{{ p.name }}</td>
          <td>{{ p.sku }}</td>
          <td>{{ p.category }}</td>
          <td>${{ p.price }}</td>
          <td>{{ p.quantity }}</td>
          <td>{{ p.min_stock }}</td>
          <td>{{ p.status }}</td>
          <td>{{ p.description }}</td>
          <td>
            <button @click="openEditForm(p)">Editar</button>
            <button @click="deleteProduct(p.id)" class="danger">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Empty state -->
    <div v-else class="empty">No hay productos.</div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="page <= 1" @click="changePage(page - 1)">Anterior</button>
      <span>Página {{ page }} de {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)">Siguiente</button>
    </div>
  </div>
</template>
