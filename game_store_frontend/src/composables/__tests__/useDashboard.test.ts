import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import axios from 'axios'

vi.mock('../../services/dashboardService', () => ({
  loadDashboardData: vi.fn(),
}))
vi.mock('axios')

import { loadDashboardData } from '../../services/dashboardService'
import { useDashboard } from '../useDashboard'

import type { DashboardData } from '../../types/dashboard'

const dashboardData: DashboardData = {
  products: [{ id: 1, name: 'Producto', quantity: 5 }] as never,
  criticalProducts: [{ id: 2 }] as never,
  recentMovements: [{ id: 1 }] as never,
  metrics: {
    totalProducts: 1,
    criticalProducts: 1,
    totalUnits: 5,
    totalMovements: 1,
  },
}

function mountComposable() {
  const wrapper = mount(
    defineComponent({
      setup() {
        return { composable: useDashboard() }
      },
      template: '<div />',
    }),
  )

  return wrapper.vm.composable as ReturnType<typeof useDashboard>
}

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.isAxiosError).mockReturnValue(false)
    vi.mocked(loadDashboardData).mockResolvedValue(dashboardData)
  })

  it('loads the dashboard data on mount', async () => {
    const composable = mountComposable()
    await flushPromises()

    expect(composable.products.value).toEqual(dashboardData.products)
    expect(composable.criticalProducts.value).toEqual(
      dashboardData.criticalProducts,
    )
    expect(composable.recentMovements.value).toEqual(
      dashboardData.recentMovements,
    )
    expect(composable.metrics.value).toEqual(dashboardData.metrics)
    expect(composable.productNames.value[1]).toBe('Producto')
    expect(composable.loading.value).toBe(false)
  })

  it('sets a permission error when loading fails with 403', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    vi.mocked(loadDashboardData).mockRejectedValue({
      response: { status: 403, data: { message: 'Forbidden' } },
    })

    const composable = mountComposable()
    await flushPromises()

    expect(composable.error.value).toBe(
      'No tienes permiso para consultar el dashboard.',
    )
  })

  it('sets a fallback error when loading fails', async () => {
    vi.mocked(loadDashboardData).mockRejectedValue(new Error('boom'))

    const composable = mountComposable()
    await flushPromises()

    expect(composable.error.value).toBe(
      'No fue posible cargar el dashboard.',
    )
  })

  it('fetchDashboard can be invoked again', async () => {
    const composable = mountComposable()
    await flushPromises()

    await composable.fetchDashboard()

    expect(loadDashboardData).toHaveBeenCalledTimes(2)
  })
})