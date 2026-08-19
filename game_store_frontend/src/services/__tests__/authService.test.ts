import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildKeycloakLogoutUrl,
  redirectToKeycloakLogout,
} from '../authService'

describe('buildKeycloakLogoutUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_KEYCLOAK_URL', 'http://keycloak.test')
    vi.stubEnv('VITE_APP_URL', 'http://app.test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('builds a logout URL with the configured values', () => {
    const url = new URL(buildKeycloakLogoutUrl())

    expect(url.origin).toBe('http://keycloak.test')
    expect(url.pathname).toBe(
      '/realms/game-store/protocol/openid-connect/logout',
    )
    expect(url.searchParams.get('client_id')).toBe(
      'game-store-client',
    )
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(
      'http://app.test/login',
    )
  })

  it('falls back to defaults when no env vars are set', () => {
    vi.stubEnv('VITE_KEYCLOAK_URL', '')
    vi.stubEnv('VITE_APP_URL', '')

    const url = new URL(buildKeycloakLogoutUrl())

    expect(url.origin).toBe('http://localhost:8080')
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(
      'http://localhost:5173/login',
    )
  })
})

describe('redirectToKeycloakLogout', () => {
  it('calls the logout URL assignment without throwing', () => {
    const previousHref = window.location.href

    expect(() => redirectToKeycloakLogout()).not.toThrow()

    window.location.href = previousHref
  })
})