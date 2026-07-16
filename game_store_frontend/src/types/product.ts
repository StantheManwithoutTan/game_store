export type ProductStatus =
    | 'active'
    | 'inactive'
    | 'discontinued'

export interface Product {
    id: number
    name: string
    sku: string
    description: string | null
    category: string | null
    price: string
    quantity: number
    min_stock: number
    status: ProductStatus
    critico_stock: boolean
}

export interface ProductFormData {
    name: string
    sku: string
    description: string
    category: string
    price: number
    quantity: number
    min_stock: number
    status: ProductStatus
    critico_stock: boolean
}

export interface ProductFilters {
    page?: number
    per_page?: number
    search?: string
    category?: string
    status?: ProductStatus
}

export interface ProductListResult {
    products: Product[]
    totalPages: number
}

export function createEmptyProductForm(): ProductFormData {
    return {
        name: '',
        sku: '',
        description: '',
        category: '',
        price: 0,
        quantity: 0,
        min_stock: 0,
        status: 'active',
        critico_stock: false,
    }
}

export function productToFormData(
    product: Product,
): ProductFormData {
    return {
        name: product.name,
        sku: product.sku,
        description: product.description ?? '',
        category: product.category ?? '',
        price: Number(product.price),
        quantity: product.quantity,
        min_stock: product.min_stock,
        status: product.status,
        critico_stock: product.critico_stock,
    }
}