import { describe, expect, it } from 'vitest'
import {
  buildDistanceColumnsFromRegionPlaces,
  buildHotelDistanceColumnsFromFacilitySections,
  buildHotelListingDistanceColumns,
  classifyDistanceItem,
  hotelDistanceColumnsHaveItems,
  limitDistanceItemsByCategory,
  mergeHotelDistanceColumns,
} from './hotel-detail-demo-content'

describe('buildHotelDistanceColumnsFromFacilitySections', () => {
  it('groups provider distances by visitor intent and sorts by distance', () => {
    const result = buildHotelDistanceColumnsFromFacilitySections([
      {
        items: [
          'Denizli Airport: 66.4 km',
          'State Hospital: 4.8 km',
          'Rag Doll Museum: 3.8 km',
          'Recep Yazıcıoğlu Park: 1.4 km',
          'Central Pharmacy: 850 m',
        ],
      },
    ])

    expect(result.transport.map((item) => item.name)).toEqual(['Denizli Airport'])
    expect(result.surroundings.map((item) => item.name)).toEqual([
      'Central Pharmacy',
      'State Hospital',
    ])
    expect(result.historic.map((item) => item.name)).toEqual([
      'Recep Yazıcıoğlu Park',
      'Rag Doll Museum',
    ])
  })
})

describe('buildHotelListingDistanceColumns', () => {
  it('keeps nearby transport and merges service amenities', () => {
    const result = buildHotelListingDistanceColumns({
      nearbyPois: [
        { title: 'Aspendos', distance_km: 12, lat: 36.9, lng: 31.1 },
        { title: 'Antalya Havalimanı', distance_km: 38, lat: 36.9, lng: 30.8 },
        { title: 'Side Antik Tiyatro', distance_km: 4, lat: 36.77, lng: 31.39 },
      ],
      servicePois: {
        amenities: [{ type: 'pharmacy', label: 'Merkez Eczane', distance_km: 1.2 }],
        transport: [{ type: 'bus_station', label: 'Otogar', distance_km: 6 }],
      },
    })

    expect(result.historic.map((item) => item.name)).toEqual([
      'Side Antik Tiyatro',
      'Aspendos',
    ])
    expect(result.surroundings.map((item) => item.name)).toEqual(['Merkez Eczane'])
    expect(result.transport.map((item) => item.name)).toEqual([
      'Otogar',
      'Antalya Havalimanı',
    ])
  })

  it('keeps beaches, essentials and transport in their own subcategories', () => {
    const result = buildHotelListingDistanceColumns({
      nearbyPois: [
        { title: 'Limanağzı Plajı', summary: 'Plaj', category: 'beach', distance_km: 3.3, lat: 1, lng: 1 },
        { title: 'Muhtar Alışveriş Merkezi', summary: 'Süpermarket', category: 'market', distance_km: 2.8, lat: 1, lng: 1 },
        { title: 'Kaş Otogar', summary: 'Otogar', category: 'bus_station', distance_km: 3.1, lat: 1, lng: 1 },
      ],
      servicePois: { amenities: [], transport: [] },
    })

    expect(result.historic[0]).toMatchObject({ name: 'Limanağzı Plajı', category: 'beach' })
    expect(result.surroundings[0]).toMatchObject({ name: 'Muhtar Alışveriş Merkezi', category: 'market' })
    expect(result.transport[0]).toMatchObject({ name: 'Kaş Otogar', category: 'bus_station' })
  })
})

describe('distance subcategory limits', () => {
  it('selects three automatic items, popular extras and all manual additions', () => {
    const result = limitDistanceItemsByCategory([
      { name: 'A', distanceKm: 1, category: 'beach', popularity: 100 },
      { name: 'B', distanceKm: 2, category: 'beach', popularity: 95 },
      { name: 'C', distanceKm: 3, category: 'beach', popularity: 92 },
      { name: 'D', distanceKm: 4, category: 'beach', popularity: 90 },
      { name: 'E', distanceKm: 5, category: 'beach', popularity: 40 },
      { name: 'Manuel', distanceKm: 6, category: 'beach', manual: true },
    ])
    expect(result.map((item) => item.name)).toEqual(['A', 'B', 'C', 'D', 'Manuel'])
  })

  it('recognizes Turkish names without mixing columns', () => {
    expect(classifyDistanceItem('Limanağzı Plajı')).toMatchObject({ column: 'historic', category: 'beach' })
    expect(classifyDistanceItem('Muhtar Alışveriş Merkezi')).toMatchObject({ column: 'surroundings', category: 'market' })
    expect(classifyDistanceItem('Myra Antik Kenti')).toMatchObject({ column: 'historic', category: 'ruins' })
    expect(classifyDistanceItem('Kaş Limanı')).toMatchObject({ column: 'transport', category: 'port' })
  })
})

describe('buildDistanceColumnsFromRegionPlaces', () => {
  it('builds real name+km columns from listing-relative region places', () => {
    const result = buildDistanceColumnsFromRegionPlaces({
      categories: [
        {
          id: 'travel_ideas_db',
          types: [
            {
              googleType: 'beach',
              places: [{ name: 'Kaputaş Plajı', distanceKm: 8.2, lat: 36.2, lng: 29.4 }],
            },
            {
              googleType: 'museum',
              places: [{ name: 'Kaş Arkeoloji Müzesi', distanceKm: 1.1, lat: 36.2, lng: 29.6 }],
            },
          ],
        },
        {
          id: 'service_amenity_db',
          types: [
            {
              googleType: 'supermarket',
              places: [{ name: 'Migros', distanceKm: 0.6, lat: 36.2, lng: 29.63 }],
            },
          ],
        },
        {
          id: 'service_transport_db',
          types: [
            {
              googleType: 'airport',
              places: [{ name: 'Dalaman Havalimanı', distanceKm: 72, lat: 36.7, lng: 28.8 }],
            },
          ],
        },
      ],
    })

    expect(result.historic.map((item) => item.name)).toEqual([
      'Kaş Arkeoloji Müzesi',
      'Kaputaş Plajı',
    ])
    expect(result.surroundings.map((item) => item.name)).toEqual(['Migros'])
    expect(result.transport.map((item) => item.name)).toEqual(['Dalaman Havalimanı'])
    expect(hotelDistanceColumnsHaveItems(result)).toBe(true)
  })

  it('skips zero/invalid distances and AI-less empty data', () => {
    const result = buildDistanceColumnsFromRegionPlaces({
      categories: [
        {
          id: 'x',
          types: [
            {
              googleType: 'beach',
              places: [
                { name: 'Boş', distanceKm: 0 },
                { name: '', distanceKm: 2 },
                { name: 'Uzak', distanceKm: 120 },
              ],
            },
          ],
        },
      ],
    })
    expect(hotelDistanceColumnsHaveItems(result)).toBe(false)
  })
})

describe('mergeHotelDistanceColumns', () => {
  it('prefers primary items and fills gaps from fallback', () => {
    const merged = mergeHotelDistanceColumns(
      {
        historic: [{ name: 'Antik Tiyatro', distanceKm: 2 }],
        surroundings: [],
        transport: [{ name: 'Otogar', distanceKm: 5 }],
      },
      {
        historic: [{ name: 'Antik Tiyatro', distanceKm: 3 }, { name: 'Müze', distanceKm: 1 }],
        surroundings: [{ name: 'Market', distanceKm: 0.4 }],
        transport: [{ name: 'Havalimanı', distanceKm: 40 }],
      },
      8,
    )
    expect(merged.historic.map((i) => i.name)).toEqual(['Müze', 'Antik Tiyatro'])
    expect(merged.surroundings.map((i) => i.name)).toEqual(['Market'])
    expect(merged.transport.map((i) => i.name)).toEqual(['Otogar', 'Havalimanı'])
  })
})
