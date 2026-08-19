import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import CriticalProductsList from '../CriticalProductsList.vue'

import type { Product } from '../../../types/product'

const RouterLinkStub = {
  template: '<a class="router-link-stub"><slot /></a>',
}

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

describe('CriticalProductsList', () => {
  it('shows an empty state with no critical products', () => {
    const wrapper = mount(CriticalProductsList, {
      props: { products: [] },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.text()).toContain('No hay productos con stock crítico.')
  })

  it('renders the critical products with their stock and a link to /stock', () => {
    const wrapper = mount(CriticalProductsList, {
      props: {
        products: [
          makeProduct(),
          makeProduct({ id: 2, name: 'Juego' }),
        ],
      },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.findAll('.critical-item')).toHaveLength(2)
    expect(wrapper.text()).toContain('Consola')
    expect(wrapper.text()).toContain('mínimo 5')

    const link = wrapper.find('.panel-link')
    expect(link.text()).toBe('Ver stock')
    expect(link.attributes('to')).toBe('/stock')
  })
})