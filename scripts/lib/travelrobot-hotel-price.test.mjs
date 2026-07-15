import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildTravelrobotHotelRoomRows,
  extractHotelMinNightlyPrice,
  matchTravelrobotRoomGalleryImages,
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

test('otel galerisindeki oda fotoğrafı doğru oda tipiyle eşleştirilir', () => {
  const images = matchTravelrobotRoomGalleryImages(
    [
      { url: 'https://cdn.example/pool.jpg', title: 'Outdoor swimming pool' },
      {
        url: 'https://cdn.example/1-bedroom-double-suite-king.jpg',
        title: '1 Bedroom Double Suite - King Bed',
      },
      { url: 'https://cdn.example/lobby.jpg', title: 'Hotel lobby' },
    ],
    '1 Bedroom Double Suite (full double bed) (king size bed)',
  )
  assert.deepEqual(images, ['https://cdn.example/1-bedroom-double-suite-king.jpg'])
})

test('oda teklifi görselsizse GetHotelDetails galerisindeki eşleşen fotoğraf meta_jsona eklenir', () => {
  const rows = buildTravelrobotHotelRoomRows({
    HotelImages: [
      { Url: 'https://cdn.example/deluxe-double-room-1.jpg', ImageTitle: 'Deluxe Double Room' },
      { Url: 'https://cdn.example/restaurant.jpg', ImageTitle: 'Restaurant' },
    ],
    Rooms: [
      {
        Name: 'Deluxe Double Room',
        RoomAlternatives: [{ RoomName: 'Deluxe Double Room', TotalAmount: 5_000 }],
      },
    ],
  })
  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0].meta.images, ['https://cdn.example/deluxe-double-room-1.jpg'])
  assert.equal(rows[0].meta.image, 'https://cdn.example/deluxe-double-room-1.jpg')
})

test('galerinin Src ve RoomType alanları da oda görseli olarak okunur', () => {
  const rows = buildTravelrobotHotelRoomRows({
    HotelImages: [
      {
        Src: 'https://cdn.example/media/91725',
        RoomType: 'Family Suite',
      },
    ],
    Rooms: [{ Name: 'Family Suite' }],
  })

  assert.deepEqual(rows[0].meta.images, ['https://cdn.example/media/91725'])
})
