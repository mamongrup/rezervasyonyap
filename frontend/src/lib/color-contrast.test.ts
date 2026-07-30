import { describe, expect, it } from 'vitest'
import { contrastRatio, ensureReadableColor, parseCssColorToRgb } from './color-contrast'

describe('color-contrast', () => {
  it('parses hex and rgb() colors', () => {
    expect(parseCssColorToRgb('#fb9204')).toEqual({ r: 251, g: 146, b: 4 })
    expect(parseCssColorToRgb('rgb(251, 146, 4)')).toEqual({ r: 251, g: 146, b: 4 })
    expect(parseCssColorToRgb('#c2410c')).toEqual({ r: 194, g: 65, b: 12 })
  })

  it('leaves already-accessible colors unchanged', () => {
    const dark = '#171717'
    expect(ensureReadableColor(dark, '#ffffff')).toBe(dark)
  })

  it('darkens a bright orange on white until AA contrast is met', () => {
    const bright = '#fb9204'
    const before = contrastRatio(parseCssColorToRgb(bright)!, { r: 255, g: 255, b: 255 })
    expect(before).toBeLessThan(4.5)

    const fixed = ensureReadableColor(bright, '#ffffff')
    const after = contrastRatio(parseCssColorToRgb(fixed)!, { r: 255, g: 255, b: 255 })
    expect(after).toBeGreaterThanOrEqual(4.5)
    // Aynı ton korunur (turuncu kalır, griye kaymaz)
    expect(fixed.toLowerCase()).not.toBe(bright.toLowerCase())
  })

  it('lightens a too-dark color on a dark background', () => {
    const tooDark = '#3a1c00'
    const fixed = ensureReadableColor(tooDark, '#171717')
    const after = contrastRatio(parseCssColorToRgb(fixed)!, { r: 23, g: 23, b: 23 })
    expect(after).toBeGreaterThanOrEqual(4.5)
  })

  it('returns input unchanged for invalid color', () => {
    expect(ensureReadableColor('not-a-color', '#ffffff')).toBe('not-a-color')
    expect(ensureReadableColor(undefined, '#ffffff')).toBe('')
  })
})
