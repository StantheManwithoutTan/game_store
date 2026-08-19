import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import type { Product } from '../../types/product'

const { productViewState } = vi.hoisted(() => {
  const fakeRef = <T>(initial: T) => {
    let value = initial
    return {
      __v_isRef: true,
      get value() {
        return value
      },
      set value(next: T) {
        value = next
      },
    }
  }

  const state = {
    products: fakeRef([] as Product[]),
    search: fakeRef(''),
    page: fakeRef(1),
    totalPages: fakeRef(1),
    loading: fakeRef(true),
    submitting: fakeRef(false),
    error: fakeRef(''),
    successMessage: fakeRef(''),
    showForm: fakeRef(false),
    editingProduct: fakeRef(null as Product | null),
    form: fakeRef({
      name: '',
      sku: '',
      description: '',
      category: '',
      price: 0,
      quantity: 0,
      min_stock: 0,
      status: 'active' as const,
      critico_stock: false,
    }),
    searchProducts: vi.fn(),
    changePage: vi.fn(),
    openCreateForm: vi.fn(() => {
      state.showForm.value = true
    }),
    openEditForm: vi.fn(),
    closeForm: vi.fn(() => {
      state.showForm.value = false
    }),
    saveProduct: vi.fn(),
    removeProduct: vi.fn(),
  }

  return { productViewState: state }
})

vi.mock('../../composables/useProducts', () => ({
  useProducts: () => productViewState,
}))

import ProductsView from '../ProductsView.vue'

function mountView() {
  return mount(ProductsView, {
    global: {
      stubs: {
        AppAlert: {
          name: 'AppAlert',
          props: ['type'],
          template: '<div class="alert-stub"><slot /></div>',
        },
        LoadingState: {
          name: 'LoadingState',
          props: ['message'],
          template: '<div class="loading-stub" />',
        },
        ProductToolbar: {
          name: 'ProductToolbar',
          props: ['modelValue'],
          template: '<div class="toolbar-stub" />',
        },
        ProductTable: {
          name: 'ProductTable',
          props: ['products', 'page', 'totalPages'],
          template: '<div class="table-stub" />',
        },
        ProductModal: {
          name: 'ProductModal',
          props: ['product', 'form', 'submitting'],
          template: '<div class="modal-stub" />',
        },
      },
    },
  })
}

function resetState() {
  productViewState.products.value = []
  productViewState.search.value = ''
  productViewState.page.value = 1
  productViewState.totalPages.value = 1
  productViewState.loading.value = false
  productViewState.submitting.value = false
  productViewState.error.value = ''
  productViewState.successMessage.value = ''
  productViewState.showForm.value = false
  productViewState.editingProduct.value = null
}

describe('ProductsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetState()
  })

  it('shows the loading state while loading', () => {
    productViewState.loading.value = true

    const wrapper = mountView()

    expect(wrapper.find('.loading-stub').exists()).toBe(true)
    expect(wrapper.find('.table-stub').exists()).toBe(false)
  })

  it('renders the table with the current products once loaded', () => {
    productViewState.loading.value = false
    productViewState.products.value = [{ id: 1 }] as Product[]

    const wrapper = mountView()

    const table = wrapper.findComponent({ name: 'ProductTable' })

    expect(table.exists()).toBe(true)
    expect(table.props('products')).toHaveLength(1)
    expect(wrapper.find('.loading-stub').exists()).toBe(false)
  })

  it('shows the error message when present', () => {
    productViewState.error.value = 'No fue posible cargar los productos.'

    const wrapper = mountView()

    expect(wrapper.find('.alert-stub').text()).toContain(
      'No fue posible cargar los productos.',
    )
  })

  it('shows the success message when present', () => {
    productViewState.successMessage.value = 'Producto creado correctamente.'

    const wrapper = mountView()

    expect(wrapper.text()).toContain('Producto creado correctamente.')
  })

  it('opens the modal from the toolbar', async () => {
    const wrapper = mountView()

    const toolBar = wrapper.findComponent({ name: 'ProductToolbar' })

    await toolBar.vm.$emit('create')

    expect(productViewState.openCreateForm).toHaveBeenCalledTimes(1)
    expect(productViewState.showForm.value).toBe(true)
  })

  it('renders the modal only when the form is open', () => {
    productViewState.showForm.value = true

    const wrapper = mountView()

    expect(wrapper.find('.modal-stub').exists()).toBe(true)
  })

  it('forwards the modal save to saveProduct', async () => {
    productViewState.showForm.value = true

    const wrapper = mountView()

    const modal = wrapper.findComponent({ name: 'ProductModal' })

    await modal.vm.$emit('save')

    expect(productViewState.saveProduct).toHaveBeenCalledTimes(1)
  })

  it('forwards the modal close to closeForm', async () => {
    productViewState.showForm.value = true

    const wrapper = mountView()

    const modal = wrapper.findComponent({ name: 'ProductModal' })

    await modal.vm.$emit('close')

    expect(productViewState.closeForm).toHaveBeenCalledTimes(1)
    expect(productViewState.showForm.value).toBe(false)
  })

  it('forwards edit and delete events from the table', async () => {
    const wrapper = mountView()

    const table = wrapper.findComponent({ name: 'ProductTable' })

    await table.vm.$emit('edit', { id: 1 })
    await table.vm.$emit('delete', { id: 1 })
    await table.vm.$emit('change-page', 2)

    expect(productViewState.openEditForm).toHaveBeenCalledWith({ id: 1 })
    expect(productViewState.removeProduct).toHaveBeenCalledWith({ id: 1 })
    expect(productViewState.changePage).toHaveBeenCalledWith(2)
  })

  it('forwards the search event to searchProducts', async () => {
    const wrapper = mountView()

    const toolBar = wrapper.findComponent({ name: 'ProductToolbar' })

    await toolBar.vm.$emit('search')

    expect(productViewState.searchProducts).toHaveBeenCalledTimes(1)
  })
})