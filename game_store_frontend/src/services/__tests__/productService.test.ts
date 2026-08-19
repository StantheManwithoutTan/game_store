import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiMock } from './apiMock'

import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
} from '../productService'

vi.mock('../api', () => ({
  default: apiMock,
}))

describe('productService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProducts', () => {
    it('returns products and parses the total pages header', async () => {
      const products = [
        {
          id: 1,
          name: 'Juego',
          sku: 'J-1',
          description: null,
          category: null,
          price: '100.00',
          quantity: 5,
          min_stock: 1,
          status: 'active',
          critico_stock: false,
        },
      ]

      apiMock.get.mockResolvedValue({
        data: products,
        headers: { 'x-total-pages': '3' },
      })

      const result = await getProducts({ page: 1, search: 'juego' })

      expect(result.products).toEqual(products)
      expect(result.totalPages).toBe(3)
      expect(apiMock.get).toHaveBeenCalledWith('/api/products', {
        params: { page: 1, search: 'juego' },
      })
    })

    it('strips empty filter values', async () => {
      apiMock.get.mockResolvedValue({
        data: [],
        headers: {},
      })

      await getProducts({ search: '', status: 'active' })

      expect(apiMock.get).toHaveBeenCalledWith('/api/products', {
        params: { status: 'active' },
      })
    })

    it('falls back to 1 page when the header is missing or invalid', async () => {
      apiMock.get.mockResolvedValue({ data: [], headers: {} })

      expect((await getProducts()).totalPages).toBe(1)
    })
  })

  describe('getProductById', () => {
    it('returns the requested product', async () => {
      const product = { id: 2, name: 'Consola' }
      apiMock.get.mockResolvedValue({ data: product })

      await expect(getProductById(2)).resolves.toEqual(product)
      expect(apiMock.get).toHaveBeenCalledWith('/api/products/2')
    })
  })

  describe('createProduct', () => {
    it('posts the product and returns it', async () => {
      const form = { name: 'Nuevo' }
      apiMock.post.mockResolvedValue({ data: form })

      await expect(createProduct(form)).resolves.toEqual(form)
      expect(apiMock.post).toHaveBeenCalledWith('/api/products', form)
    })
  })

  describe('updateProduct', () => {
    it('puts the product and returns it', async () => {
      const form = { name: 'Actualizado' }
      apiMock.put.mockResolvedValue({ data: form })

      await expect(updateProduct(9, form)).resolves.toEqual(form)
      expect(apiMock.put).toHaveBeenCalledWith('/api/products/9', form)
    })
  })

  describe('deleteProduct', () => {
    it('deletes the product', async () => {
      apiMock.delete.mockResolvedValue({})

      await deleteProduct(4)

      expect(apiMock.delete).toHaveBeenCalledWith('/api/products/4')
    })
  })
})