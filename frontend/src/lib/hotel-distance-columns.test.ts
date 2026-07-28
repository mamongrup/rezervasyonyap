import { describe, expect, it } from 'vitest'
import {
  buildHotelDistanceColumnsFromFacilitySections,
  buildHotelListingDistanceColumns,
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
})
