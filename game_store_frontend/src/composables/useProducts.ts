import { onMounted, ref } from 'vue'

import {
    createProduct,
    deleteProduct as deleteProductRequest,
    getProducts,
    updateProduct,
} from '../services/productService'

import {
    createEmptyProductForm,
    productToFormData,
} from '../types/product'

import { getApiErrorInformation } from '../utils/errors'

import type {
    Product,
    ProductFormData,
} from '../types/product'

const PRODUCTS_PER_PAGE = 10

export function useProducts() {
    const products = ref<Product[]>([])

    const search = ref('')
    const page = ref(1)
    const totalPages = ref(1)

    const loading = ref(false)
    const submitting = ref(false)

    const error = ref('')
    const successMessage = ref('')

    const showForm = ref(false)
    const editingProduct = ref<Product | null>(null)

    const form = ref<ProductFormData>(
        createEmptyProductForm(),
    )

    function clearMessages(): void {
        error.value = ''
        successMessage.value = ''
    }

    async function fetchProducts(): Promise<void> {
        loading.value = true
        error.value = ''

        try {
            const result = await getProducts({
                page: page.value,
                per_page: PRODUCTS_PER_PAGE,
                search: search.value || undefined,
            })

            products.value = result.products
            totalPages.value = result.totalPages
        } catch (exception: unknown) {
            const information = getApiErrorInformation(
                exception,
                'No fue posible cargar los productos.',
            )

            error.value = information.message
        } finally {
            loading.value = false
        }
    }

    async function searchProducts(): Promise<void> {
        page.value = 1
        await fetchProducts()
    }

    async function changePage(
        newPage: number,
    ): Promise<void> {
        if (
            newPage < 1 ||
            newPage > totalPages.value ||
            newPage === page.value
        ) {
            return
        }

        page.value = newPage
        await fetchProducts()
    }

    function openCreateForm(): void {
        clearMessages()

        editingProduct.value = null
        form.value = createEmptyProductForm()
        showForm.value = true
    }

    function openEditForm(product: Product): void {
        clearMessages()

        editingProduct.value = product
        form.value = productToFormData(product)
        showForm.value = true
    }

    function closeForm(): void {
        showForm.value = false
        editingProduct.value = null
        form.value = createEmptyProductForm()
    }

    async function saveProduct(): Promise<void> {
        submitting.value = true
        clearMessages()

        try {
            if (editingProduct.value) {
                await updateProduct(
                    editingProduct.value.id,
                    form.value,
                )

                successMessage.value =
                    'Producto actualizado correctamente.'
            } else {
                await createProduct(form.value)

                successMessage.value =
                    'Producto creado correctamente.'
            }

            closeForm()
            await fetchProducts()
        } catch (exception: unknown) {
            const information = getApiErrorInformation(
                exception,
                'No fue posible guardar el producto.',
            )

            if (information.status === 403) {
                error.value =
                    'No tienes permiso para realizar esta acción.'
            } else {
                error.value = information.message
            }
        } finally {
            submitting.value = false
        }
    }

    async function removeProduct(
        product: Product,
    ): Promise<void> {
        const confirmed = window.confirm(
            `¿Deseas eliminar el producto "${product.name}"?`,
        )

        if (!confirmed) {
            return
        }

        clearMessages()

        try {
            await deleteProductRequest(product.id)

            successMessage.value =
                'Producto eliminado correctamente.'

            if (
                products.value.length === 1 &&
                page.value > 1
            ) {
                page.value -= 1
            }

            await fetchProducts()
        } catch (exception: unknown) {
            const information = getApiErrorInformation(
                exception,
                'No fue posible eliminar el producto.',
            )

            if (information.status === 403) {
                error.value =
                    'No tienes permiso para eliminar productos.'
            } else {
                error.value = information.message
            }
        }
    }

    onMounted(fetchProducts)

    return {
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

        fetchProducts,
        searchProducts,
        changePage,

        openCreateForm,
        openEditForm,
        closeForm,

        saveProduct,
        removeProduct,
    }
}