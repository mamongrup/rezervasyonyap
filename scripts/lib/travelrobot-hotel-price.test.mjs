import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildTravelrobotHotelRoomRows,
  extractHotelMinNightlyPrice,
  resolveOfferNightlyPrice,
} from './travelrobot-hotel-extras.mjs'

test('TotalAmount konaklama toplamı geceliğe bölünür (7 gece)', () => {
  const hotel = {
    CheckInDate: '2026-07-05',
    CheckOutDate: '2026-07-12',
    Rooms: [
      {
        RoomAlternatives: [
          {
            RoomName: 'Economy Twin',
            TotalAmount: 41_009,
            CurrencyCode: 'TRY',
            BoardType: 'BB',
          },
        ],
      },
    ],
  }
  const nightly = extractHotelMinNightlyPrice(hotel)
  assert.ok(nightly > 5_800 && nightly < 5_920, `expected ~5858, got ${nightly}`)
  const rows = buildTravelrobotHotelRoomRows(hotel)
  assert.equal(rows[0].dailyCalendar.length, 7)
  assert.equal(rows[0].dailyCalendar[0].price, nightly)
})

test('tek günlük satırda TotalAmount toplam ise geceliğe bölünür', () => {
  const alt = { TotalAmount: 28_000, DailyPrices: [{ Date: '2026-07-05', TotalAmount: 28_000 }] }
  const hotel = { CheckInDate: '2026-07-05', CheckOutDate: '2026-07-09' }
  const nightly = resolveOfferNightlyPrice(alt, {}, hotel)
  assert.equal(nightly, 7_000)
})
