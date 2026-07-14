export type StockMovementType = 'entrada' | 'salida' | 'ajuste'

export interface StockMovement {
    id: number
    product_id: number
    usuario: string | null
    type_movement: string
    amount: number
    stock_before: number
    stock_after: number
    motive: string | null
    created_at: string
}

export interface StockEntryRequest {
    product_id: number
    amount: number
    motive?: string
}

export interface StockExitRequest {
    product_id: number
    amount: number
    motive?: string
}

export interface StockAdjustmentRequest {
    product_id: number
    stock_after: number
    motive?: string
}

export interface StockHistoryFilters {
    product_id?: number
    fecha_desde?: string
    fecha_hasta?: string
}

export interface StockMovementForm {
    productId: number
    type: StockMovementType
    value: number
    motive: string
}

export function createEmptyStockMovementForm():
    StockMovementForm {
    return {
        productId: 0,
        type: 'entrada',
        value: 1,
        motive: '',
    }
}

export function createEmptyStockFilters():
    StockHistoryFilters {
    return {
        product_id: undefined,
        fecha_desde: '',
        fecha_hasta: '',
    }
}