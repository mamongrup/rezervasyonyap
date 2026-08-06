import { describe, expect, it } from 'vitest'
import { repairTurkishLocationAscii } from './repair-turkish-location-ascii'

describe('repairTurkishLocationAscii', () => {
  it('fixes Bayındır address corruption from map/meta fields', () => {
    expect(repairTurkishLocationAscii('Bay?nd?r, Kaş/Antalya, Türkiye')).toBe(
      'Bayındır, Kaş/Antalya, Türkiye',
    )
  })

  it('fixes common place names', () => {
    expect(repairTurkishLocationAscii('?slamlar, Ka?, T?rkiye')).toBe('İslamlar, Kaş, Türkiye')
  })
})
