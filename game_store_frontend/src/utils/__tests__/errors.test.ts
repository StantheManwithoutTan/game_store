import { describe, expect, it, vi } from 'vitest'

import axios from 'axios'

import { getApiErrorInformation } from '../errors'

vi.mock('axios')

describe('buildAxiosError', () => {
  it('returns the fallback message for a non-axios error', () => {
    const information = getApiErrorInformation(new Error('boom'))
    expect(information).toEqual({
      message: 'Ha ocurrido un error inesperado.',
    })
  })

  it('uses a custom fallback message', () => {
    const information = getApiErrorInformation(
      new Error('boom'),
      'Mensaje por defecto',
    )
    expect(information.message).toBe('Mensaje por defecto')
  })

  it('returns status and backend message for an axios error', () => {
    const mockedAxiosError = {
      isAxiosError: true,
      response: {
        status: 422,
        data: { message: 'Datos inv\u00e1lidos' },
      },
    }

    vi.mocked(axios.isAxiosError).mockReturnValue(true)

    const information = getApiErrorInformation(mockedAxiosError)
    expect(information).toEqual({
      status: 422,
      message: 'Datos inv\u00e1lidos',
    })
  })

  it('falls back when the axios error has no message', () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)

    const information = getApiErrorInformation({
      isAxiosError: true,
      response: { status: 500 },
    })
    expect(information).toEqual({
      status: 500,
      message: 'Ha ocurrido un error inesperado.',
    })
  })
})