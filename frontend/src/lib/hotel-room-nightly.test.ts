import { describe, expect, it } from 'vitest'
import {
  extractHotelRoomFeaturesFromMeta,
  hotelListingHasRoomScopedPrices,
  minHotelRoomOwnedNightly,
  resolveHotelRoomFallbackNightly,
  resolveHotelRoomNightlyForDay,
} from '@/lib/hotel-room-nightly'
import { computeHotelRoomStayQuote } from '@/lib/hotel-room-range-quote'
import { SYNTHETIC_HOTEL_ROOM_ID } from '@/lib/hotel-default-room'

describe('hotel-room-nightly', () => {
  const rules = [
    {
      id: '1',
      rule_json: JSON.stringify({
        base_nightly: '26040',
        room_name: 'Standart Süit',
        room_type_id: 'suite-1',
      }),
      valid_from: '2026-07-01',
      valid_to: '2026-10-31',
    },
    {
      id: '2',
      rule_json: JSON.stringify({
        base_nightly: '18200',
        room_name: 'Delüks İki Kişilik Oda',
      }),
      valid_from: '2026-07-01',
      valid_to: '2026-10-31',
    },
  ]

  it('resolves different nightlies per room from price rules', () => {
    expect(
      resolveHotelRoomNightlyForDay({
        ymd: '2026-07-15',
        roomName: 'Standart Süit',
        priceRules: rules,
      }),
    ).toBe(26040)
    expect(
      resolveHotelRoomNightlyForDay({
        ymd: '2026-07-15',
        roomName: 'Delüks İki Kişilik Oda',
        priceRules: rules,
      }),
    ).toBe(18200)
  })

  it('prefers seasonal_prices in room meta over listing min', () => {
    const meta = JSON.stringify({
      seasonal_prices: [
        {
          validFrom: '2026-07-01',
          validTo: '2026-10-31',
          nightlyPrice: 3300,
          currency: 'TRY',
        },
      ],
    })
    expect(
      resolveHotelRoomNightlyForDay({
        ymd: '2026-08-01',
        roomName: 'Deniz Manzaralı',
        metaJson: meta,
        priceRules: rules,
        allowUnscopedRules: false,
      }),
    ).toBe(3300)
  })

  it('does not copy listing fallback onto unpriced rooms when listing is room-scoped', () => {
    const n = resolveHotelRoomFallbackNightly({
      roomId: 'room-a',
      roomName: 'Delüks İki Kişilik Oda',
      metaJson: '{}',
      rangeStart: new Date(2026, 6, 1),
      rangeEnd: new Date(2026, 6, 8),
      priceRules: [rules[0]!],
      listingFallbackNightly: 26040,
      listingHasRoomScopedPrices: true,
    })
    // Delüks has its own rule in full rules set — with only suite rule, Delüks → 0
    expect(n).toBe(0)

    const priced = resolveHotelRoomFallbackNightly({
      roomId: 'room-b',
      roomName: 'Standart Süit',
      metaJson: '{}',
      rangeStart: new Date(2026, 6, 1),
      rangeEnd: new Date(2026, 6, 8),
      priceRules: [rules[0]!],
      listingFallbackNightly: 26040,
      listingHasRoomScopedPrices: true,
    })
    expect(priced).toBe(26040)
  })

  it('keeps listing fallback for synthetic default room', () => {
    expect(
      resolveHotelRoomFallbackNightly({
        roomId: SYNTHETIC_HOTEL_ROOM_ID,
        roomName: 'Standart Oda',
        listingFallbackNightly: 5000,
        listingHasRoomScopedPrices: false,
      }),
    ).toBe(5000)
  })

  it('minHotelRoomOwnedNightly ignores synthetic and unpriced rooms', () => {
    const min = minHotelRoomOwnedNightly({
      rooms: [
        { id: SYNTHETIC_HOTEL_ROOM_ID, name: 'Standart Oda', meta_json: '{}' },
        {
          id: 'r1',
          name: 'Deniz',
          meta_json: JSON.stringify({
            seasonal_prices: [{ nightlyPrice: 4200, validFrom: '2026-07-01', validTo: '2026-10-31' }],
          }),
        },
        {
          id: 'r2',
          name: 'Kara',
          meta_json: JSON.stringify({
            seasonal_prices: [{ nightlyPrice: 2800, validFrom: '2026-07-01', validTo: '2026-10-31' }],
          }),
        },
      ],
      rangeStart: new Date(2026, 6, 10),
      rangeEnd: new Date(2026, 6, 12),
    })
    expect(min).toBe(2800)
  })

  it('detects room-scoped catalog', () => {
    expect(
      hotelListingHasRoomScopedPrices({
        rooms: [{ id: '1', name: 'A', meta_json: '{}' }],
        priceRules: rules,
      }),
    ).toBe(true)
  })

  it('computes stay totals from per-room resolver without cloning fallback', () => {
    const start = new Date(2026, 6, 1, 12)
    const end = new Date(2026, 6, 8, 12)
    const suite = computeHotelRoomStayQuote([], start, end, 0, () => 26040)
    const deluxe = computeHotelRoomStayQuote([], start, end, 0, () => 18200)
    expect(suite.nights).toBe(7)
    expect(suite.total).toBe(26040 * 7)
    expect(deluxe.total).toBe(18200 * 7)
    expect(suite.total).not.toBe(deluxe.total)

    const missing = computeHotelRoomStayQuote([], start, end, 0, () => null)
    expect(missing.total).toBe(0)
  })

  it('extracts bed label from TatilBudur features', () => {
    const meta = JSON.stringify({
      features: ['1 çift kişilik yatak', 'Klima', 'Televizyon'],
    })
    const out = extractHotelRoomFeaturesFromMeta(meta)
    expect(out.bedType).toBe('1 çift kişilik yatak')
    expect(out.features).toHaveLength(3)
  })
})
