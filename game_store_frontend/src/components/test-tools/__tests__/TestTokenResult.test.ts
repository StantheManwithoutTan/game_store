import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import TestTokenResult from '../TestTokenResult.vue'

import type { TestTokenResponse } from '../../../types/testTools'

const result: TestTokenResponse = {
  token: 'eyJhbGciOiJIUzI1NiJ9.test',
  token_type: 'Bearer',
  roles: ['admin', 'analista'],
  expires_at: '2026-01-01T00:00:00Z',
  expires_in: 3600,
}

describe('TestTokenResult', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a placeholder when there is no result', () => {
    const wrapper = mount(TestTokenResult, {
      props: { result: null },
    })

    expect(wrapper.text()).toContain('Genera un token para verlo aquí.')
    expect(wrapper.find('.token-output').exists()).toBe(false)
  })

  it('renders the token, metadata and the curl command', () => {
    const wrapper = mount(TestTokenResult, {
      props: { result },
    })

    expect(wrapper.text()).toContain('2')
    expect(wrapper.find('#generated-token').element.value).toBe(
      result.token,
    )
    expect(wrapper.find('#curl-example').element.value).toContain(
      '-H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.test"',
    )
  })

  it('copies the token with feedback', async () => {
    const wrapper = mount(TestTokenResult, {
      props: { result },
    })

    const copyButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Copiar token')

    await copyButton?.trigger('click')

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      result.token,
    )
    expect(wrapper.text()).toContain('Token copiado.')
  })

  it('copies the curl command with feedback', async () => {
    const wrapper = mount(TestTokenResult, {
      props: { result },
    })

    const copyButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Copiar cURL')

    await copyButton?.trigger('click')

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('curl "http://localhost:5000/api/products/"'),
    )
    expect(wrapper.text()).toContain('cURL copiado.')
  })

  it('shows an error message when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    })

    const wrapper = mount(TestTokenResult, {
      props: { result },
    })

    const copyButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Copiar token')

    await copyButton?.trigger('click')

    expect(wrapper.text()).toContain(
      'No se pudo copiar. Hazlo manualmente.',
    )
  })
})