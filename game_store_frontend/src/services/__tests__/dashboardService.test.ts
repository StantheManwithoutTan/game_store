import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getProducts } from '../productService'
import {
  getCriticalProducts,
  getStockHistory,
} from '../stockService'

vi.mock('../productService')
vi.mock('../stockService')

import { loadDashboardData } from '../dashboardService'

describe('loadDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('computes metrics and limits the recent movements', async () => {
    const products = [
      { id: 1, quantity: 5 },
      { id: 2, quantity: 3 },
    ]
    const critical = [{ id: 1 }]
    const movements = Array.from({ length: 15 }, (_, index) => ({
      id: index,
    }))

    vi.mocked(getProducts).mockResolvedValue({
      products: products as never,
      totalPages: 1,
    })
    vi.mocked(getCriticalProducts).mockResolvedValue(critical as never)
    vi.mocked(getStockHistory).mockResolvedValue(movements as never)

    const result = await loadDashboardData()

    expect(result.products).toEqual(products)
    expect(result.criticalProducts).toEqual(critical)
    expect(result.recentMovements).toHaveLength(10)
    expect(result.metrics).toEqual({
      totalProducts: 2,
      criticalProducts: 1,
      totalUnits: 8,
      totalMovements: 15,
    })
  })
})