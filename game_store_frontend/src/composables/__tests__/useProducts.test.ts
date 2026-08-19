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
vi.mock('axios')

import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from '../../services/productService'
import { useProducts } from '../useProducts'

import type { Product } from '../../types/product'

const product: Product = {
  id: 1,
  name: 'Consola',
  sku: 'CON-1',
  description: null,
  category: null,
  price: '100.00',
  quantity: 10,
  min_stock: 2,
  status: 'active',
  critico_stock: false,
}

function mountComposable() {
  const wrapper = mount(
    defineComponent({
      setup() {
        return { composable: useProducts() }
      },
      template: '<div />',
    }),
  )

  return wrapper.vm.composable as ReturnType<typeof useProducts>
}

describe('useProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.isAxiosError).mockReturnValue(false)

    vi.mocked(getProducts).mockResolvedValue({
      products: [product],
      totalPages: 2,
    })
  })

  it('loads the products on mount', async () => {
    const composable = mountComposable()
    await flushPromises()

    expect(getProducts).toHaveBeenCalledWith({
      page: 1,
      per_page: 10,
      search: undefined,
    })
    expect(composable.products.value).toEqual([product])
    expect(composable.totalPages.value).toBe(2)
    expect(composable.loading.value).toBe(false)
  })

  it('sets an error message when loading fails', async () => {
    vi.mocked(getProducts).mockRejectedValue(new Error('boom'))

    const composable = mountComposable()
    await flushPromises()

    expect(composable.error.value).toBe(
      'No fue posible cargar los productos.',
    )
  })

  it('changePage ignores invalid pages', async () => {
    const composable = mountComposable()
    await flushPromises()

    await composable.changePage(0)
    await composable.changePage(5)
    await composable.changePage(1)

    expect(getProducts).toHaveBeenCalledTimes(1)
  })

  it('changePage fetches the requested page', async () => {
    const composable = mountComposable()
    await flushPromises()

    await composable.changePage(2)

    expect(composable.page.value).toBe(2)
    expect(getProducts).toHaveBeenLastCalledWith({
      page: 2,
      per_page: 10,
      search: undefined,
    })
  })

  it('searchProducts resets to the first page', async () => {
    const composable = mountComposable()
    await flushPromises()

    composable.search.value = 'nuevo'
    composable.page.value = 3
    await composable.searchProducts()

    expect(composable.page.value).toBe(1)
    expect(getProducts).toHaveBeenLastCalledWith({
      page: 1,
      per_page: 10,
      search: 'nuevo',
    })
  })

  it('openCreateForm resets the editing state', () => {
    const composable = mountComposable()

    composable.openEditForm(product)
    composable.openCreateForm()

    expect(composable.editingProduct.value).toBeNull()
    expect(composable.showForm.value).toBe(true)
    expect(composable.form.value).toEqual(
      expect.objectContaining({ name: '', sku: '' }),
    )
  })

  it('openEditForm fills the form from the product', () => {
    const composable = mountComposable()

    composable.openEditForm(product)

    expect(composable.editingProduct.value).toEqual(product)
    expect(composable.showForm.value).toBe(true)
    expect(composable.form.value).toEqual(
      expect.objectContaining({
        name: 'Consola',
        sku: 'CON-1',
        price: 100,
      }),
    )
  })

  it('closeForm clears the form', () => {
    const composable = mountComposable()

    composable.openEditForm(product)
    composable.closeForm()

    expect(composable.showForm.value).toBe(false)
    expect(composable.editingProduct.value).toBeNull()
  })

  it('saveProduct creates a product when nothing is being edited', async () => {
    vi.mocked(createProduct).mockResolvedValue(product)

    const composable = mountComposable()
    await flushPromises()

    await composable.saveProduct()

    expect(createProduct).toHaveBeenCalled()
    expect(composable.successMessage.value).toBe(
      'Producto creado correctamente.',
    )
    expect(composable.showForm.value).toBe(false)
  })

  it('saveProduct updates a product when editing', async () => {
    vi.mocked(updateProduct).mockResolvedValue(product)

    const composable = mountComposable()
    await flushPromises()

    composable.openEditForm(product)
    await composable.saveProduct()

    expect(updateProduct).toHaveBeenCalledWith(1, {
      name: 'Consola',
      sku: 'CON-1',
      description: '',
      category: '',
      price: 100,
      quantity: 10,
      min_stock: 2,
      status: 'active',
      critico_stock: false,
    })
    expect(composable.successMessage.value).toBe(
      'Producto actualizado correctamente.',
    )
  })

  it('saveProduct shows the permission error for a 403', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    vi.mocked(createProduct).mockRejectedValue({
      response: { status: 403, data: { message: 'Forbidden' } },
    })

    const composable = mountComposable()
    await flushPromises()

    await composable.saveProduct()

    expect(composable.error.value).toBe(
      'No tienes permiso para realizar esta acción.',
    )
  })

  it('saveProduct shows the backend message for other errors', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    vi.mocked(createProduct).mockRejectedValue({
      response: { status: 422, data: { message: 'Datos inválidos' } },
    })

    const composable = mountComposable()
    await flushPromises()

    await composable.saveProduct()

    expect(composable.error.value).toBe('Datos inválidos')
  })

  it('removeProduct skips the request when the user cancels', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    const composable = mountComposable()
    await flushPromises()

    await composable.removeProduct(product)

    expect(deleteProduct).not.toHaveBeenCalled()
  })

  it('removeProduct deletes the product when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(deleteProduct).mockResolvedValue()

    const composable = mountComposable()
    await flushPromises()

    await composable.removeProduct(product)

    expect(deleteProduct).toHaveBeenCalledWith(1)
    expect(composable.successMessage.value).toBe(
      'Producto eliminado correctamente.',
    )
  })

  it('removeProduct moves back a page when the last item is removed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(deleteProduct).mockResolvedValue()

    const composable = mountComposable()
    await flushPromises()

    composable.products.value = [product]
    composable.page.value = 3

    await composable.removeProduct(product)

    expect(composable.page.value).toBe(2)
  })

  it('removeProduct shows the permission error for a 403', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    vi.mocked(deleteProduct).mockRejectedValue({
      response: { status: 403, data: { message: 'Forbidden' } },
    })

    const composable = mountComposable()
    await flushPromises()

    await composable.removeProduct(product)

    expect(composable.error.value).toBe(
      'No tienes permiso para eliminar productos.',
    )
  })
})