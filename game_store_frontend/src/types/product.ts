export interface Product {
    id: number
    name: string
    sku: string
    description: string | null
    category: string | null
    price: string
    quantity: number
    min_stock: number
    status: string
    critico_stock: boolean
}

export interface ProductFilters {
    page?: number
    per_page?: number
    search?: string
    category?: string
    status?: string
}