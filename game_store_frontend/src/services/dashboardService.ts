import { getProducts } from './productService'

import {
    getCriticalProducts,
    getStockHistory,
} from './stockService'

import type { DashboardData } from '../types/dashboard'

export async function loadDashboardData():
    Promise<DashboardData> {
    const [
        productResult,
        criticalProducts,
        movements,
    ] = await Promise.all([
        getProducts({
            page: 1,
            per_page: 100,
        }),
        getCriticalProducts(),
        getStockHistory(),
    ])

    const products = productResult.products
    const recentMovements = movements.slice(0, 10)

    return {
        products,
        criticalProducts,
        recentMovements,

        metrics: {
            totalProducts: products.length,
            criticalProducts: criticalProducts.length,

            totalUnits: products.reduce(
                (total, product) =>
                    total + product.quantity,
                0,
            ),

            totalMovements: movements.length,
        },
    }
}