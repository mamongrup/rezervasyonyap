export type ServicePoiTypeDef = {
  type: string
  label: string
  googleType: string
  radius: number
  category: 'amenity' | 'transport'
}

export const DEFAULT_SERVICE_POI_TYPES: ServicePoiTypeDef[] = [
  { type: 'market', label: 'Market', googleType: 'grocery_or_supermarket', radius: 5000, category: 'amenity' },
  { type: 'restoran', label: 'Restoran', googleType: 'restaurant', radius: 5000, category: 'amenity' },
  { type: 'eczane', label: 'Eczane', googleType: 'pharmacy', radius: 15000, category: 'amenity' },
  { type: 'havalimani', label: 'Havalimanı', googleType: 'airport', radius: 200000, category: 'transport' },
  { type: 'otogar', label: 'Otogar / Otobüs Terminali', googleType: 'bus_station', radius: 50000, category: 'transport' },
  { type: 'minibus', label: 'Minibüs / Dolmuş', googleType: 'transit_station', radius: 5000, category: 'transport' },
]

export function servicePoiTypeFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}
