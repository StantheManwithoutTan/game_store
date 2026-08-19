import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import StockFilters from '../StockFilters.vue'

import type { Product } from '../../../types/product'
import type { StockHistoryFilters } from '../../../types/stock'

function makeProduct(
  overrides: Partial<Product> = {},
): Product {
  return {
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
    ...overrides,
  }
}

function emptyFilters(): StockHistoryFilters {
  return {
    product_id: undefined,
    fecha_desde: '',
    fecha_hasta: '',
  }
}

function mountFilters({
  products = [makeProduct(), makeProduct({ id: 2, name: 'Juego' })],
  modelValue = emptyFilters(),
  filtering = false,
}: {
  products?: Product[]
  modelValue?: StockHistoryFilters
  filtering?: boolean
} = {}) {
  return mount(StockFilters, {
    props: { products, modelValue, filtering },
  })
}

describe('StockFilters', () => {
  it('renders the product options plus the all option', () => {
    const wrapper = mountFilters()

    const options = wrapper.findAll('#history-product option')
    expect(options).toHaveLength(3)
    expect(wrapper.find('option[value=""]').text()).toBe('Todos')
    expect(wrapper.text()).toContain('Consola')
    expect(wrapper.text()).toContain('Juego')
  })

  it('emits an update when a product is selected', async () => {
    const wrapper = mountFilters()

    await wrapper.find('#history-product').setValue('2')

    expect(wrapper.emitted('update:modelValue')?.[0][0]).toMatchObject({
      product_id: 2,
    })
  })

  it('emits an update with undefined when the all option is selected', async () => {
    const wrapper = mountFilters({
      modelValue: { ...emptyFilters(), product_id: 1 },
    })

    await wrapper.find('#history-product').setValue('')

    expect(wrapper.emitted('update:modelValue')?.[0][0]).toMatchObject({
      product_id: undefined,
    })
  })

  it('emits updates for the date fields', async () => {
    const wrapper = mountFilters()

    await wrapper.find('#date-from').setValue('2026-01-01')
    await wrapper.find('#date-to').setValue('2026-01-31')

    const emitted = wrapper.emitted('update:modelValue') ?? []

    expect(emitted[0][0]).toMatchObject({ fecha_desde: '2026-01-01' })
    expect(emitted[1][0]).toMatchObject({ fecha_hasta: '2026-01-31' })
  })

  it('emits apply on form submit', async () => {
    const wrapper = mountFilters()

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('apply')).toHaveLength(1)
  })

  it('emits clear when the clear button is clicked', async () => {
    const wrapper = mountFilters()

    const clearButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Limpiar')

    await clearButton?.trigger('click')

    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('disables the buttons and shows progress text while filtering', () => {
    const wrapper = mountFilters({ filtering: true })

    expect(wrapper.text()).toContain('Filtrando...')

    const buttons = wrapper.findAll('button')
    expect(buttons[0].attributes('disabled')).toBeDefined()
    expect(buttons[1].attributes('disabled')).toBeDefined()
  })
})