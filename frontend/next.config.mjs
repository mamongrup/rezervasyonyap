import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildAllSecurityHeaders } from './security-headers.mjs'

/** Monorepo kökünde (üst dizinde) package.json varken Turbopack varsayılan olarak orayı "repo root" sayıp tailwindcss'i oradan arıyor; kökte node_modules yoksa derleme düşer. Çözümlemeyi bu Next uygulamasının klasörüne kilitle. */
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const imageRemoteHost = process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOST
const extraImageHost =
  typeof imageRemoteHost === 'string' && imageRemoteHost.trim() !== ''
    ? [
        {
          protocol: 'https',
          hostname: imageRemoteHost.replace(/^https?:\/\//, '').split('/')[0].split(':')[0],
          port: '',
          pathname: '/**',
        },
      ]
    : []

const nextConfig = {
  /** Düşük kaynaklı VPS / uzak API: SSG sayfa üretimi 60 sn’de kesilmesin (manage çok dillı rotalar). */
  staticPageGenerationTimeout: 300,
  reactStrictMode: false,
  poweredByHeader: false,
  /** gzip/brotli fallback — Apache/Nginx bunu zaten yapıyor ama SSR response buffer’ı için ek kat. */
  compress: true,
  /** LCP için server response küçük tutulur; `<Image>` responsive srcset’i Apache cache’iyle birleşir. */
  productionBrowserSourceMaps: false,
  turbopack: {
    root: __dirname,
    resolveAlias: {
      // Mutlak yol (`path.resolve`) Turbopack’te `./opt/...` gibi bozuluyor; kök `__dirname` ile göreli bırak.
      picocolors: './node_modules/picocolors',
    },
  },
  webpack: (config, { dev }) => {
    /** Düşük RAM / Windows: PackFileCacheStrategy "Array buffer allocation failed" — dev’de kalıcı cache kapatılır */
    if (dev) {
      config.cache = false
    }
    config.resolve = config.resolve ?? {}
    config.resolve.modules = [
      ...(config.resolve.modules ?? []),
      path.resolve(__dirname, 'node_modules'),
    ]
    return config
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: buildAllSecurityHeaders(),
      },
    ]
  },
  experimental: {
    /**
     * `optimizeCss` (beasties) bazı sayfalarda critical CSS üretirken büyük <style> blok inline eder
     * ve LCP’yi **kötüleştirebilir** (özellikle Tailwind + çok modüllü homepage). Kapalı tutuyoruz.
     * İhtiyaç olursa `CSS_OPTIMIZE=1` env ile açılır.
     */
    optimizeCss: process.env.CSS_OPTIMIZE === '1',
    optimizePackageImports: [
      'lucide-react',
      'lodash',
      '@hugeicons/react',
      '@hugeicons/core-free-icons',
      'framer-motion',
      'date-fns',
      'react-datepicker',
      'embla-carousel-react',
      'rc-slider',
      '@tiptap/react',
      '@tiptap/starter-kit',
      'react-icons',
    ],
  },
  images: {
    /**
     * Migration sonrası TÜM resimler zaten AVIF (1600px, quality 72) olarak
     * `public/uploads/**` altında. Next.js image optimizer'ın `/_next/image?...`
     * transformasyonu her istekte server'ı yoruyor ve ilk yüklemede LCP'yi 5+ sn'ye
     * çekiyordu. Direk serve → Apache/Nginx statik cache + HTTP/2 ile çok daha hızlı.
     * İleride optimize edilmesi gereken (non-AVIF) resim eklersek tekrar açılabilir.
     */
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400 * 3,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'a0.muscache.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.gstatic.com',
        port: '',
        pathname: '/**',
      },
      ...extraImageHost,
    ],
  },
}

export default nextConfig
