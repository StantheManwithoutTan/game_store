import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import DashboardMetrics from '../DashboardMetrics.vue'

describe('DashboardMetrics', () => {
  it('renders all metric values', () => {
    const wrapper = mount(DashboardMetrics, {
      props: {
        metrics: {
          totalProducts: 10,
          criticalProducts: 2,
          totalUnits: 500,
          totalMovements: 42,
        },
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Total de productos')
    expect(text).toContain('10')
    expect(text).toContain('Productos críticos')
    expect(text).toContain('2')
    expect(text).toContain('Unidades disponibles')
    expect(text).toContain('500')
    expect(text).toContain('Movimientos')
    expect(text).toContain('42')
  })

  it('marks the critical metric card', () => {
    const wrapper = mount(DashboardMetrics, {
      props: {
        metrics: {
          totalProducts: 0,
          criticalProducts: 0,
          totalUnits: 0,
          totalMovements: 0,
        },
      },
    })

    const card = wrapper
      .findAll('.metric-card')
      .find((element) => element.text().includes('Productos críticos'))

    expect(card?.classes()).toContain('metric-card-critical')
  })
})