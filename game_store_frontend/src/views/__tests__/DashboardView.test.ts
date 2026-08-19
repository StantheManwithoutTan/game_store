import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import type { DashboardMetrics } from '../../types/dashboard'
import type { Product } from '../../types/product'
import type { StockMovement } from '../../types/stock'

const { dashboardViewState } = vi.hoisted(() => {
  const fakeRef = <T>(initial: T) => {
    let value = initial
    return {
      __v_isRef: true,
      get value() {
        return value
      },
      set value(next: T) {
        value = next
      },
    }
  }

  const state = {
    criticalProducts: fakeRef([] as Product[]),
    recentMovements: fakeRef([] as StockMovement[]),
    metrics: fakeRef({
      totalProducts: 0,
      criticalProducts: 0,
      totalUnits: 0,
      totalMovements: 0,
    } as DashboardMetrics),
    productNames: fakeRef({} as Record<number, string>),
    loading: fakeRef(true),
    error: fakeRef(''),
    loggingOut: fakeRef(false),
    logout: vi.fn(),
    user: fakeRef({ name: 'Ana Pérez' } as { name?: string; email?: string } | null),
  }

  return { dashboardViewState: state }
})

vi.mock('../../composables/useDashboard', () => ({
  useDashboard: () => dashboardViewState,
}))

vi.mock('../../composables/useLogout', () => ({
  useLogout: () => ({
    loggingOut: dashboardViewState.loggingOut,
    logout: dashboardViewState.logout,
  }),
}))

vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({ user: { name: dashboardViewState.user.value?.name, email: dashboardViewState.user.value?.email } }),
}))

import DashboardView from '../DashboardView.vue'

const RouterLinkStub = {
  template: '<a class="router-link-stub"><slot /></a>',
}

function mountView() {
  return mount(DashboardView, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        AppAlert: {
          name: 'AppAlert',
          props: ['type'],
          template: '<div class="alert-stub"><slot /></div>',
        },
        AppNavbar: {
          name: 'AppNavbar',
          props: ['userName', 'loggingOut'],
          template: '<div class="navbar-stub" />',
        },
        LoadingState: {
          name: 'LoadingState',
          template: '<div class="loading-stub" />',
        },
        DashboardMetrics: {
          name: 'DashboardMetrics',
          props: ['metrics'],
          template: '<div class="metrics-stub" />',
        },
        DashboardChartPanel: {
          name: 'DashboardChartPanel',
          props: ['movements'],
          template: '<div class="chart-panel-stub" />',
        },
        CriticalProductsList: {
          name: 'CriticalProductsList',
          props: ['products'],
          template: '<div class="critical-stub" />',
        },
        RecentMovementsTable: {
          name: 'RecentMovementsTable',
          props: ['movements', 'productNames'],
          template: '<div class="recent-stub" />',
        },
      },
    },
  })
}

function resetState() {
  dashboardViewState.criticalProducts.value = []
  dashboardViewState.recentMovements.value = []
  dashboardViewState.metrics.value = {
    totalProducts: 0,
    criticalProducts: 0,
    totalUnits: 0,
    totalMovements: 0,
  }
  dashboardViewState.productNames.value = {}
  dashboardViewState.loading.value = false
  dashboardViewState.error.value = ''
  dashboardViewState.loggingOut.value = false
  dashboardViewState.user.value = { name: 'Ana Pérez' }
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetState()
  })

  it('shows the loading state while loading', () => {
    dashboardViewState.loading.value = true

    const wrapper = mountView()

    expect(wrapper.find('.loading-stub').exists()).toBe(true)
    expect(wrapper.find('.metrics-stub').exists()).toBe(false)
  })

  it('renders the dashboard sections once loaded', () => {
    const wrapper = mountView()

    expect(wrapper.find('.loading-stub').exists()).toBe(false)
    expect(wrapper.find('.navbar-stub').exists()).toBe(true)
    expect(wrapper.find('.metrics-stub').exists()).toBe(true)
    expect(wrapper.find('.chart-panel-stub').exists()).toBe(true)
    expect(wrapper.find('.critical-stub').exists()).toBe(true)
    expect(wrapper.find('.recent-stub').exists()).toBe(true)
  })

  it('passes the metrics and data to the panels', () => {
    dashboardViewState.metrics.value = {
      totalProducts: 10,
      criticalProducts: 2,
      totalUnits: 50,
      totalMovements: 8,
    }
    dashboardViewState.recentMovements.value = [{ id: 1 }] as StockMovement[]

    const wrapper = mountView()

    const metrics = wrapper.findComponent({ name: 'DashboardMetrics' })
    expect(metrics.props('metrics')).toMatchObject({ totalProducts: 10 })

    const chartPanel = wrapper.findComponent({ name: 'DashboardChartPanel' })
    expect(chartPanel.props('movements')).toHaveLength(1)
  })

  it('shows the error message when present', () => {
    dashboardViewState.error.value = 'No fue posible cargar el dashboard.'

    const wrapper = mountView()

    expect(wrapper.find('.alert-stub').text()).toContain(
      'No fue posible cargar el dashboard.',
    )
  })

  it('renders the user name from the auth store', () => {
    const wrapper = mountView()

    expect(
      wrapper.findComponent({ name: 'AppNavbar' }).props('userName'),
    ).toBe('Ana Pérez')
  })

  it('falls back to the email when there is no name', () => {
    dashboardViewState.user.value = { email: 'ana@test.com' }

    const wrapper = mountView()

    expect(
      wrapper.findComponent({ name: 'AppNavbar' }).props('userName'),
    ).toBe('ana@test.com')
  })

  it('falls back to Usuario when there is no user data', () => {
    dashboardViewState.user.value = null

    const wrapper = mountView()

    expect(
      wrapper.findComponent({ name: 'AppNavbar' }).props('userName'),
    ).toBe('Usuario')
  })

  it('forwards the logout event to the logout function', async () => {
    const wrapper = mountView()

    const navbar = wrapper.findComponent({ name: 'AppNavbar' })

    await navbar.vm.$emit('logout')

    expect(dashboardViewState.logout).toHaveBeenCalledTimes(1)
  })

  it('passes the logging out state to the navbar', () => {
    dashboardViewState.loggingOut.value = true

    const wrapper = mountView()

    expect(
      wrapper.findComponent({ name: 'AppNavbar' }).props('loggingOut'),
    ).toBe(true)
  })
})