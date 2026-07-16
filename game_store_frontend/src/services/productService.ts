import api from './api'

import type {
    Product,
    ProductFilters,
    ProductFormData,
    ProductListResult,
} from '../types/product'

function removeEmptyFilters(
    filters: ProductFilters,
): ProductFilters {
    return Object.fromEntries(
        Object.entries(filters).filter(
            ([, value]) =>
                value !== undefined &&
                value !== null &&
                value !== '',
        ),
    ) as ProductFilters
}

export async function getProducts(
    filters: ProductFilters = {},
): Promise<ProductListResult> {
    const response = await api.get<Product[]>('/api/products', {
        params: removeEmptyFilters(filters),
    })

    const totalPagesHeader =
        response.headers['x-total-pages']

    const totalPages = Number.parseInt(
        totalPagesHeader ?? '1',
        10,
    )

    return {
        products: response.data,
        totalPages:
            Number.isNaN(totalPages) || totalPages < 1
                ? 1
                : totalPages,
    }
}

export async function getProductById(
    id: number,
): Promise<Product> {
    const response = await api.get<Product>(
        `/api/products/${id}`,
    )

    return response.data
}

export async function createProduct(
    product: ProductFormData,
): Promise<Product> {
    const response = await api.post<Product>(
        '/api/products',
        product,
    )

    return response.data
}

export async function updateProduct(
    id: number,
    product: ProductFormData,
): Promise<Product> {
    const response = await api.put<Product>(
        `/api/products/${id}`,
        product,
    )

    return response.data
}

export async function deleteProduct(
    id: number,
): Promise<void> {
    await api.delete(`/api/products/${id}`)
}