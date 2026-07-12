import { getProducts } from './productService'
import {
    getCriticalProducts,
    getStockHistory,
} from './stockService'

export async function loadDashboardData() {
    const [
        products,
        criticalProducts,
        movements,
    ] = await Promise.all([
        getProducts({ per_page: 100 }),
        getCriticalProducts(),
        getStockHistory(),
    ])

    return {
        products,
        criticalProducts,
        recentMovements: movements.slice(0, 10),
        metrics: {
            totalProducts: products.length,
            criticalProducts: criticalProducts.length,
            totalUnits: products.reduce(
                (sum, product) => sum + product.quantity,
                0,
            ),
            totalMovements: movements.length,
        },
    }
}