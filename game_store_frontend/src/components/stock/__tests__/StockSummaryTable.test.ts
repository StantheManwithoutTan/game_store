import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import StockSummaryTable from '../StockSummaryTable.vue'

import type { Product } from '../../../types/product'

function makeProduct(
  overrides: Partial<Product> = {},
): Product {
  return {
    id: 1,
    name: 'Consola',
    sku: 'CON-1',
    description: 'Descripción',
    category: 'Hardware',
    price: '100.00',
    quantity: 10,
    min_stock: 2,
    status: 'active',
    critico_stock: false,
    ...overrides,
  }
}

describe('StockSummaryTable', () => {
  it('shows an empty state when there are no products', () => {
    const wrapper = mount(StockSummaryTable, {
      props: { products: [] },
    })

    expect(wrapper.text()).toContain('No hay productos registrados.')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('renders a row per product with stock data', () => {
    const products = [
      makeProduct(),
      makeProduct({ id: 2, name: 'Juego', sku: 'J-1', quantity: 3 }),
    ]
    const wrapper = mount(StockSummaryTable, {
      props: { products },
    })

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(wrapper.text()).toContain('Consola')
    expect(wrapper.text()).toContain('CON-1')
    expect(wrapper.text()).toContain('J-1')
  })

  it('marks a critical product as level-danger', () => {
    const wrapper = mount(StockSummaryTable, {
      props: {
        products: [makeProduct({ critico_stock: true, quantity: 1 })],
      },
    })

    const row = wrapper.find('tbody tr')
    expect(row.classes()).toContain('level-danger')

    const badge = wrapper.find('.status-badge')
    expect(badge.classes()).toContain('status-critical')
    expect(badge.text()).toBe('Crítico')
  })

  it('marks a low stock product as level-warning', () => {
    const wrapper = mount(StockSummaryTable, {
      props: {
        products: [makeProduct({ quantity: 4 })],
      },
    })

    const row = wrapper.find('tbody tr')
    expect(row.classes()).toContain('level-warning')

    const badge = wrapper.find('.status-badge')
    expect(badge.classes()).toContain('status-warning')
    expect(badge.text()).toBe('Bajo')
  })

  it('marks a healthy stock product as level-ok', () => {
    const wrapper = mount(StockSummaryTable, {
      props: {
        products: [makeProduct({ quantity: 50 })],
      },
    })

    const row = wrapper.find('tbody tr')
    expect(row.classes()).toContain('level-ok')

    expect(wrapper.find('.status-badge').text()).toBe('Disponible')
  })
})