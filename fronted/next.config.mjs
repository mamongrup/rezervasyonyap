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
  reactStrictMode: false,
  poweredByHeader: false,
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
    optimizePackageImports: [
      'lucide-react',
      'lodash',
      '@hugeicons/react',
      '@hugeicons/core-free-icons',
      'framer-motion',
      'date-fns',
    ],
  },
  images: {
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
