<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useAuthStore } from '../stores/auth'
import { loadDashboardData } from '../services/dashboardService'

import type { Product } from '../types/product'
import type { StockMovement } from '../types/stock'

interface DashboardMetrics {
  totalProducts: number
  criticalProducts: number
  totalUnits: number
  totalMovements: number
}

const authStore = useAuthStore()

const loading = ref(false)
const error = ref('')

const products = ref<Product[]>([])
const criticalProducts = ref<Product[]>([])
const recentMovements = ref<StockMovement[]>([])

const metrics = ref<DashboardMetrics>({
  totalProducts: 0,
  criticalProducts: 0,
  totalUnits: 0,
  totalMovements: 0,
})

const productNames = computed<Record<number, string>>(() =>
    Object.fromEntries(
        products.value.map((product) => [product.id, product.name]),
    ),
)

async function handleLogout() {
  await authStore.logout()

  const keycloakUrl =
      import.meta.env.VITE_KEYCLOAK_URL ||
      'http://localhost:8080'

  const appUrl =
      import.meta.env.VITE_APP_URL ||
      'http://localhost:5173'

  const logoutUrl =
      `${keycloakUrl}/realms/game-store/protocol/openid-connect/logout` +
      '?client_id=game-store-client' +
      `&post_logout_redirect_uri=${encodeURIComponent(
          `${appUrl}/login`,
      )}`

  window.location.href = logoutUrl
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

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es-DO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

async function fetchDashboard() {
  loading.value = true
  error.value = ''

  try {
    const data = await loadDashboardData()

    products.value = data.products
    criticalProducts.value = data.criticalProducts
    recentMovements.value = data.recentMovements
    metrics.value = data.metrics
  } catch (exception: unknown) {
    const responseError = exception as {
      response?: {
        status?: number
        data?: {
          message?: string
        }
      }
    }

    if (responseError.response?.status === 403) {
      error.value =
          'No tienes permiso para consultar la información del dashboard.'
    } else {
      error.value =
          responseError.response?.data?.message ??
          'No fue posible cargar el dashboard.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboard)
</script>

<template>
  <main class="dashboard-page">
    <nav class="navbar">
      <div>
        <p class="navbar-label">Usuario activo</p>
        <strong class="user-name">
          {{
            authStore.user?.name ||
            authStore.user?.email ||
            'Usuario'
          }}
        </strong>
      </div>

      <button
          class="logout-button"
          type="button"
          @click="handleLogout"
      >
        Cerrar sesión
      </button>
    </nav>

    <header class="page-header">
      <div>
        <p class="eyebrow">Resumen operacional</p>
        <h1>Dashboard</h1>
        <p>
          Consulta el estado actual del inventario y los movimientos
          recientes.
        </p>
      </div>

      <div class="header-actions">
        <RouterLink
            class="secondary-link"
            to="/productos"
        >
          Gestionar productos
        </RouterLink>

        <RouterLink
            class="primary-link"
            to="/stock"
        >
          Controlar stock
        </RouterLink>
      </div>
    </header>

    <div
        v-if="error"
        class="alert alert-error"
        role="alert"
    >
      {{ error }}
    </div>

    <div
        v-if="loading"
        class="loading-state"
        role="status"
    >
      Cargando dashboard...
    </div>

    <template v-else>
      <section
          class="metrics-grid"
          aria-label="Métricas principales"
      >
        <article class="metric-card">
          <p>Total de productos</p>
          <strong>{{ metrics.totalProducts }}</strong>
          <span>Productos registrados</span>
        </article>

        <article class="metric-card critical">
          <p>Productos críticos</p>
          <strong>{{ metrics.criticalProducts }}</strong>
          <span>Requieren reposición</span>
        </article>

        <article class="metric-card">
          <p>Unidades disponibles</p>
          <strong>{{ metrics.totalUnits }}</strong>
          <span>Existencias acumuladas</span>
        </article>

        <article class="metric-card">
          <p>Movimientos</p>
          <strong>{{ metrics.totalMovements }}</strong>
          <span>Operaciones registradas</span>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="panel">
          <div class="panel-header">
            <div>
              <p class="panel-label">Atención requerida</p>
              <h2>Productos críticos</h2>
            </div>

            <RouterLink
                class="panel-link"
                to="/stock"
            >
              Ver stock
            </RouterLink>
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

              <div class="stock-value">
                <strong>{{ product.quantity }}</strong>
                <small>
                  mínimo {{ product.min_stock }}
                </small>
              </div>
            </li>
          </ul>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div>
              <p class="panel-label">Actividad reciente</p>
              <h2>Últimos movimientos</h2>
            </div>

            <RouterLink
                class="panel-link"
                to="/stock"
            >
              Ver historial
            </RouterLink>
          </div>

          <div
              v-if="recentMovements.length === 0"
              class="empty-state"
          >
            No existen movimientos registrados.
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
              </tr>
              </thead>

              <tbody>
              <tr
                  v-for="movement in recentMovements"
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
              </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
.dashboard-page {
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 32px;
}

.navbar,
.page-header,
.header-actions,
.panel-header,
.critical-item {
  display: flex;
  align-items: center;
}

.navbar {
  justify-content: space-between;
  gap: 20px;
  padding: 16px 20px;
  margin-bottom: 28px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 8px 30px rgb(15 23 42 / 5%);
}

.navbar-label {
  margin: 0 0 3px;
  color: #64748b;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.user-name {
  color: #0f172a;
}

.logout-button {
  padding: 9px 16px;
  border: 0;
  border-radius: 8px;
  background: #dc2626;
  color: #ffffff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.page-header {
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.page-header h1 {
  margin: 0;
}

.page-header p:last-child {
  margin: 8px 0 0;
  color: #64748b;
}

.eyebrow,
.panel-label {
  margin: 0 0 6px;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.header-actions {
  gap: 12px;
}

.primary-link,
.secondary-link {
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 700;
  text-decoration: none;
}

.primary-link {
  background: #2563eb;
  color: #ffffff;
}

.secondary-link {
  border: 1px solid #cbd5e1;
  color: #334155;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 24px;
}

.metric-card {
  display: grid;
  gap: 7px;
  padding: 22px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 8px 30px rgb(15 23 42 / 5%);
}

.metric-card p,
.metric-card span {
  margin: 0;
  color: #64748b;
}

.metric-card strong {
  color: #0f172a;
  font-size: 2rem;
}

.metric-card.critical {
  border-color: #fecaca;
  background: #fff7f7;
}

.metric-card.critical strong {
  color: #b91c1c;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.5fr);
  gap: 24px;
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
  margin-bottom: 20px;
}

.panel-header h2 {
  margin: 0;
}

.panel-link {
  color: #2563eb;
  font-weight: 700;
  text-decoration: none;
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
.stock-value {
  display: grid;
  gap: 3px;
}

.critical-item span,
.stock-value small {
  color: #64748b;
}

.stock-value {
  text-align: right;
}

.stock-value strong {
  color: #b91c1c;
  font-size: 1.2rem;
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
  font-size: 0.8rem;
  text-transform: uppercase;
}

.movement-badge {
  display: inline-flex;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
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

.loading-state,
.empty-state {
  color: #64748b;
  text-align: center;
}

button:focus-visible,
a:focus-visible {
  outline: 3px solid rgb(59 130 246 / 25%);
  outline-offset: 2px;
}

@media (max-width: 1024px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-page {
    padding: 20px 14px;
  }

  .page-header,
  .navbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
  }

  .primary-link,
  .secondary-link,
  .logout-button {
    text-align: center;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 18px;
  }
}
</style>