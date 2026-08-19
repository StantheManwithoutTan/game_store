import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiMock } from './apiMock'

import { generateTestToken } from '../testToolsService'

vi.mock('../api', () => ({
  default: apiMock,
}))

describe('testToolsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts the request and returns the generated token', async () => {
    const request = {
      product_id: 1,
      days: 7,
      role: 'admin' as const,
    }
    const response = { token: 'custom-token', expires_in: 3600 }

    apiMock.post.mockResolvedValue({ data: response })

    await expect(generateTestToken(request)).resolves.toEqual(response)

    expect(apiMock.post).toHaveBeenCalledWith(
      '/api/test-tools/token',
      request,
    )
  })
})