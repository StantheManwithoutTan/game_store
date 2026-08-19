import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import LoginView from '../LoginView.vue'

describe('LoginView', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_APP_URL', 'http://app.test')
    vi.stubEnv('VITE_KEYCLOAK_URL', 'http://keycloak.test')
    vi.stubGlobal('location', {
      pathname: '/login',
      href: 'http://localhost/login',
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('renders the login card', () => {
    const wrapper = mount(LoginView)

    expect(wrapper.text()).toContain('Game Store Inventory')
    expect(wrapper.find('button').text()).toBe('Iniciar sesión')
  })

  it('redirects to the Keycloak login page on click', async () => {
    const wrapper = mount(LoginView)

    await wrapper.find('button').trigger('click')

    expect(window.location.href).toBe(
      'http://keycloak.test/realms/game-store/protocol/openid-connect/auth' +
        '?client_id=game-store-client' +
        '&redirect_uri=http%3A%2F%2Fapp.test%2Flogin%2Fcallback' +
        '&response_type=code' +
        '&scope=openid',
    )
  })

  it('falls back to the default URLs when env vars are missing', () => {
    vi.stubEnv('VITE_APP_URL', '')
    vi.stubEnv('VITE_KEYCLOAK_URL', '')

    const wrapper = mount(LoginView)

    const button = wrapper.find('button')
    button.trigger('click')

    expect(window.location.href).toBe(
      'http://localhost:8080/realms/game-store/protocol/openid-connect/auth' +
        '?client_id=game-store-client' +
        '&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Flogin%2Fcallback' +
        '&response_type=code' +
        '&scope=openid',
    )
  })
})