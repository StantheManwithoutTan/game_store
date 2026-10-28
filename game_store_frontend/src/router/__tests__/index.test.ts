import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import router from '../index'

describe('router auth guard', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it.each([
    ['/dashboard', '/login'],
    ['/login', '/login'],
    ['/login/callback', '/login/callback'],
    ['/', '/login'],
  ])('routes unauthenticated users from %s to %s', async (path, expectedPath) => {
    await router.push(path)
    await router.isReady()

    expect(router.currentRoute.value.path).toBe(expectedPath)
  })

  it.each(['/productos', '/stock', '/herramientas/token'])('allows authenticated users into %s', async (path) => {
    localStorage.setItem('session_token', 'token-123')

    await router.push(path)
    await router.isReady()

    expect(router.currentRoute.value.path).toBe(path)
  })

})