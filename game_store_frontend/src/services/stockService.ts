import api from './api'
import type { Product } from '../types/product'
import type {
    StockAdjustmentRequest,
    StockEntryRequest,
    StockExitRequest,
    StockHistoryFilters,
    StockMovement,
} from '../types/stock'

function removeEmptyFilters(
    filters: StockHistoryFilters,
): StockHistoryFilters {
    return Object.fromEntries(
        Object.entries(filters).filter(
            ([, value]) => value !== undefined && value !== null && value !== '',
        ),
    ) as StockHistoryFilters
}

export async function registerStockEntry(
    payload: StockEntryRequest,
): Promise<StockMovement> {
    const response = await api.post<StockMovement>(
        '/api/stocks/entrada',
        payload,
    )

    return response.data
}

export async function registerStockExit(
    payload: StockExitRequest,
): Promise<StockMovement> {
    const response = await api.post<StockMovement>(
        '/api/stocks/salida',
        payload,
    )

    return response.data
}

export async function registerStockAdjustment(
    payload: StockAdjustmentRequest,
): Promise<StockMovement> {
    const response = await api.post<StockMovement>(
        '/api/stocks/ajuste',
        payload,
    )

    return response.data
}

export async function getStockHistory(
    filters: StockHistoryFilters = {},
): Promise<StockMovement[]> {
    const response = await api.get<StockMovement[]>(
        '/api/stocks/historial',
        {
            params: removeEmptyFilters(filters),
        },
    )

    return response.data
}

export async function getCriticalProducts(): Promise<Product[]> {
    const response = await api.get<Product[]>('/api/stocks/criticos')
    return response.data
}