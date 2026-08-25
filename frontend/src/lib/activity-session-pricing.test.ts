import { describe, expect, it } from 'vitest'

import {
  activitySessionsForSave,
  activityStartingPrice,
  syncSingleActivitySessionPrice,
} from '@/lib/activity-session-pricing'

const session = (price: string, active = true) => ({
  adult_price: price,
  currency_code: 'USD',
  is_active: active,
})

describe('activity session pricing', () => {
  it('derives the storefront starting price from active session fares', () => {
    expect(activityStartingPrice([session('160'), session('140'), session('90', false)])).toBe('140')
  })

  it('keeps a single session aligned with the editable starting price', () => {
    expect(syncSingleActivitySessionPrice([session('140')], '160', 'USD')).toEqual([
      session('160'),
    ])
  })

  it('does not overwrite independent prices when multiple sessions exist', () => {
    const sessions = [session('140'), session('180')]
    expect(syncSingleActivitySessionPrice(sessions, '160', 'USD')).toBe(sessions)
  })

  it('serializes a new session without a null child fare', () => {
    const saved = activitySessionsForSave(
      [{
        ...session('160'),
        valid_from: '2026-08-25',
        valid_to: '2026-11-30',
        start_time: '13:00',
        duration_minutes: '120',
        capacity: '8',
        child_price: '',
      }],
      'USD',
    )
    expect(saved[0]).toMatchObject({ adult_price: '160', child_price: '', currency_code: 'USD' })
  })
})
