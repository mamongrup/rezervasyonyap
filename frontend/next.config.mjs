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
     * `optimizeCss` (beasties) — Next 15 + beasties 0.4 ile critical CSS inline + non-critical
     * defer. PSI mobil "Render-blocking requests 1190 ms" uyarısının ana kaynağı bu;
     * açtığımızda CSS dosyası async hale gelir, FCP/LCP düşer. Sorun çıkarsa `CSS_OPTIMIZE=0` ile kapatılır.
     */
    optimizeCss: process.env.CSS_OPTIMIZE !== '0',
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
