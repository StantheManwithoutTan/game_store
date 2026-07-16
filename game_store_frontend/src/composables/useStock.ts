import {
    computed,
    onMounted,
    ref,
} from 'vue'

import { getProducts } from '../services/productService'

import {
    getCriticalProducts,
    getStockHistory,
    registerStockAdjustment,
    registerStockEntry,
    registerStockExit,
} from '../services/stockService'

import {
    createEmptyStockFilters,
    createEmptyStockMovementForm,
} from '../types/stock'

import { getApiErrorInformation } from '../utils/errors'

import type { Product } from '../types/product'

import type {
    StockHistoryFilters,
    StockMovement,
    StockMovementForm,
} from '../types/stock'

export function useStock() {
    const products = ref<Product[]>([])
    const criticalProducts = ref<Product[]>([])
    const movements = ref<StockMovement[]>([])

    const loading = ref(false)
    const submitting = ref(false)
    const filtering = ref(false)

    const error = ref('')
    const successMessage = ref('')

    const filters = ref<StockHistoryFilters>(
        createEmptyStockFilters(),
    )

    const form = ref<StockMovementForm>(
        createEmptyStockMovementForm(),
    )

    const productNames = computed<Record<number, string>>(
        () =>
            Object.fromEntries(
                products.value.map((product) => [
                    product.id,
                    product.name,
                ]),
            ),
    )

    const selectedProduct = computed<Product | undefined>(
        () =>
            products.value.find(
                (product) =>
                    product.id === form.value.productId,
            ),
    )

    const valueLabel = computed<string>(() =>
        form.value.type === 'ajuste'
            ? 'Nueva cantidad de stock'
            : 'Cantidad',
    )

    function clearMessages(): void {
        error.value = ''
        successMessage.value = ''
    }

    async function loadProducts(): Promise<void> {
        const result = await getProducts({
            page: 1,
            per_page: 100,
        })

        products.value = result.products

        if (
            products.value.length > 0 &&
            form.value.productId === 0
        ) {
            form.value.productId =
                products.value[0]?.id ?? 0
        }
    }

    async function loadCriticalProducts(): Promise<void> {
        criticalProducts.value =
            await getCriticalProducts()
    }

    async function loadHistory(): Promise<void> {
        movements.value = await getStockHistory(
            filters.value,
        )
    }

    async function loadPageData(): Promise<void> {
        loading.value = true
        clearMessages()

        try {
            await Promise.all([
                loadProducts(),
                loadCriticalProducts(),
                loadHistory(),
            ])
        } catch (exception: unknown) {
            const information = getApiErrorInformation(
                exception,
                'No fue posible cargar la información de inventario.',
            )

            if (information.status === 403) {
                error.value =
                    'No tienes permiso para consultar la información de stock.'
            } else {
                error.value = information.message
            }
        } finally {
            loading.value = false
        }
    }

    function validateMovement(): string | null {
        if (!form.value.productId) {
            return 'Selecciona un producto.'
        }

        if (form.value.value < 0) {
            return 'La cantidad no puede ser negativa.'
        }

        if (
            form.value.type !== 'ajuste' &&
            form.value.value < 1
        ) {
            return (
                'La cantidad de una entrada o salida ' +
                'debe ser mayor que cero.'
            )
        }

        return null
    }

    async function submitMovement(): Promise<void> {
        clearMessages()

        const validationError = validateMovement()

        if (validationError) {
            error.value = validationError
            return
        }

        submitting.value = true

        try {
            const motive =
                form.value.motive.trim() || undefined

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

            form.value = {
                ...form.value,
                value:
                    form.value.type === 'ajuste'
                        ? 0
                        : 1,
                motive: '',
            }

            await Promise.all([
                loadProducts(),
                loadCriticalProducts(),
                loadHistory(),
            ])
        } catch (exception: unknown) {
            const information = getApiErrorInformation(
                exception,
                'No fue posible registrar el movimiento.',
            )

            if (information.status === 403) {
                error.value =
                    'No tienes permiso para registrar movimientos de stock.'
            } else {
                error.value = information.message
            }
        } finally {
            submitting.value = false
        }
    }

    async function applyFilters(): Promise<void> {
        filtering.value = true
        clearMessages()

        try {
            await loadHistory()
        } catch (exception: unknown) {
            const information = getApiErrorInformation(
                exception,
                'No fue posible filtrar el historial.',
            )

            error.value = information.message
        } finally {
            filtering.value = false
        }
    }

    async function clearFilters(): Promise<void> {
        filters.value = createEmptyStockFilters()

        await applyFilters()
    }

    onMounted(loadPageData)

    return {
        products,
        criticalProducts,
        movements,

        loading,
        submitting,
        filtering,

        error,
        successMessage,

        filters,
        form,

        productNames,
        selectedProduct,
        valueLabel,

        loadPageData,
        submitMovement,
        applyFilters,
        clearFilters,
    }
}