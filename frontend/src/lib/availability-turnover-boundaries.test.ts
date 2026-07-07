import { describe, expect, it } from 'vitest'
import { applyTurnoverBoundaries } from './availability-turnover-boundaries'
import type { MergedCalendarRow } from './listing-availability-calendar-merge'

function row(day: string, am: boolean, pm: boolean): MergedCalendarRow {
  return {
    day,
    is_available: am || pm,
    am_available: am,
    pm_available: pm,
    price_override: '',
    weekday: 0,
    day_status: null,
  }
}

describe('applyTurnoverBoundaries', () => {
  it('opens first-day AM and last-day PM for a reservation-shaped block', () => {
    const out = applyTurnoverBoundaries([
      row('2026-08-09', true, true),
      row('2026-08-10', false, false),
      row('2026-08-11', false, false),
      row('2026-08-12', false, false),
      row('2026-08-13', false, false),
      row('2026-08-14', false, false),
      row('2026-08-15', false, false),
      row('2026-08-16', true, true),
    ])
    const by = new Map(out.map((r) => [r.day, r]))
    // ilk gün: sabah çıkış açık
    expect(by.get('2026-08-10')).toMatchObject({ am_available: true, pm_available: false })
    // son gün: öğleden sonra giriş açık
    expect(by.get('2026-08-15')).toMatchObject({ am_available: false, pm_available: true })
    // ara günler dokunulmadan tam blok
    expect(by.get('2026-08-12')).toMatchObject({ am_available: false, pm_available: false })
  })

  it('leaves a single-day full block untouched (maintenance)', () => {
    const out = applyTurnoverBoundaries([
      row('2026-08-09', true, true),
      row('2026-08-10', false, false),
      row('2026-08-11', true, true),
    ])
    expect(out.find((r) => r.day === '2026-08-10')).toMatchObject({
      am_available: false,
      pm_available: false,
    })
  })

  it('does not open boundaries at the edges (unknown neighbour)', () => {
    const out = applyTurnoverBoundaries([
      row('2026-08-10', false, false),
      row('2026-08-11', false, false),
      row('2026-08-12', true, true),
    ])
    // sol kenar komşusu bilinmiyor -> ilk gün açılmaz
    expect(out.find((r) => r.day === '2026-08-10')).toMatchObject({
      am_available: false,
      pm_available: false,
    })
  })

  it('keeps back-to-back blocks fully closed at the shared side', () => {
    // 10-12 blok, 12-14 blok bitişik: aradaki dış komşu (bir blok) dolu -> açılmaz
    const out = applyTurnoverBoundaries([
      row('2026-08-09', true, true),
      row('2026-08-10', false, false),
      row('2026-08-11', false, false),
      row('2026-08-12', true, true), // iki rezervasyon arası boş bırakılmış tampon
      row('2026-08-13', false, false),
      row('2026-08-14', false, false),
      row('2026-08-15', true, true),
    ])
    const by = new Map(out.map((r) => [r.day, r]))
    expect(by.get('2026-08-10')).toMatchObject({ am_available: true, pm_available: false })
    expect(by.get('2026-08-11')).toMatchObject({ am_available: false, pm_available: true })
    expect(by.get('2026-08-13')).toMatchObject({ am_available: true, pm_available: false })
    expect(by.get('2026-08-14')).toMatchObject({ am_available: false, pm_available: true })
  })
})
