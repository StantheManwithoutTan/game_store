import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { apiMock } from '../../services/__tests__/apiMock'

import { useAuthStore } from '../auth'

vi.mock('../../services/api', () => ({
  default: apiMock,
}))

const loginResponse = {
  data: {
    access_token: 'access',
    id_token: 'id',
    session_token: 'session',
    user: { name: 'Ada', email: 'ada@example.com' },
    refresh_token: 'refresh',
  },
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('loginWithKeycloak', () => {
    it('stores the tokens and user on success', async () => {
      apiMock.post.mockResolvedValue(loginResponse)

      const store = useAuthStore()
      await store.loginWithKeycloak('code-123')

      expect(apiMock.post).toHaveBeenCalledWith('/auth/login', {
        code: 'code-123',
      })
      expect(store.accessToken).toBe('access')
      expect(store.idToken).toBe('id')
      expect(store.sessionToken).toBe('session')
      expect(store.user).toEqual({
        name: 'Ada',
        email: 'ada@example.com',
      })
      expect(store.refreshToken).toBe('refresh')
      expect(localStorage.getItem('session_token')).toBe('session')
    })

    it('keeps a null session token out of localStorage', async () => {
      apiMock.post.mockResolvedValue({
        data: {
          access_token: 'access',
          id_token: 'id',
          session_token: null,
          user: null,
          refresh_token: 'refresh',
        },
      })

      const store = useAuthStore()
      await store.loginWithKeycloak('code-123')

      expect(store.sessionToken).toBeNull()
      expect(localStorage.getItem('session_token')).toBeNull()
    })

    it('throws when the request fails', async () => {
      apiMock.post.mockRejectedValue(new Error('network'))

      const store = useAuthStore()
      await expect(store.loginWithKeycloak('code-123')).rejects.toThrow(
        'network',
      )
    })
  })

  describe('logout', () => {
    it('clears the state even when the request fails', async () => {
      localStorage.setItem('session_token', 'session')
      apiMock.post.mockRejectedValue(new Error('network'))

      const store = useAuthStore()
      store.accessToken = 'access'
      store.refreshToken = 'refresh'

      await expect(store.logout()).rejects.toThrow('network')

      expect(store.accessToken).toBeNull()
      expect(store.sessionToken).toBeNull()
      expect(store.user).toBeNull()
      expect(localStorage.getItem('session_token')).toBeNull()
    })

    it('posts the refresh token to logout', async () => {
      const store = useAuthStore()
      store.refreshToken = 'refresh-xyz'
      apiMock.post.mockResolvedValue({})

      await store.logout()

      expect(apiMock.post).toHaveBeenCalledWith('/auth/logout', {
        refresh_token: 'refresh-xyz',
      })
    })
  })
})