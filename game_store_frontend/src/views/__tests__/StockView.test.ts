import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import type { Product } from '../../types/product'
import type {
  StockHistoryFilters,
  StockMovement,
  StockMovementForm,
} from '../../types/stock'

const { stockViewState } = vi.hoisted(() => {
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
    criticalProducts: fakeRef([] as Product[]),
    movements: fakeRef([] as StockMovement[]),
    loading: fakeRef(true),
    submitting: fakeRef(false),
    filtering: fakeRef(false),
    error: fakeRef(''),
    successMessage: fakeRef(''),
    filters: fakeRef({} as StockHistoryFilters),
    form: fakeRef({} as StockMovementForm),
    productNames: fakeRef({} as Record<number, string>),
    selectedProduct: fakeRef(undefined as Product | undefined),
    valueLabel: fakeRef('Cantidad'),
    submitMovement: vi.fn(),
    applyFilters: vi.fn(),
    clearFilters: vi.fn(),
  }

  return { stockViewState: state }
})

vi.mock('../../composables/useStock', () => ({
  useStock: () => stockViewState,
}))

import StockView from '../StockView.vue'

const RouterLinkStub = {
  template: '<a class="router-link-stub"><slot /></a>',
}

function mountView() {
  return mount(StockView, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        AppAlert: {
          name: 'AppAlert',
          props: ['type'],
          template: '<div class="alert-stub"><slot /></div>',
        },
        LoadingState: {
          name: 'LoadingState',
          template: '<div class="loading-stub" />',
        },
        StockMovementForm: {
          name: 'StockMovementForm',
          props: [
            'products',
            'selectedProduct',
            'modelValue',
            'valueLabel',
            'submitting',
          ],
          template: '<div class="movement-stub" />',
        },
        CriticalStockList: {
          name: 'CriticalStockList',
          template: '<div class="critical-stub" />',
        },
        StockSummaryTable: {
          name: 'StockSummaryTable',
          template: '<div class="summary-stub" />',
        },
        StockFilters: {
          name: 'StockFilters',
          template: '<div class="filters-stub" />',
        },
        StockHistoryTable: {
          name: 'StockHistoryTable',
          template: '<div class="history-stub" />',
        },
      },
    },
  })
}

function resetState() {
  stockViewState.products.value = []
  stockViewState.criticalProducts.value = []
  stockViewState.movements.value = []
  stockViewState.loading.value = false
  stockViewState.submitting.value = false
  stockViewState.filtering.value = false
  stockViewState.error.value = ''
  stockViewState.successMessage.value = ''
}

describe('StockView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetState()
  })

  it('shows the loading state while loading', () => {
    stockViewState.loading.value = true

    const wrapper = mountView()

    expect(wrapper.find('.loading-stub').exists()).toBe(true)
    expect(wrapper.find('.movement-stub').exists()).toBe(false)
  })

  it('renders the inventory sections once loaded', () => {
    const wrapper = mountView()

    expect(wrapper.find('.loading-stub').exists()).toBe(false)
    expect(wrapper.find('.movement-stub').exists()).toBe(true)
    expect(wrapper.find('.critical-stub').exists()).toBe(true)
    expect(wrapper.find('.summary-stub').exists()).toBe(true)
    expect(wrapper.find('.filters-stub').exists()).toBe(true)
    expect(wrapper.find('.history-stub').exists()).toBe(true)
  })

  it('passes the products and value label to the movement form', () => {
    stockViewState.products.value = [{ id: 1 }] as Product[]
    stockViewState.valueLabel.value = 'Nueva cantidad de stock'

    const wrapper = mountView()

    const form = wrapper.findComponent({ name: 'StockMovementForm' })
    expect(form.props('products')).toHaveLength(1)
    expect(form.props('valueLabel')).toBe('Nueva cantidad de stock')
  })

  it('shows the error message when present', () => {
    stockViewState.error.value = 'No fue posible cargar la información.'

    const wrapper = mountView()

    expect(wrapper.find('.alert-stub').text()).toContain(
      'No fue posible cargar la información.',
    )
  })

  it('shows the success message when present', () => {
    stockViewState.successMessage.value = 'Movimiento registrado.'

    const wrapper = mountView()

    expect(wrapper.text()).toContain('Movimiento registrado.')
  })

  it('forwards the movement submit to submitMovement', async () => {
    const wrapper = mountView()

    const form = wrapper.findComponent({ name: 'StockMovementForm' })

    await form.vm.$emit('submit')

    expect(stockViewState.submitMovement).toHaveBeenCalledTimes(1)
  })

  it('forwards the filter apply and clear events', async () => {
    const wrapper = mountView()

    const filters = wrapper.findComponent({ name: 'StockFilters' })

    await filters.vm.$emit('apply')
    await filters.vm.$emit('clear')

    expect(stockViewState.applyFilters).toHaveBeenCalledTimes(1)
    expect(stockViewState.clearFilters).toHaveBeenCalledTimes(1)
  })
})