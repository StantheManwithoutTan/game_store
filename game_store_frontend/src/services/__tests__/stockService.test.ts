import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiMock } from './apiMock'

import {
  getCriticalProducts,
  getStockHistory,
  registerStockAdjustment,
  registerStockEntry,
  registerStockExit,
} from '../stockService'

vi.mock('../api', () => ({
  default: apiMock,
}))

describe('stockService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('registerStockEntry', () => {
    it('posts an entry movement', async () => {
      const payload = { product_id: 1, amount: 5 }
      const movement = { id: 1, ...payload }
      apiMock.post.mockResolvedValue({ data: movement })

      await expect(registerStockEntry(payload)).resolves.toEqual(movement)
      expect(apiMock.post).toHaveBeenCalledWith('/api/stocks/entrada', payload)
    })
  })

  describe('registerStockExit', () => {
    it('posts an exit movement', async () => {
      const payload = { product_id: 1, amount: 2, motive: 'Venta' }
      const movement = { id: 2, ...payload }
      apiMock.post.mockResolvedValue({ data: movement })

      await expect(registerStockExit(payload)).resolves.toEqual(movement)
      expect(apiMock.post).toHaveBeenCalledWith('/api/stocks/salida', payload)
    })
  })

  describe('registerStockAdjustment', () => {
    it('posts an adjustment movement', async () => {
      const payload = { product_id: 1, stock_after: 8 }
      const movement = { id: 3, ...payload }
      apiMock.post.mockResolvedValue({ data: movement })

      await expect(registerStockAdjustment(payload)).resolves.toEqual(movement)
      expect(apiMock.post).toHaveBeenCalledWith('/api/stocks/ajuste', payload)
    })
  })

  describe('getStockHistory', () => {
    it('fetches history passing the cleaned filters', async () => {
      const movements = [{ id: 1 }, { id: 2 }]
      apiMock.get.mockResolvedValue({ data: movements })

      const result = await getStockHistory({
        product_id: 1,
        fecha_desde: '',
      })

      expect(result).toEqual(movements)
      expect(apiMock.get).toHaveBeenCalledWith('/api/stocks/historial', {
        params: { product_id: 1 },
      })
    })

    it('passes the API call without params when there are no filters', async () => {
      apiMock.get.mockResolvedValue({ data: [] })

      await getStockHistory()

      expect(apiMock.get).toHaveBeenCalledWith('/api/stocks/historial', {
        params: {},
      })
    })
  })

  describe('getCriticalProducts', () => {
    it('fetches the critical products', async () => {
      const products = [{ id: 1 }]
      apiMock.get.mockResolvedValue({ data: products })

      await expect(getCriticalProducts()).resolves.toEqual(products)
      expect(apiMock.get).toHaveBeenCalledWith('/api/stocks/criticos')
    })
  })
})