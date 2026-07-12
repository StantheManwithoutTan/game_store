import api from './api'
import type { Product, ProductFilters } from '../types/product'

function removeEmptyFilters(filters: ProductFilters): ProductFilters {
    return Object.fromEntries(
        Object.entries(filters).filter(
            ([, value]) => value !== undefined && value !== null && value !== '',
        ),
    ) as ProductFilters
}

export async function getProducts(
    filters: ProductFilters = {},
): Promise<Product[]> {
    const response = await api.get<Product[]>('/api/products', {
        params: removeEmptyFilters(filters),
    })

    return response.data
}

export async function getProductById(id: number): Promise<Product> {
    const response = await api.get<Product>(`/api/products/${id}`)
    return response.data
}