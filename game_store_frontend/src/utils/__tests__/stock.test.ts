import { describe, expect, it } from 'vitest'

import {
  getStockLevelClass,
  getStockStatusClass,
  getStockStatusLabel,
} from '../stock'

import type { Product } from '../../types/product'

function makeProduct(
  overrides: Partial<Product> = {},
): Product {
  return {
    id: 1,
    name: 'Producto',
    sku: 'SKU-1',
    description: null,
    category: null,
    price: '100.00',
    quantity: 20,
    min_stock: 5,
    status: 'active',
    critico_stock: false,
    ...overrides,
  }
}

describe('getStockLevelClass', () => {
  it('returns level-danger when product has critical stock', () => {
    const product = makeProduct({ critico_stock: true })
    expect(getStockLevelClass(product)).toBe('level-danger')
  })

  it('returns level-warning when quantity is at most twice the min stock', () => {
    const product = makeProduct({ quantity: 10, min_stock: 5 })
    expect(getStockLevelClass(product)).toBe('level-warning')
  })

  it('returns level-ok when quantity is above twice the min stock', () => {
    const product = makeProduct({ quantity: 30, min_stock: 5 })
    expect(getStockLevelClass(product)).toBe('level-ok')
  })
})

describe('getStockStatusLabel', () => {
  it('returns Cr\u00edtico for critical stock', () => {
    const product = makeProduct({ critico_stock: true })
    expect(getStockStatusLabel(product)).toBe('Cr\u00edtico')
  })

  it('returns Bajo when quantity is at most twice the min stock', () => {
    const product = makeProduct({ quantity: 10, min_stock: 5 })
    expect(getStockStatusLabel(product)).toBe('Bajo')
  })

  it('returns Disponible when stock is healthy', () => {
    const product = makeProduct({ quantity: 30, min_stock: 5 })
    expect(getStockStatusLabel(product)).toBe('Disponible')
  })
})

describe('getStockStatusClass', () => {
  it('returns status-critical for critical stock', () => {
    const product = makeProduct({ critico_stock: true })
    expect(getStockStatusClass(product)).toBe('status-critical')
  })

  it('returns status-warning for low stock', () => {
    const product = makeProduct({ quantity: 10, min_stock: 5 })
    expect(getStockStatusClass(product)).toBe('status-warning')
  })

  it('returns status-available for healthy stock', () => {
    const product = makeProduct({ quantity: 30, min_stock: 5 })
    expect(getStockStatusClass(product)).toBe('status-available')
  })
})