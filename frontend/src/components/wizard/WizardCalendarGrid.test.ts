import { describe, expect, it } from 'vitest'
import { buildMonthCells } from '@/components/wizard/WizardCalendarGrid'

describe('buildMonthCells', () => {
  it('keeps Sep 2026 day 30 inside September (not spilled into October)', () => {
    const sep = buildMonthCells(2026, 8) // 0-based month
    expect(sep).toHaveLength(30)
    expect(sep[0]).toEqual({ iso: '2026-09-01', wd: 1 }) // Tue
    expect(sep[29]).toEqual({ iso: '2026-09-30', wd: 2 }) // Wed

    const oct = buildMonthCells(2026, 9)
    expect(oct[0]).toEqual({ iso: '2026-10-01', wd: 3 }) // Thu
    expect(oct.some((c) => c.iso === '2026-09-30')).toBe(false)
  })

  it('formats February leap day without UTC shift', () => {
    const feb = buildMonthCells(2024, 1)
    expect(feb).toHaveLength(29)
    expect(feb[28]?.iso).toBe('2024-02-29')
  })
})
