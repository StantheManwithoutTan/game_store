import { describe, expect, it } from 'vitest'

import {
  getMovementClass,
  getMovementLabel,
  normalizeMovementType,
} from '../movement'

describe('normalizeMovementType', () => {
  it('trims and lowercases the type', () => {
    expect(normalizeMovementType('  ENTRADA ')).toBe('entrada')
  })
})

describe('getMovementLabel', () => {
  it('returns Entrada for entrada', () => {
    expect(getMovementLabel('entrada')).toBe('Entrada')
  })

  it('returns Salida for salida', () => {
    expect(getMovementLabel('SALIDA')).toBe('Salida')
  })

  it('returns Ajuste for ajuste', () => {
    expect(getMovementLabel('ajuste')).toBe('Ajuste')
  })

  it('returns Desconocido for unknown types', () => {
    expect(getMovementLabel('otro')).toBe('Desconocido')
  })
})

describe('getMovementClass', () => {
  it('returns movement-entry for entrada', () => {
    expect(getMovementClass('entrada')).toBe('movement-entry')
  })

  it('returns movement-exit for salida', () => {
    expect(getMovementClass('salida')).toBe('movement-exit')
  })

  it('returns movement-adjustment for ajuste', () => {
    expect(getMovementClass('ajuste')).toBe('movement-adjustment')
  })

  it('returns movement-unknown for unknown types', () => {
    expect(getMovementClass('otro')).toBe('movement-unknown')
  })
})