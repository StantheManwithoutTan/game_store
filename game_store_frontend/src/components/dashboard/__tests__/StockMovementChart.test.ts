import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import StockMovementChart from '../StockMovementChart.vue'

import type { StockMovement } from '../../../types/stock'

vi.mock('vue-chartjs', () => ({
  Bar: {
    name: 'Bar',
    props: ['data', 'options'],
    template: '<div class="bar-stub" />',
  },
}))

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}))

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

function chartData(wrapper: ReturnType<typeof mount>) {
  const bar = wrapper.findComponent({ name: 'Bar' })
  return bar.props('data')
}

describe('StockMovementChart', () => {
  it('totals entry movements', () => {
    const wrapper = mount(StockMovementChart, {
      props: {
        movements: [
          makeMovement(),
          makeMovement({ id: 2, type_movement: 'entrada' }),
        ],
      },
    })

    expect(chartData(wrapper).datasets[0].data).toEqual([2, 0, 0])
  })

  it('splits totals by movement type', () => {
    const wrapper = mount(StockMovementChart, {
      props: {
        movements: [
          makeMovement({ type_movement: 'Entrada' }),
          makeMovement({ type_movement: 'salida' }),
          makeMovement({ type_movement: 'SALIDA' }),
          makeMovement({ type_movement: 'ajuste' }),
        ],
      },
    })

    expect(chartData(wrapper).datasets[0].data).toEqual([1, 2, 1])
  })

  it('handles an empty list with zeroed totals', () => {
    const wrapper = mount(StockMovementChart, {
      props: { movements: [] },
    })

    expect(chartData(wrapper).datasets[0].data).toEqual([0, 0, 0])
  })
})