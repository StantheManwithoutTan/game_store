import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import TestTokenView from '../TestTokenView.vue'
import { generateTestToken } from '../../services/testToolsService'

import type { TestTokenResponse } from '../../types/testTools'

vi.mock('../../services/testToolsService', () => ({
  generateTestToken: vi.fn(),
}))

const result: TestTokenResponse = {
  token: 'eyJhbGciOiJIUzI1NiJ9.test',
  token_type: 'Bearer',
  roles: ['product:view'],
  expires_at: '2026-01-01T00:00:00Z',
  expires_in: 3600,
}

function mountView() {
  return mount(TestTokenView, {
    global: {
      stubs: {
        AppAlert: {
          name: 'AppAlert',
          props: ['type'],
          template: '<div class="alert-stub"><slot /></div>',
        },
        TestTokenForm: {
          name: 'TestTokenForm',
          props: ['generating'],
          template: '<div class="form-stub" />',
        },
        TestTokenResult: {
          name: 'TestTokenResult',
          props: ['result'],
          template: '<div class="result-stub" />',
        },
      },
    },
  })
}

const request = (overrides: Partial<{ roles: string[]; expires_minutes: number }> = {}) => ({
  roles: ['product:view'],
  expires_minutes: 15,
  ...overrides,
})

describe('TestTokenView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(generateTestToken).mockResolvedValue(result)
  })

  it('renders the form and an empty result initially', () => {
    const wrapper = mountView()

    expect(wrapper.find('.form-stub').exists()).toBe(true)
    expect(
      wrapper.findComponent({ name: 'TestTokenResult' }).props('result'),
    ).toBeNull()
  })

  it('generates a token and shows the success feedback', async () => {
    const wrapper = mountView()

    const form = wrapper.findComponent({ name: 'TestTokenForm' })

    form.vm.$emit('generate', request())
    await flushPromises()

    expect(generateTestToken).toHaveBeenCalledWith(request())
    expect(
      wrapper.findComponent({ name: 'TestTokenResult' }).props('result'),
    ).toEqual(result)
    expect(wrapper.find('.alert-stub').text()).toContain(
      'Token generado correctamente.',
    )
  })

  it('validates that at least one role is selected', async () => {
    const wrapper = mountView()

    const form = wrapper.findComponent({ name: 'TestTokenForm' })

    form.vm.$emit('generate', { roles: [], expires_minutes: 15 })
    await flushPromises()

    expect(generateTestToken).not.toHaveBeenCalled()
    expect(wrapper.find('.alert-stub').text()).toContain(
      'Selecciona por lo menos un permiso.',
    )
  })

  it('reports when the test tools are disabled', async () => {
    vi.mocked(generateTestToken).mockRejectedValue({
      response: { status: 404, data: {} },
    })

    const wrapper = mountView()

    const form = wrapper.findComponent({ name: 'TestTokenForm' })

    form.vm.$emit('generate', request())
    await flushPromises()

    expect(wrapper.find('.alert-stub').text()).toContain(
      'Las herramientas de prueba están deshabilitadas.',
    )
  })

  it('reports when the user lacks permission', async () => {
    vi.mocked(generateTestToken).mockRejectedValue({
      response: { status: 403, data: {} },
    })

    const wrapper = mountView()

    const form = wrapper.findComponent({ name: 'TestTokenForm' })

    form.vm.$emit('generate', request())
    await flushPromises()

    expect(wrapper.find('.alert-stub').text()).toContain(
      'Tu usuario no tiene permiso para generar tokens.',
    )
  })

  it('shows the backend message for other errors', async () => {
    vi.mocked(generateTestToken).mockRejectedValue({
      response: { status: 400, data: { message: 'Solicitud inválida' } },
    })

    const wrapper = mountView()

    const form = wrapper.findComponent({ name: 'TestTokenForm' })

    form.vm.$emit('generate', request())
    await flushPromises()

    expect(wrapper.find('.alert-stub').text()).toContain(
      'Solicitud inválida',
    )
  })

  it('shows the backend error field when the message is missing', async () => {
    vi.mocked(generateTestToken).mockRejectedValue({
      response: { status: 400, data: { error: 'Datos inválidos' } },
    })

    const wrapper = mountView()

    const form = wrapper.findComponent({ name: 'TestTokenForm' })

    form.vm.$emit('generate', request())
    await flushPromises()

    expect(wrapper.find('.alert-stub').text()).toContain(
      'Datos inválidos',
    )
  })

  it('shows a generic message when the error has no details', async () => {
    vi.mocked(generateTestToken).mockRejectedValue(new Error('network down'))

    const wrapper = mountView()

    const form = wrapper.findComponent({ name: 'TestTokenForm' })

    form.vm.$emit('generate', request())
    await flushPromises()

    expect(wrapper.find('.alert-stub').text()).toContain(
      'No fue posible generar el token.',
    )
  })

  it('clears the previous result when a new generation fails', async () => {
    const wrapper = mountView()

    const form = wrapper.findComponent({ name: 'TestTokenForm' })

    form.vm.$emit('generate', request())
    await flushPromises()

    expect(
      wrapper.findComponent({ name: 'TestTokenResult' }).props('result'),
    ).toEqual(result)

    vi.mocked(generateTestToken).mockRejectedValue(new Error('boom'))

    form.vm.$emit('generate', request())
    await flushPromises()

    expect(
      wrapper.findComponent({ name: 'TestTokenResult' }).props('result'),
    ).toBeNull()
  })

  it('passes the generating state to the form while a request is pending', async () => {
    let resolveRequest!: (value: TestTokenResponse) => void
    vi.mocked(generateTestToken).mockImplementation(
      () =>
        new Promise<TestTokenResponse>((resolve) => {
          resolveRequest = resolve
        }),
    )

    const wrapper = mountView()

    const form = wrapper.findComponent({ name: 'TestTokenForm' })

    form.vm.$emit('generate', request())
    await flushPromises()

    expect(form.props('generating')).toBe(true)

    resolveRequest(result)
    await flushPromises()

    expect(form.props('generating')).toBe(false)
    expect(
      wrapper.findComponent({ name: 'TestTokenResult' }).props('result'),
    ).toEqual(result)
  })
})