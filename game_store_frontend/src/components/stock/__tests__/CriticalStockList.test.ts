import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import CriticalStockList from '../CriticalStockList.vue'

import type { Product } from '../../../types/product'

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
    quantity: 1,
    min_stock: 5,
    status: 'active',
    critico_stock: true,
    ...overrides,
  }
}

describe('CriticalStockList', () => {
  it('shows an empty state with no critical products', () => {
    const wrapper = mount(CriticalStockList, {
      props: { products: [] },
    })

    expect(wrapper.text()).toContain('No hay productos con stock crítico.')
    expect(wrapper.find('.critical-item').exists()).toBe(false)
  })

  it('renders the critical products with their stock', () => {
    const wrapper = mount(CriticalStockList, {
      props: {
        products: [
          makeProduct(),
          makeProduct({ id: 2, name: 'Juego', sku: 'J-1' }),
        ],
      },
    })

    expect(wrapper.findAll('.critical-item')).toHaveLength(2)
    expect(wrapper.text()).toContain('Consola')
    expect(wrapper.text()).toContain('J-1')
    expect(wrapper.text()).toContain('mínimo 5')
    expect(wrapper.find('.critical-counter').text()).toBe('2')
  })
})