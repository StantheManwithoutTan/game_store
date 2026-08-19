import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import StockHistoryTable from '../StockHistoryTable.vue'

import type { StockMovement } from '../../../types/stock'

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
  return mount(StockHistoryTable, {
    props: { movements, productNames },
  })
}

describe('StockHistoryTable', () => {
  it('shows an empty state when there are no movements', () => {
    const wrapper = mountTable({ movements: [] })

    expect(wrapper.text()).toContain(
      'No existen movimientos para los filtros seleccionados.',
    )
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('renders the movements with the product name', () => {
    const wrapper = mountTable({
      movements: [makeMovement()],
      productNames: { 1: 'Consola' },
    })

    expect(wrapper.text()).toContain('Consola')
    expect(wrapper.text()).toContain('Compra')
    expect(wrapper.text()).toContain('admin')
    expect(wrapper.text()).toContain('5')
  })

  it('falls back to the product id when the name is unknown', () => {
    const wrapper = mountTable({
      movements: [makeMovement()],
      productNames: {},
    })

    expect(wrapper.text()).toContain('Producto #1')
  })

  it('renders placeholders for missing user and motive', () => {
    const wrapper = mountTable({
      movements: [
        makeMovement({ usuario: null, motive: null }),
      ],
    })

    expect(wrapper.text()).toContain('Sistema')
    expect(wrapper.text()).toContain('Sin motivo')
  })

  it('labels the movement type', () => {
    const wrapper = mountTable({
      movements: [makeMovement({ type_movement: 'salida' })],
    })

    const badge = wrapper.find('.movement-badge')
    expect(badge.text()).toBe('Salida')
    expect(badge.classes()).toContain('movement-exit')
  })

  it('paginates long lists and navigates through pages', async () => {
    const movements = Array.from({ length: 25 }, (_, index) =>
      makeMovement({ id: index + 1, product_id: 1 }),
    )
    const wrapper = mountTable({ movements })

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(20)
    expect(wrapper.text()).toContain('Página 1 de 2')

    const nextButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Siguiente')

    await nextButton?.trigger('click')

    expect(wrapper.text()).toContain('Página 2 de 2')
    expect(wrapper.find('tbody tr').exists()).toBe(true)
  })

  it('does not move past the last page', async () => {
    const movements = Array.from({ length: 25 }, (_, index) =>
      makeMovement({ id: index + 1 }),
    )
    const wrapper = mountTable({ movements })

    const nextButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Siguiente')

    await nextButton?.trigger('click')
    await nextButton?.trigger('click')

    expect(wrapper.text()).toContain('Página 2 de 2')
  })

  it('does not move before the first page', async () => {
    const movements = Array.from({ length: 25 }, (_, index) =>
      makeMovement({ id: index + 1 }),
    )
    const wrapper = mountTable({ movements })

    const prevButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Anterior')

    await prevButton?.trigger('click')

    expect(wrapper.text()).toContain('Página 1 de 2')
  })

  it('disables pagination buttons at the bounds', () => {
    const wrapper = mountTable({ movements: [makeMovement()] })

    const [prevButton, nextButton] = wrapper.findAll('button')

    expect(prevButton.attributes('disabled')).toBeDefined()
    expect(nextButton.attributes('disabled')).toBeDefined()
  })
})