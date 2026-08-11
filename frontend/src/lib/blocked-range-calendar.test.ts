import { describe, expect, it } from 'vitest'
import { buildBlockedRangeCalendarDays } from './blocked-range-calendar'

describe('buildBlockedRangeCalendarDays', () => {
  it('keeps check-in and checkout boundaries as half days', () => {
    const days = buildBlockedRangeCalendarDays([
      { days: ['2026-08-03', '2026-08-04', '2026-08-05'] },
    ])

    expect(days).toEqual([
      expect.objectContaining({ day: '2026-08-03', is_available: true, am_available: true, pm_available: false }),
      expect.objectContaining({ day: '2026-08-04', is_available: false, am_available: false, pm_available: false }),
      expect.objectContaining({ day: '2026-08-05', is_available: true, am_available: false, pm_available: true }),
    ])
  })

  it('marks a shared checkout/check-in boundary as turnover', () => {
    const days = buildBlockedRangeCalendarDays([
      { days: ['2026-08-03', '2026-08-04', '2026-08-05'] },
      { days: ['2026-08-05', '2026-08-06', '2026-08-07'] },
    ])

    expect(days.find((day) => day.day === '2026-08-05')).toMatchObject({
      is_available: true,
      am_available: false,
      pm_available: false,
    })
  })

  it('keeps a single-day closure fully blocked', () => {
    const days = buildBlockedRangeCalendarDays([{ days: ['2026-08-10'] }])
    expect(days[0]).toMatchObject({
      is_available: false,
      am_available: false,
      pm_available: false,
    })
  })

  it('does not invent a half-day boundary when a range is clipped by the sync window', () => {
    const days = buildBlockedRangeCalendarDays([
      {
        days: ['2026-08-10', '2026-08-11'],
        includesStartBoundary: false,
        includesEndBoundary: true,
        singleDayClosure: false,
      },
    ])
    expect(days[0]).toMatchObject({
      is_available: false,
      am_available: false,
      pm_available: false,
    })
    expect(days[1]).toMatchObject({
      is_available: true,
      am_available: false,
      pm_available: true,
    })
  })
})
