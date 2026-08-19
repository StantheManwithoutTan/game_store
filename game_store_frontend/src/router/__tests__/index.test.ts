import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import router from '../index'

describe('router auth guard', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('redirects unauthenticated users to /login', async () => {
    await router.push('/dashboard')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('allows /login without a token', async () => {
    await router.push('/login')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('allows /login/callback without a token', async () => {
    await router.push('/login/callback')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/login/callback')
  })

  it('allows authenticated users into protected routes', async () => {
    localStorage.setItem('session_token', 'token-123')

    await router.push('/productos')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/productos')
  })

  it('allows authenticated users into /stock', async () => {
    localStorage.setItem('session_token', 'token-123')

    await router.push('/stock')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/stock')
  })

  it('allows authenticated users into /herramientas/token', async () => {
    localStorage.setItem('session_token', 'token-123')

    await router.push('/herramientas/token')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/herramientas/token')
  })

  it('redirects the root path to /login', async () => {
    await router.push('/')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/login')
  })
})