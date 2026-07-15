import { describe, expect, it } from 'vitest'
import { buildHotelDistanceColumnsFromFacilitySections } from './hotel-detail-demo-content'

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
