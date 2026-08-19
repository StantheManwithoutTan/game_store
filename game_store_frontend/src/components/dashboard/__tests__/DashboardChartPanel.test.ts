import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import DashboardChartPanel from '../DashboardChartPanel.vue'

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
    motive: null,
    created_at: '2025-01-01T10:00:00Z',
    ...overrides,
  }
}

describe('DashboardChartPanel', () => {
  it('shows an empty state when there are no movements', () => {
    const wrapper = mount(DashboardChartPanel, {
      props: { movements: [] },
      global: { stubs: { StockMovementChart: true } },
    })

    expect(wrapper.text()).toContain(
      'No hay movimientos suficientes para mostrar el gráfico.',
    )
    expect(wrapper.findComponent({ name: 'StockMovementChart' }).exists()).toBe(
      false,
    )
  })

  it('renders the chart when there are movements', () => {
    const wrapper = mount(DashboardChartPanel, {
      props: { movements: [makeMovement()] },
      global: { stubs: { StockMovementChart: true } },
    })

    expect(wrapper.findComponent({ name: 'StockMovementChart' }).exists()).toBe(
      true,
    )
    expect(wrapper.text()).toContain('Movimientos por tipo')
  })
})