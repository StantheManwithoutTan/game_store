import type { Product } from '../types/product'

export type StockLevelClass =
    | 'level-danger'
    | 'level-warning'
    | 'level-ok'

export function getStockLevelClass(
    product: Product,
): StockLevelClass {
    if (product.critico_stock) {
        return 'level-danger'
    }

    if (product.quantity <= product.min_stock * 2) {
        return 'level-warning'
    }

    return 'level-ok'
}

export function getStockStatusLabel(
    product: Product,
): string {
    if (product.critico_stock) {
        return 'Crítico'
    }

    if (product.quantity <= product.min_stock * 2) {
        return 'Bajo'
    }

    return 'Disponible'
}

export function getStockStatusClass(
    product: Product,
): string {
    if (product.critico_stock) {
        return 'status-critical'
    }

    if (product.quantity <= product.min_stock * 2) {
        return 'status-warning'
    }

    return 'status-available'
}