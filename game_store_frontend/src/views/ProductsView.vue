<template>
  <div class="products">
    <h1>Productos</h1>

    <button @click="showForm = !showForm">
      {{ showForm ? 'Cancelar' : 'Nuevo Producto' }}
    </button>

    <div v-if="showForm" class="form">
      <input v-model="newProduct.name" placeholder="Nombre" />
      <input
          v-model.number="newProduct.price"
          type="number"
          placeholder="Precio"
      />

      <button @click="addProduct">Guardar</button>
    </div>

    <table>
      <thead>
      <tr>
        <th>Nombre</th>
        <th>Precio</th>
      </tr>
      </thead>

      <tbody>
      <tr v-for="product in products" :key="product.id">
        <td>{{ product.name }}</td>
        <td>${{ product.price }}</td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Product {
  id: number
  name: string
  price: number
}

const products = ref<Product[]>([])

const showForm = ref(false)

const newProduct = ref({
  name: '',
  price: 0,
})

function addProduct() {
  products.value.push({
    id: Date.now(),
    name: newProduct.value.name,
    price: newProduct.value.price,
  })

  newProduct.value = {
    name: '',
    price: 0,
  }

  showForm.value = false
}
</script>

<style scoped>
.products {
  padding: 2rem;
}

.form {
  margin: 1rem 0;
}

input {
  margin-right: 1rem;
  padding: 0.5rem;
}

table {
  margin-top: 2rem;
  border-collapse: collapse;
  width: 100%;
}

th,
td {
  border: 1px solid #ccc;
  padding: 0.5rem;
}
</style>