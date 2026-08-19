import { describe, expect, it } from 'vitest'

import {
  createEmptyProductForm,
  productToFormData,
} from '../product'

import type { Product } from '../product'

describe('createEmptyProductForm', () => {
  it('returns a blank product form', () => {
    expect(createEmptyProductForm()).toEqual({
      name: '',
      sku: '',
      description: '',
      category: '',
      price: 0,
      quantity: 0,
      min_stock: 0,
      status: 'active',
      critico_stock: false,
    })
  })
})

describe('productToFormData', () => {
  it('converts a product to form data', () => {
    const product: Product = {
      id: 7,
      name: 'Consola',
      sku: 'CON-1',
      description: 'Consola de videojuegos',
      category: 'Hardware',
      price: '1500.50',
      quantity: 12,
      min_stock: 3,
      status: 'active',
      critico_stock: false,
    }

    expect(productToFormData(product)).toEqual({
      name: 'Consola',
      sku: 'CON-1',
      description: 'Consola de videojuegos',
      category: 'Hardware',
      price: 1500.5,
      quantity: 12,
      min_stock: 3,
      status: 'active',
      critico_stock: false,
    })
  })

  it('falls back to empty strings for null description and category', () => {
    const product: Product = {
      id: 1,
      name: 'Juego',
      sku: 'J-1',
      description: null,
      category: null,
      price: '99.99',
      quantity: 5,
      min_stock: 1,
      status: 'inactive',
      critico_stock: true,
    }

    expect(productToFormData(product)).toMatchObject({
      description: '',
      category: '',
      status: 'inactive',
      critico_stock: true,
    })
  })
})