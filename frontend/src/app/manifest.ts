import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rezervasyon Yap — Otel, Villa ve Tatil Rezervasyonu',
    short_name: 'Rezervasyon Yap',
    description: 'Türkiye ve dünyadaki en iyi otel, villa, tatil evi ve turlarda en uygun fiyatlarla güvenli online rezervasyon.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0284c7',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
