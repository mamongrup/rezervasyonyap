import { describe, expect, it } from 'vitest'

import {
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
})
