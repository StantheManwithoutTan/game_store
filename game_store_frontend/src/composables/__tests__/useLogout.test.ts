import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLogout } from '../useLogout'
import { redirectToKeycloakLogout } from '../../services/authService'

const { authStoreMock } = vi.hoisted(() => ({
  authStoreMock: { logout: vi.fn() },
}))

vi.mock('../../services/authService', () => ({
  redirectToKeycloakLogout: vi.fn(),
  buildKeycloakLogoutUrl: vi.fn(),
}))

vi.mock('../../stores/auth', () => ({
  useAuthStore: () => authStoreMock,
}))

describe('useLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStoreMock.logout.mockResolvedValue(undefined)
  })

  it('logs out the session and redirects to Keycloak', async () => {
    const { loggingOut, logout } = useLogout()

    const promise = logout()

    expect(loggingOut.value).toBe(true)

    await promise

    expect(authStoreMock.logout).toHaveBeenCalledTimes(1)
    expect(redirectToKeycloakLogout).toHaveBeenCalledTimes(1)
    expect(loggingOut.value).toBe(true)
  })

  it('ignores concurrent calls while a logout is in progress', async () => {
    let resolveLogout!: () => void
    authStoreMock.logout.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLogout = resolve
        }),
    )

    const { logout } = useLogout()

    const first = logout()
    const second = logout()

    await Promise.resolve()

    expect(authStoreMock.logout).toHaveBeenCalledTimes(1)

    resolveLogout()
    await first
    await second
  })

  it('still redirects to Keycloak when logout fails', async () => {
    authStoreMock.logout.mockRejectedValue(new Error('boom'))

    const { loggingOut, logout } = useLogout()

    await expect(logout()).rejects.toThrow('boom')

    expect(redirectToKeycloakLogout).toHaveBeenCalledTimes(1)
    expect(loggingOut.value).toBe(true)
  })
})