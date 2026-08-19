import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import axios from 'axios'

vi.mock('../../services/productService', () => ({
  getProducts: vi.fn(),
  getProductById: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}))
vi.mock('../../services/stockService', () => ({
  getCriticalProducts: vi.fn(),
  getStockHistory: vi.fn(),
  registerStockAdjustment: vi.fn(),
  registerStockEntry: vi.fn(),
  registerStockExit: vi.fn(),
}))
vi.mock('axios')

import { getProducts } from '../../services/productService'
import {
  getCriticalProducts,
  getStockHistory,
  registerStockAdjustment,
  registerStockEntry,
  registerStockExit,
} from '../../services/stockService'
import { useStock } from '../useStock'

import type { Product } from '../../types/product'

const product: Product = {
  id: 7,
  name: 'Control',
  sku: 'CTL-1',
  description: null,
  category: null,
  price: '50.00',
  quantity: 10,
  min_stock: 2,
  status: 'active',
  critico_stock: false,
}

function mountComposable() {
  const wrapper = mount(
    defineComponent({
      setup() {
        return { composable: useStock() }
      },
      template: '<div />',
    }),
  )

  return wrapper.vm.composable as ReturnType<typeof useStock>
}

describe('useStock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.isAxiosError).mockReturnValue(false)

    vi.mocked(getProducts).mockResolvedValue({
      products: [product],
      totalPages: 1,
    })
    vi.mocked(getCriticalProducts).mockResolvedValue([product])
    vi.mocked(getStockHistory).mockResolvedValue([
      {
        id: 1,
        product_id: 7,
        usuario: null,
        type_movement: 'entrada',
        amount: 5,
        stock_before: 5,
        stock_after: 10,
        motive: null,
        created_at: '2026-01-01T10:00:00Z',
      },
    ])
  })

  it('loads all data on mount and preselects the first product', async () => {
    const composable = mountComposable()
    await flushPromises()

    expect(composable.products.value).toEqual([product])
    expect(composable.criticalProducts.value).toEqual([product])
    expect(composable.movements.value).toHaveLength(1)
    expect(composable.form.value.productId).toBe(7)
    expect(composable.productNames.value[7]).toBe('Control')
    expect(composable.selectedProduct.value?.id).toBe(7)
    expect(composable.valueLabel.value).toBe('Cantidad')
    expect(composable.loading.value).toBe(false)
  })

  it('sets a permission error when loading fails with 403', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    vi.mocked(getProducts).mockRejectedValue({
      response: { status: 403, data: { message: 'Forbidden' } },
    })

    const composable = mountComposable()
    await flushPromises()

    expect(composable.error.value).toBe(
      'No tienes permiso para consultar la información de stock.',
    )
  })

  it('sets a fallback error when loading fails', async () => {
    vi.mocked(getProducts).mockRejectedValue(new Error('boom'))

    const composable = mountComposable()
    await flushPromises()

    expect(composable.error.value).toBe(
      'No fue posible cargar la información de inventario.',
    )
  })

  it('valueLabel changes for adjustments', async () => {
    const composable = mountComposable()
    await flushPromises()

    composable.form.value.type = 'ajuste'

    expect(composable.valueLabel.value).toBe(
      'Nueva cantidad de stock',
    )
  })

  it('validateMovement rejects a missing product', async () => {
    const composable = mountComposable()
    await flushPromises()

    composable.form.value.productId = 0

    await composable.submitMovement()

    expect(composable.error.value).toBe('Selecciona un producto.')
    expect(registerStockEntry).not.toHaveBeenCalled()
  })

  it('validateMovement rejects negative values', async () => {
    const composable = mountComposable()
    await flushPromises()

    composable.form.value.value = -1

    await composable.submitMovement()

    expect(composable.error.value).toBe(
      'La cantidad no puede ser negativa.',
    )
  })

  it('validateMovement rejects zero for entries and exits', async () => {
    const composable = mountComposable()
    await flushPromises()

    composable.form.value.value = 0

    await composable.submitMovement()

    expect(composable.error.value).toBe(
      'La cantidad de una entrada o salida debe ser mayor que cero.',
    )
  })

  it('submitMovement registers an entry', async () => {
    vi.mocked(registerStockEntry).mockResolvedValue({
      id: 1,
      product_id: 7,
      usuario: null,
      type_movement: 'entrada',
      amount: 1,
      stock_before: 10,
      stock_after: 11,
      motive: null,
      created_at: '2026-01-01T10:00:00Z',
    })

    const composable = mountComposable()
    await flushPromises()

    await composable.submitMovement()

    expect(registerStockEntry).toHaveBeenCalledWith({
      product_id: 7,
      amount: 1,
      motive: undefined,
    })
    expect(composable.successMessage.value).toBe(
      'El movimiento de stock fue registrado correctamente.',
    )
    expect(composable.form.value.value).toBe(1)
  })

  it('submitMovement registers an exit', async () => {
    vi.mocked(registerStockExit).mockResolvedValue({
      id: 2,
      product_id: 7,
      usuario: null,
      type_movement: 'salida',
      amount: 3,
      stock_before: 10,
      stock_after: 7,
      motive: 'Venta',
      created_at: '2026-01-01T10:00:00Z',
    })

    const composable = mountComposable()
    await flushPromises()

    composable.form.value.type = 'salida'
    composable.form.value.value = 3
    composable.form.value.motive = 'Venta'

    await composable.submitMovement()

    expect(registerStockExit).toHaveBeenCalledWith({
      product_id: 7,
      amount: 3,
      motive: 'Venta',
    })
  })

  it('submitMovement registers an adjustment', async () => {
    vi.mocked(registerStockAdjustment).mockResolvedValue({
      id: 3,
      product_id: 7,
      usuario: null,
      type_movement: 'ajuste',
      amount: 0,
      stock_before: 7,
      stock_after: 4,
      motive: null,
      created_at: '2026-01-01T10:00:00Z',
    })

    const composable = mountComposable()
    await flushPromises()

    composable.form.value.type = 'ajuste'
    composable.form.value.value = 4

    await composable.submitMovement()

    expect(registerStockAdjustment).toHaveBeenCalledWith({
      product_id: 7,
      stock_after: 4,
      motive: undefined,
    })
    expect(composable.form.value.value).toBe(0)
  })

  it('submitMovement shows the permission error for a 403', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    vi.mocked(registerStockEntry).mockRejectedValue({
      response: { status: 403, data: { message: 'Forbidden' } },
    })

    const composable = mountComposable()
    await flushPromises()

    await composable.submitMovement()

    expect(composable.error.value).toBe(
      'No tienes permiso para registrar movimientos de stock.',
    )
  })

  it('submitMovement shows the backend message for other errors', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    vi.mocked(registerStockEntry).mockRejectedValue({
      response: { status: 422, data: { message: 'Stock insuficiente' } },
    })

    const composable = mountComposable()
    await flushPromises()

    await composable.submitMovement()

    expect(composable.error.value).toBe('Stock insuficiente')
  })

  it('applyFilters reloads the history', async () => {
    const composable = mountComposable()
    await flushPromises()

    composable.filters.value.product_id = 7
    await composable.applyFilters()

    expect(getStockHistory).toHaveBeenCalledWith({
      product_id: 7,
      fecha_desde: '',
      fecha_hasta: '',
    })
  })

  it('applyFilters shows an error when filtering fails', async () => {
    vi.mocked(getStockHistory).mockRejectedValue(new Error('boom'))

    const composable = mountComposable()
    await flushPromises()

    await composable.applyFilters()

    expect(composable.error.value).toBe(
      'No fue posible filtrar el historial.',
    )
  })

  it('clearFilters resets the filters and reloads', async () => {
    const composable = mountComposable()
    await flushPromises()

    composable.filters.value.product_id = 7
    await composable.clearFilters()

    expect(composable.filters.value.product_id).toBeUndefined()
    expect(getStockHistory).toHaveBeenCalledTimes(2)
  })
})