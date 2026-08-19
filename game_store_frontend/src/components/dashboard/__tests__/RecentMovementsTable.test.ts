import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import RecentMovementsTable from '../RecentMovementsTable.vue'

import type { StockMovement } from '../../../types/stock'

const RouterLinkStub = {
  template: '<a class="router-link-stub"><slot /></a>',
}

function makeMovement(
  overrides: Partial<StockMovement> = {},
): StockMovement {
  return {
    id: 1,
    product_id: 1,
    usuario: 'admin',
    type_movement: 'entrada',
    amount: 5,
    stock_before: 2,
    stock_after: 7,
    motive: 'Compra',
    created_at: '2025-01-01T10:00:00Z',
    ...overrides,
  }
}

function mountTable({
  movements,
  productNames = {},
}: {
  movements: StockMovement[]
  productNames?: Record<number, string>
}) {
  return mount(RecentMovementsTable, {
    props: { movements, productNames },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('RecentMovementsTable', () => {
  it('shows an empty state when there are no movements', () => {
    const wrapper = mountTable({ movements: [] })

    expect(wrapper.text()).toContain('No existen movimientos registrados.')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('renders the movements with the product name and a link to /stock', () => {
    const wrapper = mountTable({
      movements: [makeMovement()],
      productNames: { 1: 'Consola' },
    })

    expect(wrapper.text()).toContain('Consola')
    expect(wrapper.text()).toContain('5')

    const badge = wrapper.find('.movement-badge')
    expect(badge.text()).toBe('Entrada')
    expect(badge.classes()).toContain('movement-entry')

    expect(wrapper.find('.panel-link').text()).toBe('Ver historial')
  })

  it('falls back to the product id when the name is unknown', () => {
    const wrapper = mountTable({
      movements: [makeMovement()],
      productNames: {},
    })

    expect(wrapper.text()).toContain('Producto #1')
  })

  it('labels exit movements correctly', () => {
    const wrapper = mountTable({
      movements: [makeMovement({ type_movement: 'salida' })],
    })

    expect(wrapper.find('.movement-badge').text()).toBe('Salida')
  })

  it('labels adjustment movements correctly', () => {
    const wrapper = mountTable({
      movements: [makeMovement({ type_movement: 'ajuste' })],
    })

    expect(wrapper.find('.movement-badge').text()).toBe('Ajuste')
  })
})