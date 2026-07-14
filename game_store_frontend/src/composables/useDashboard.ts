import { computed, onMounted, ref } from 'vue'

import { loadDashboardData } from '../services/dashboardService'
import { getApiErrorInformation } from '../utils/errors'

import type { DashboardMetrics } from '../types/dashboard'
import type { Product } from '../types/product'
import type { StockMovement } from '../types/stock'

export function useDashboard() {
    const products = ref<Product[]>([])
    const criticalProducts = ref<Product[]>([])
    const recentMovements = ref<StockMovement[]>([])

    const metrics = ref<DashboardMetrics>({
        totalProducts: 0,
        criticalProducts: 0,
        totalUnits: 0,
        totalMovements: 0,
    })

    const loading = ref(false)
    const error = ref('')

    const productNames = computed<Record<number, string>>(
        () =>
            Object.fromEntries(
                products.value.map((product) => [
                    product.id,
                    product.name,
                ]),
            ),
    )

    async function fetchDashboard(): Promise<void> {
        loading.value = true
        error.value = ''

        try {
            const data = await loadDashboardData()

            products.value = data.products
            criticalProducts.value =
                data.criticalProducts
            recentMovements.value =
                data.recentMovements
            metrics.value = data.metrics
        } catch (exception: unknown) {
            const information = getApiErrorInformation(
                exception,
                'No fue posible cargar el dashboard.',
            )

            if (information.status === 403) {
                error.value =
                    'No tienes permiso para consultar el dashboard.'
            } else {
                error.value = information.message
            }
        } finally {
            loading.value = false
        }
    }

    onMounted(fetchDashboard)

    return {
        products,
        criticalProducts,
        recentMovements,
        metrics,

        productNames,

        loading,
        error,

        fetchDashboard,
    }
}