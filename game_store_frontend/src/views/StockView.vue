<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getProducts } from '../services/productService'
import {
  getCriticalProducts,
  getStockHistory,
  registerStockAdjustment,
  registerStockEntry,
  registerStockExit,
} from '../services/stockService'

import type { Product } from '../types/product'
import type {
  StockHistoryFilters,
  StockMovement,
  StockMovementType,
} from '../types/stock'

interface MovementForm {
  productId: number
  type: StockMovementType
  value: number
  motive: string
}

const products = ref<Product[]>([])
const criticalProducts = ref<Product[]>([])
const movements = ref<StockMovement[]>([])

const loading = ref(false)
const submitting = ref(false)

const error = ref('')
const successMessage = ref('')

const filters = ref<StockHistoryFilters>({
  product_id: undefined,
  fecha_desde: '',
  fecha_hasta: '',
})

const form = ref<MovementForm>({
  productId: 0,
  type: 'entrada',
  value: 1,
  motive: '',
})

const productNames = computed<Record<number, string>>(() =>
    Object.fromEntries(
        products.value.map((product) => [product.id, product.name]),
    ),
)

const selectedProduct = computed(() =>
    products.value.find(
        (product) => product.id === form.value.productId,
    ),
)

const valueLabel = computed(() =>
    form.value.type === 'ajuste'
        ? 'Nueva cantidad de stock'
        : 'Cantidad',
)

function getErrorInformation(exception: unknown): {
  status?: number
  message?: string
} {
  const errorResponse = exception as {
    response?: {
      status?: number
      data?: {
        message?: string
      }
    }
  }

  return {
    status: errorResponse.response?.status,
    message: errorResponse.response?.data?.message,
  }
}

function clearMessages() {
  error.value = ''
  successMessage.value = ''
}

function stockLevelClass(product: Product): string {
  if (product.critico_stock) {
    return 'level-danger'
  }

  if (product.quantity <= product.min_stock * 2) {
    return 'level-warning'
  }

  return 'level-ok'
}

function movementClass(type: string): string {
  const normalizedType = type.toLowerCase()

  if (normalizedType === 'entrada') {
    return 'movement-entry'
  }

  if (normalizedType === 'salida') {
    return 'movement-exit'
  }

  return 'movement-adjustment'
}

function movementLabel(type: string): string {
  const normalizedType = type.toLowerCase()

  if (normalizedType === 'entrada') {
    return 'Entrada'
  }

  if (normalizedType === 'salida') {
    return 'Salida'
  }

  return 'Ajuste'
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es-DO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

async function loadProducts() {
  products.value = await getProducts({
    per_page: 100,
  })

  if (
      products.value.length > 0 &&
      form.value.productId === 0
  ) {
    form.value.productId = products.value[0]?.id ?? 0
  }
}

async function loadCriticalProducts() {
  criticalProducts.value = await getCriticalProducts()
}

async function loadHistory() {
  movements.value = await getStockHistory(filters.value)
}

async function loadPageData() {
  loading.value = true
  clearMessages()

  try {
    await Promise.all([
      loadProducts(),
      loadCriticalProducts(),
      loadHistory(),
    ])
  } catch (exception: unknown) {
    const information = getErrorInformation(exception)

    if (information.status === 403) {
      error.value =
          'No tienes permiso para consultar la información de stock.'
    } else {
      error.value =
          information.message ??
          'No fue posible cargar la información de inventario.'
    }
  } finally {
    loading.value = false
  }
}

async function submitMovement() {
  clearMessages()

  if (!form.value.productId) {
    error.value = 'Selecciona un producto.'
    return
  }

  if (form.value.value < 0) {
    error.value = 'La cantidad no puede ser negativa.'
    return
  }

  if (
      form.value.type !== 'ajuste' &&
      form.value.value < 1
  ) {
    error.value =
        'La cantidad de una entrada o salida debe ser mayor que cero.'
    return
  }

  submitting.value = true

  try {
    const motive = form.value.motive.trim() || undefined

    if (form.value.type === 'entrada') {
      await registerStockEntry({
        product_id: form.value.productId,
        amount: form.value.value,
        motive,
      })
    } else if (form.value.type === 'salida') {
      await registerStockExit({
        product_id: form.value.productId,
        amount: form.value.value,
        motive,
      })
    } else {
      await registerStockAdjustment({
        product_id: form.value.productId,
        stock_after: form.value.value,
        motive,
      })
    }

    successMessage.value =
        'El movimiento de stock fue registrado correctamente.'

    form.value.value =
        form.value.type === 'ajuste' ? 0 : 1

    form.value.motive = ''

    await Promise.all([
      loadProducts(),
      loadCriticalProducts(),
      loadHistory(),
    ])
  } catch (exception: unknown) {
    const information = getErrorInformation(exception)

    if (information.status === 403) {
      error.value =
          'No tienes permiso para registrar movimientos de stock.'
    } else {
      error.value =
          information.message ??
          'No fue posible registrar el movimiento.'
    }
  } finally {
    submitting.value = false
  }
}

async function applyFilters() {
  clearMessages()

  try {
    await loadHistory()
  } catch (exception: unknown) {
    const information = getErrorInformation(exception)

    error.value =
        information.message ??
        'No fue posible filtrar el historial.'
  }
}

async function clearFilters() {
  filters.value = {
    product_id: undefined,
    fecha_desde: '',
    fecha_hasta: '',
  }

  await applyFilters()
}

onMounted(loadPageData)
</script>

<template>
  <main class="stock-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Inventario</p>
        <h1>Control de stock</h1>
        <p class="page-description">
          Registra entradas, salidas y ajustes, y consulta el
          historial de movimientos.
        </p>
      </div>

      <RouterLink
          class="back-link"
          to="/dashboard"
          aria-label="Volver al dashboard"
      >
        Volver al dashboard
      </RouterLink>
    </header>

    <div
        v-if="error"
        class="alert alert-error"
        role="alert"
    >
      {{ error }}
    </div>

    <div
        v-if="successMessage"
        class="alert alert-success"
        role="status"
    >
      {{ successMessage }}
    </div>

    <div
        v-if="loading"
        class="loading-state"
        role="status"
    >
      Cargando información de inventario...
    </div>

    <template v-else>
      <section class="inventory-grid">
        <article class="panel">
          <div class="panel-header">
            <div>
              <p class="panel-label">Nuevo movimiento</p>
              <h2>Registrar operación</h2>
            </div>
          </div>

          <form
              class="movement-form"
              @submit.prevent="submitMovement"
          >
            <div class="form-group">
              <label for="movement-product">
                Producto
              </label>

              <select
                  id="movement-product"
                  v-model.number="form.productId"
                  required
              >
                <option
                    disabled
                    :value="0"
                >
                  Selecciona un producto
                </option>

                <option
                    v-for="product in products"
                    :key="product.id"
                    :value="product.id"
                >
                  {{ product.name }} — {{ product.sku }}
                </option>
              </select>
            </div>

            <fieldset class="movement-types">
              <legend>Tipo de movimiento</legend>

              <label class="radio-option">
                <input
                    v-model="form.type"
                    type="radio"
                    value="entrada"
                >
                Entrada
              </label>

              <label class="radio-option">
                <input
                    v-model="form.type"
                    type="radio"
                    value="salida"
                >
                Salida
              </label>

              <label class="radio-option">
                <input
                    v-model="form.type"
                    type="radio"
                    value="ajuste"
                >
                Ajuste
              </label>
            </fieldset>

            <div
                v-if="selectedProduct"
                class="selected-product"
            >
              <span>Stock actual</span>
              <strong>
                {{ selectedProduct.quantity }}
              </strong>

              <span>Stock mínimo</span>
              <strong>
                {{ selectedProduct.min_stock }}
              </strong>
            </div>

            <div class="form-group">
              <label for="movement-value">
                {{ valueLabel }}
              </label>

              <input
                  id="movement-value"
                  v-model.number="form.value"
                  type="number"
                  :min="form.type === 'ajuste' ? 0 : 1"
                  required
              >
            </div>

            <div class="form-group">
              <label for="movement-motive">
                Motivo
              </label>

              <textarea
                  id="movement-motive"
                  v-model="form.motive"
                  rows="3"
                  placeholder="Ejemplo: reposición del proveedor"
              />
            </div>

            <button
                class="primary-button"
                type="submit"
                :disabled="submitting || products.length === 0"
            >
              {{
                submitting
                    ? 'Registrando...'
                    : 'Registrar movimiento'
              }}
            </button>
          </form>
        </article>

        <article class="panel critical-panel">
          <div class="panel-header">
            <div>
              <p class="panel-label">Atención requerida</p>
              <h2>Productos críticos</h2>
            </div>

            <span class="critical-counter">
              {{ criticalProducts.length }}
            </span>
          </div>

          <div
              v-if="criticalProducts.length === 0"
              class="empty-state"
          >
            No hay productos con stock crítico.
          </div>

          <ul
              v-else
              class="critical-list"
          >
            <li
                v-for="product in criticalProducts"
                :key="product.id"
                class="critical-item"
            >
              <div>
                <strong>{{ product.name }}</strong>
                <span>{{ product.sku }}</span>
              </div>

              <div class="critical-stock">
                <span>{{ product.quantity }}</span>
                <small>
                  mínimo {{ product.min_stock }}
                </small>
              </div>
            </li>
          </ul>
        </article>
      </section>

      <section class="panel stock-summary">
        <div class="panel-header">
          <div>
            <p class="panel-label">Disponibilidad</p>
            <h2>Estado actual de productos</h2>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col">SKU</th>
              <th scope="col">Cantidad</th>
              <th scope="col">Stock mínimo</th>
              <th scope="col">Estado</th>
            </tr>
            </thead>

            <tbody>
            <tr
                v-for="product in products"
                :key="product.id"
                :class="stockLevelClass(product)"
            >
              <td>{{ product.name }}</td>
              <td>{{ product.sku }}</td>
              <td>{{ product.quantity }}</td>
              <td>{{ product.min_stock }}</td>
              <td>
                  <span
                      class="status-badge"
                      :class="{
                      critical: product.critico_stock,
                    }"
                  >
                    {{
                      product.critico_stock
                          ? 'Crítico'
                          : 'Disponible'
                    }}
                  </span>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel history-panel">
        <div class="panel-header">
          <div>
            <p class="panel-label">Trazabilidad</p>
            <h2>Historial de movimientos</h2>
          </div>
        </div>

        <form
            class="filter-form"
            @submit.prevent="applyFilters"
        >
          <div class="form-group">
            <label for="history-product">
              Producto
            </label>

            <select
                id="history-product"
                v-model.number="filters.product_id"
            >
              <option :value="undefined">
                Todos
              </option>

              <option
                  v-for="product in products"
                  :key="product.id"
                  :value="product.id"
              >
                {{ product.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="date-from">
              Desde
            </label>

            <input
                id="date-from"
                v-model="filters.fecha_desde"
                type="date"
            >
          </div>

          <div class="form-group">
            <label for="date-to">
              Hasta
            </label>

            <input
                id="date-to"
                v-model="filters.fecha_hasta"
                type="date"
            >
          </div>

          <div class="filter-actions">
            <button
                class="secondary-button"
                type="submit"
            >
              Filtrar
            </button>

            <button
                class="text-button"
                type="button"
                @click="clearFilters"
            >
              Limpiar
            </button>
          </div>
        </form>

        <div
            v-if="movements.length === 0"
            class="empty-state"
        >
          No existen movimientos para los filtros seleccionados.
        </div>

        <div
            v-else
            class="table-container"
        >
          <table>
            <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Producto</th>
              <th scope="col">Tipo</th>
              <th scope="col">Cantidad</th>
              <th scope="col">Antes</th>
              <th scope="col">Después</th>
              <th scope="col">Usuario</th>
              <th scope="col">Motivo</th>
            </tr>
            </thead>

            <tbody>
            <tr
                v-for="movement in movements"
                :key="movement.id"
            >
              <td>{{ formatDate(movement.created_at) }}</td>

              <td>
                {{
                  productNames[movement.product_id] ??
                  `Producto #${movement.product_id}`
                }}
              </td>

              <td>
                  <span
                      class="movement-badge"
                      :class="
                      movementClass(movement.type_movement)
                    "
                  >
                    {{
                      movementLabel(
                          movement.type_movement,
                      )
                    }}
                  </span>
              </td>

              <td>{{ movement.amount }}</td>
              <td>{{ movement.stock_before }}</td>
              <td>{{ movement.stock_after }}</td>
              <td>{{ movement.usuario || 'Sistema' }}</td>
              <td>{{ movement.motive || 'Sin motivo' }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.stock-page {
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 32px;
}

.page-header,
.panel-header,
.selected-product,
.critical-item,
.filter-actions {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.page-header h1,
.panel-header h2 {
  margin: 0;
}

.eyebrow,
.panel-label {
  margin: 0 0 6px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.page-description {
  margin: 8px 0 0;
  color: #64748b;
}

.back-link {
  color: #334155;
  font-weight: 600;
  text-decoration: none;
}

.inventory-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}

.panel {
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 8px 30px rgb(15 23 42 / 6%);
}

.panel-header {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.movement-form,
.filter-form {
  display: grid;
  gap: 18px;
}

.form-group {
  display: grid;
  gap: 7px;
}

.form-group label,
.movement-types legend {
  font-weight: 600;
  color: #334155;
}

input,
select,
textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  font: inherit;
}

input:focus,
select:focus,
textarea:focus,
button:focus-visible,
a:focus-visible {
  outline: 3px solid rgb(59 130 246 / 25%);
  outline-offset: 2px;
}

textarea {
  resize: vertical;
}

.movement-types {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin: 0;
  padding: 0;
  border: 0;
}

.movement-types legend {
  width: 100%;
  margin-bottom: 7px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
}

.radio-option input {
  width: auto;
}

.selected-product {
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  background: #f8fafc;
}

.primary-button,
.secondary-button,
.text-button {
  min-height: 42px;
  padding: 10px 18px;
  border-radius: 8px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.primary-button {
  border: 0;
  background: #2563eb;
  color: #ffffff;
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.secondary-button {
  border: 0;
  background: #0f172a;
  color: #ffffff;
}

.text-button {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
}

.critical-counter {
  display: grid;
  min-width: 38px;
  min-height: 38px;
  place-items: center;
  border-radius: 999px;
  background: #fee2e2;
  color: #b91c1c;
  font-weight: 800;
}

.critical-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.critical-item {
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fff7f7;
}

.critical-item div:first-child,
.critical-stock {
  display: grid;
  gap: 3px;
}

.critical-item span,
.critical-stock small {
  color: #64748b;
}

.critical-stock {
  text-align: right;
}

.critical-stock span {
  color: #b91c1c;
  font-size: 1.2rem;
  font-weight: 800;
}

.stock-summary,
.history-panel {
  margin-top: 24px;
}

.filter-form {
  grid-template-columns:
    minmax(180px, 1fr)
    minmax(150px, 0.7fr)
    minmax(150px, 0.7fr)
    auto;
  align-items: end;
  margin-bottom: 22px;
}

.filter-actions {
  gap: 10px;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 13px 14px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  white-space: nowrap;
}

th {
  color: #475569;
  font-size: 0.82rem;
  text-transform: uppercase;
}

.level-danger {
  background: #fff1f2;
}

.level-warning {
  background: #fffbeb;
}

.level-ok {
  background: #f0fdf4;
}

.status-badge,
.movement-badge {
  display: inline-flex;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.status-badge {
  background: #dcfce7;
  color: #166534;
}

.status-badge.critical {
  background: #fee2e2;
  color: #991b1b;
}

.movement-entry {
  background: #dcfce7;
  color: #166534;
}

.movement-exit {
  background: #fee2e2;
  color: #991b1b;
}

.movement-adjustment {
  background: #dbeafe;
  color: #1d4ed8;
}

.alert,
.loading-state,
.empty-state {
  padding: 14px 16px;
  border-radius: 10px;
}

.alert {
  margin-bottom: 18px;
}

.alert-error {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.alert-success {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #166534;
}

.loading-state,
.empty-state {
  color: #64748b;
  text-align: center;
}

@media (max-width: 1024px) {
  .inventory-grid {
    grid-template-columns: 1fr;
  }

  .filter-form {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .stock-page {
    padding: 20px 14px;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .panel {
    padding: 18px;
  }

  .filter-form {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .selected-product {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>