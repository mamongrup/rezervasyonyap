import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyOsmElement,
  clusterListings,
  haversineKm,
  selectPoisForListing,
} from './refresh-all-holiday-home-nearby-pois.mjs'

test('classifies every requested visitor category', () => {
  const cases = [
    [{ natural: 'beach', name: 'Kaputaş' }, 'beach'],
    [{ historic: 'archaeological_site', name: 'Xanthos' }, 'ruins'],
    [{ tourism: 'museum', name: 'Kaş Müzesi' }, 'historic'],
    [{ shop: 'supermarket', name: 'Migros' }, 'market'],
    [{ amenity: 'restaurant', name: 'Lokanta' }, 'restaurant'],
    [{ amenity: 'hospital', name: 'Devlet Hastanesi' }, 'hospital'],
    [{ amenity: 'pharmacy', name: 'Merkez Eczanesi' }, 'pharmacy'],
    [{ aeroway: 'aerodrome', name: 'Dalaman Havalimanı' }, 'airport'],
    [{ amenity: 'bus_station', name: 'Otogar' }, 'bus_station'],
    [{ leisure: 'marina', name: 'Kaş Marina' }, 'port'],
  ]
  for (const [tags, expected] of cases) {
    const result = classifyOsmElement({ type: 'node', id: expected, lat: 36, lon: 29, tags })
    assert.equal(result?.category, expected)
  }
})

test('selects balanced automatic groups and preserves manual additions', () => {
  const listing = { map_lat: 36, map_lng: 29 }
  const pois = [
    ...Array.from({ length: 5 }, (_, index) => ({
      title: `Plaj ${index}`,
      category: 'beach',
      popularity: 80 + index,
      place_id: `beach-${index}`,
      lat: 36 + index * 0.001,
      lng: 29,
      manual: false,
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      title: `Market ${index}`,
      category: 'market',
      popularity: 80,
      place_id: `market-${index}`,
      lat: 36,
      lng: 29 + (index + 1) * 0.001,
      manual: false,
    })),
  ]
  const selected = selectPoisForListing(listing, pois, [
    {
      title: 'Manuel Plaj',
      category: 'beach',
      manual: true,
      distance_km: 4.2,
      lat: 36,
      lng: 29,
    },
  ])
  assert.equal(selected.filter((poi) => poi.category === 'beach' && !poi.manual).length, 3)
  assert.equal(selected.filter((poi) => poi.category === 'market').length, 3)
  assert.equal(selected.some((poi) => poi.title === 'Manuel Plaj' && poi.manual), true)
})

test('clusters listings geographically and computes distances', () => {
  const clusters = clusterListings([
    { id: 'a', map_lat: 36.1, map_lng: 29.1 },
    { id: 'b', map_lat: 36.11, map_lng: 29.11 },
    { id: 'c', map_lat: 37.0, map_lng: 30.0 },
  ])
  assert.equal(clusters.length, 2)
  assert.ok(haversineKm(36.186493, 29.6819641, 36.2139179, 29.6765547) > 2)
})
