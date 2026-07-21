import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { buildAllSecurityHeaders } from './security-headers.mjs'

/**
 * Next.js bundle'ı içindeki webpack'e erişim — üst-düzey `webpack` paketini
 * dependency yapmadan `NormalModuleReplacementPlugin`'i kullanmak için.
 */
const requireFromHere = createRequire(import.meta.url)
let nextWebpack = null
try {
  nextWebpack = requireFromHere('next/dist/compiled/webpack/webpack.js')
  if (typeof nextWebpack.init === 'function') nextWebpack.init()
} catch {
  /* webpack erişilemezse plugin atlanır, build kırılmaz. */
}

/** Monorepo kökünde (üst dizinde) package.json varken Turbopack varsayılan olarak orayı "repo root" sayıp tailwindcss'i oradan arıyor; kökte node_modules yoksa derleme düşer. Çözümlemeyi bu Next uygulamasının klasörüne kilitle. */
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
/** Domain taşımada: `NEXT_PUBLIC_IMAGE_REMOTE_HOST` yok + `CSP_CDN_AUTO=1` → `https://cdn.<site>` (SITE_URL’den) */
function derivedCdnImageUrl() {
  const auto =
    process.env.CSP_CDN_AUTO === '1' ||
    process.env.CSP_CDN_AUTO === 'true' ||
    process.env.NEXT_PUBLIC_CDN_AUTO === '1' ||
    process.env.NEXT_PUBLIC_CDN_AUTO === 'true'
  if (!auto) return ''
  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  if (!site) return ''
  try {
    const u = new URL(site)
    let host = u.hostname
    if (host.startsWith('www.')) host = host.slice(4)
    const sub = (process.env.CSP_CDN_SUBDOMAIN || process.env.NEXT_PUBLIC_CDN_SUBDOMAIN || 'cdn')
      .trim() || 'cdn'
    return `https://${sub}.${host}`
  } catch {
    return ''
  }
}

const imageRemoteHostRaw =
  (process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOST && String(process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOST).trim() !== ''
    ? process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOST
    : derivedCdnImageUrl()) || ''
const imageRemoteHost = imageRemoteHostRaw
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

/**
 * Bozuk / yavaş diskli VPS'te webpack paralel yazımı soft lockup'a yol açabiliyor.
 * Acil build: TRAVEL_LOW_IO_BUILD=1 (veya CSS_OPTIMIZE=0) ile tek iş parçacığı + CSS optimize kapalı.
 */
const lowIoBuild =
  process.env.TRAVEL_LOW_IO_BUILD === '1' ||
  process.env.TRAVEL_LOW_IO_BUILD === 'true'

const nextConfig = {
  /** Düşük kaynaklı VPS / uzak API: SSG sayfa üretimi 60 sn’de kesilmesin (manage çok dillı rotalar). */
  staticPageGenerationTimeout: 300,
  /**
   * ISR/fetch Data Cache'i daha çok RAM'de tut → `.next/cache/fetch-cache`
   * sürekli disk yazımını azaltır (DeHost yüksek disk I/O uyarısı). 256MB.
   */
  cacheMaxMemorySize: 256 * 1024 * 1024,
  reactStrictMode: false,
  poweredByHeader: false,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },
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
  webpack: (config, { dev, isServer }) => {
    /** Düşük RAM / Windows: PackFileCacheStrategy "Array buffer allocation failed" — dev’de kalıcı cache kapatılır */
    if (dev) {
      config.cache = false
      /** Düşük RAM / Windows: aynı anda derlenen modül sayısını sınırla (OOM: Zone / allocation failed) */
      config.parallelism = 2
    }
    /** Üretim acil build: disk I/O baskısını düşür (TRAVEL_LOW_IO_BUILD=1). */
    if (!dev && lowIoBuild) {
      config.parallelism = 1
      config.cache = false
    }
    config.resolve = config.resolve ?? {}
    config.resolve.modules = [
      ...(config.resolve.modules ?? []),
      path.resolve(__dirname, 'node_modules'),
    ]
    /**
     * Next.js varsayılan `polyfill-module`, modern tarayıcılarda gerek olmayan
     * `Array.prototype.at/flat/flatMap`, `Object.fromEntries/hasOwn`,
     * `String.prototype.trimStart/trimEnd` polyfill'lerini ek bir chunk olarak
     * yükler. PSI mobilde "Eski JavaScript ~12 KiB + Kullanılmayan JS ~22 KiB"
     * uyarısı buradan gelir. Sadece tarayıcı bundle'ında, modern engine'lerde
     * gereksiz olan bu modülü minimal shim ile değiştiriyoruz.
     *
     * `resolve.alias` Next entry-point seviyesinde bu dosyayı ABSOLUTE path
     * ile resolve ettiği için yetmez; gerçek yer değiştirme için
     * `NormalModuleReplacementPlugin` (resource path regex) gerekir.
     */
    const polyfillPlugin = nextWebpack?.webpack?.NormalModuleReplacementPlugin
    if (!isServer && polyfillPlugin) {
      const minimal = path.resolve(__dirname, 'src/lib/next-polyfill-module-minimal.js')
      config.plugins = config.plugins ?? []
      config.plugins.push(
        new polyfillPlugin(
          /next[\\/]dist[\\/]build[\\/]polyfills[\\/]polyfill-module(\.js)?$/i,
          minimal,
        ),
      )
    }
    return config
  },
  async rewrites() {
    const raw =
      (process.env.INTERNAL_API_ORIGIN && String(process.env.INTERNAL_API_ORIGIN).trim()) ||
      (process.env.NEXT_PUBLIC_API_URL && String(process.env.NEXT_PUBLIC_API_URL).trim()) ||
      'http://127.0.0.1:8080'
    const dest = raw.replace(/\/$/, '')
    return [{ source: '/api/v1/:path*', destination: `${dest}/api/v1/:path*` }]
  },
  async headers() {
    const headers = buildAllSecurityHeaders()
    return [
      /**
       * `/(.*)` ile tüm yollara başlık vermek bazı proxy + Next birleşimlerinde
       * `/_next/static/*.js` çıktısına müdahale izlenimi yaratabiliyor.
       * Güvenlik başlıkları HTML ve uygulama yollarına uygulanır; `_next` üretim
       * dosyaları Next’in varsayılanıyla kalır.
       */
      {
        source: '/((?!_next/).*)',
        headers,
      },
    ]
  },
  experimental: {
    /**
     * CSS stratejisi (App Router / Next 16):
     * - optimizeCss / inlineCss: streaming veya HTML şişmesi → kapalı.
     * - CSS defer (TRAVEL_DEFER_CSS=1): render-blocking'i kaldırır ama LCP'yi
     *   bozabiliyor (lab'de ~6s+). Varsayılan KAPALI; harici CSS blocking kalır.
     * - Vitrin CSS'i manage kaynaklarını taramaz (manage.css ayrı).
     */
    /** Tek CPU ile derle — bozuk diskte worker fırtınasını keser. */
    ...(lowIoBuild ? { cpus: 1 } : {}),
    optimizePackageImports: [
      'lucide-react',
      'lodash',
      '@headlessui/react',
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
      {
        protocol: 'https',
        hostname: 'reserwation.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.kplus.com.tr',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pics.avs.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'bookeder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fairystonetravel.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.aegeanhotels.net',
        port: '',
        pathname: '/**',
      },
      ...extraImageHost,
    ],
  },
}

export default nextConfig
