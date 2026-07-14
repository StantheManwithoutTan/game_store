<script setup lang="ts">
import AppAlert from '../components/common/AppAlert.vue'
import LoadingState from '../components/common/LoadingState.vue'

import ProductModal from '../components/products/ProductModal.vue'
import ProductTable from '../components/products/ProductTable.vue'
import ProductToolbar from '../components/products/ProductToolbar.vue'

import { useProducts } from '../composables/useProducts'

const {
  products,

  search,
  page,
  totalPages,

  loading,
  submitting,

  error,
  successMessage,

  showForm,
  editingProduct,
  form,

  searchProducts,
  changePage,

  openCreateForm,
  openEditForm,
  closeForm,

  saveProduct,
  removeProduct,
} = useProducts()
</script>

<template>
  <main class="products-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">
          Administración de inventario
        </p>

        <h1>Productos</h1>

        <p>
          Consulta, registra y actualiza los productos
          disponibles en la tienda.
        </p>
      </div>
    </header>

    <ProductToolbar
        v-model="search"
        @search="searchProducts"
        @create="openCreateForm"
    />

    <AppAlert
        v-if="error"
        type="error"
    >
      {{ error }}
    </AppAlert>

    <AppAlert
        v-if="successMessage"
        type="success"
    >
      {{ successMessage }}
    </AppAlert>

    <LoadingState
        v-if="loading"
        message="Cargando productos..."
    />

    <ProductTable
        v-else
        :products="products"
        :page="page"
        :total-pages="totalPages"
        @edit="openEditForm"
        @delete="removeProduct"
        @change-page="changePage"
    />

    <ProductModal
        v-if="showForm"
        :product="editingProduct"
        :form="form"
        :submitting="submitting"
        @update:form="form = $event"
        @save="saveProduct"
        @close="closeForm"
    />
  </main>
</template>

