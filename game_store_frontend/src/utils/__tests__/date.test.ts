import { describe, expect, it } from 'vitest'

import { formatDateTime } from '../date'

describe('formatDateTime', () => {
  it('formats a valid ISO date', () => {
    const formatted = formatDateTime('2026-01-15T10:30:00Z')
    expect(formatted).not.toBe('Fecha inv\u00e1lida')
    expect(formatted).toMatch(/\d{4}/)
  })

  it('returns Fecha inv\u00e1lida for an unparseable date', () => {
    expect(formatDateTime('not-a-date')).toBe(
      'Fecha inv\u00e1lida',
    )
  })
})