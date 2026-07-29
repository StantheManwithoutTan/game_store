import type { Product } from './product'
import type { StockMovement } from './stock'

export interface DashboardMetrics {
    totalProducts: number
    criticalProducts: number
    totalUnits: number
    totalMovements: number
}

export interface DashboardData {
    products: Product[]
    criticalProducts: Product[]
    recentMovements: StockMovement[]
    metrics: DashboardMetrics
}