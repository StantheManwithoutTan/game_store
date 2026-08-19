import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import api from '../api'

function resolvedResponse(config: unknown) {
  return {
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }
}

describe('api request interceptor', () => {
  const adapter = vi.fn()

  beforeEach(() => {
    adapter.mockReset()
    api.defaults.adapter = adapter
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('attaches the Bearer token when a session token exists', async () => {
    localStorage.setItem('session_token', 'token-123')
    adapter.mockResolvedValue(resolvedResponse({}))

    await api.get('/test', { headers: {} })

    const [config] = adapter.mock.calls[0]
    expect(config.headers.Authorization).toBe('Bearer token-123')
  })

  it('omits the Authorization header without a token', async () => {
    adapter.mockResolvedValue(resolvedResponse({}))

    await api.get('/test', { headers: {} })

    const [config] = adapter.mock.calls[0]
    expect(config.headers.Authorization).toBeUndefined()
  })
})

describe('api response interceptor', () => {
  const adapter = vi.fn()

  beforeEach(() => {
    adapter.mockReset()
    adapter.mockRejectedValue({ response: { status: 401 } })
    api.defaults.adapter = adapter
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('removes the token and redirects to /login on a 401', async () => {
    const location = {
      pathname: '/dashboard',
      href: 'http://localhost/dashboard',
    }
    vi.stubGlobal('location', location)
    localStorage.setItem('session_token', 'token-123')

    const error = await api.get('/test').catch((e) => e)

    expect(error.response.status).toBe(401)
    expect(localStorage.getItem('session_token')).toBeNull()
    expect(location.href).toBe('/login')
  })

  it('does not redirect when already on /login', async () => {
    const location = {
      pathname: '/login',
      href: 'http://localhost/login',
    }
    vi.stubGlobal('location', location)

    const error = await api.get('/test').catch((e) => e)

    expect(error.response.status).toBe(401)
    expect(location.href).toBe('http://localhost/login')
  })

  it('does not redirect when already on /login/callback', async () => {
    const location = {
      pathname: '/login/callback',
      href: 'http://localhost/login/callback',
    }
    vi.stubGlobal('location', location)

    const error = await api.get('/test').catch((e) => e)

    expect(error.response.status).toBe(401)
    expect(location.href).toBe('http://localhost/login/callback')
  })

  it('rejects non-401 errors without clearing the token', async () => {
    const location = {
      pathname: '/dashboard',
      href: 'http://localhost/dashboard',
    }
    vi.stubGlobal('location', location)
    localStorage.setItem('session_token', 'token-123')
    adapter.mockRejectedValue({ response: { status: 500 } })

    const error = await api.get('/test').catch((e) => e)

    expect(error.response.status).toBe(500)
    expect(localStorage.getItem('session_token')).toBe('token-123')
    expect(location.href).toBe('http://localhost/dashboard')
  })
})