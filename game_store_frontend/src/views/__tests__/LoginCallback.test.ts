import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import LoginCallback from '../LoginCallback.vue'

const { pushMock, authStoreMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  authStoreMock: { loginWithKeycloak: vi.fn() },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('../../stores/auth', () => ({
  useAuthStore: () => authStoreMock,
}))

describe('LoginCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStoreMock.loginWithKeycloak.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exchanges the code and navigates to the dashboard', async () => {
    vi.stubGlobal('location', { search: '?code=secret-code' })

    mount(LoginCallback)

    await flushPromises()

    expect(authStoreMock.loginWithKeycloak).toHaveBeenCalledWith(
      'secret-code',
    )
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
  })

  it('navigates to /login when the exchange fails', async () => {
    vi.stubGlobal('location', { search: '?code=bad-code' })
    authStoreMock.loginWithKeycloak.mockRejectedValue(
      new Error('invalid grant'),
    )

    mount(LoginCallback)

    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith('/login')
  })

  it('does nothing when there is no code', async () => {
    vi.stubGlobal('location', { search: '' })

    mount(LoginCallback)

    await flushPromises()

    expect(authStoreMock.loginWithKeycloak).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })
})