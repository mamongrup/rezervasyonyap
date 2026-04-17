import type { Metadata } from 'next'
import RegionPlacesClient from './RegionPlacesClient'

export const metadata: Metadata = {
  title: 'Bölge Yakın Mekanlar',
  description: 'Google Maps ile bölge koordinatlarından kategori bazlı yakın mekan sorgulama.',
}

export default function Page() {
  return <RegionPlacesClient />
}
