import assert from 'node:assert/strict'
import test from 'node:test'

import { withVillaShortStayFeeMeta } from './bravo-holiday-home-map.mjs'

test('maps legacy villa cleaning fee to short-stay fields', () => {
  assert.deepEqual(
    withVillaShortStayFeeMeta({ tourism_cert_no: '123' }, { cleaningFee: 150, minStayNights: 5 }),
    {
      tourism_cert_no: '123',
      short_stay_fee: '150',
    },
  )
})

test('prefers explicit short-stay values and preserves unrelated metadata', () => {
  assert.deepEqual(
    withVillaShortStayFeeMeta(
      { check_in: '16:00' },
      { cleaningFee: 100, shortStayFee: 125, minStayNights: 5, minShortStayNights: 4 },
    ),
    {
      check_in: '16:00',
      short_stay_fee: '125',
      min_short_stay_nights: '4',
    },
  )
})

test('does not invent short-stay metadata when no fee is supplied', () => {
  assert.deepEqual(withVillaShortStayFeeMeta({ check_out: '10:00' }, {}), { check_out: '10:00' })
})
