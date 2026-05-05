import { getPublicSiteUrl } from '@/lib/site-branding-seo'

function addHostnameVariants(set: Set<string>, hostname: string) {
  const h = hostname.trim().toLowerCase()
  if (!h) return
  set.add(h)
  if (h.startsWith('www.')) set.add(h.slice(4))
  else set.add(`www.${h}`)
}

function collectUploadRewriteHosts(): Set<string> {
  const hosts = new Set<string>()
  const site = getPublicSiteUrl()
  if (site) {
    try {
      addHostnameVariants(hosts, new URL(site).hostname)
    } catch {
      /* ignore invalid SITE_URL */
    }
  }
  addHostnameVariants(hosts, 'localhost')
  addHostnameVariants(hosts, '127.0.0.1')
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    const hostOnly = vercel.replace(/^https?:\/\//i, '').split('/')[0]
    if (hostOnly) addHostnameVariants(hosts, hostOnly)
  }
  return hosts
}

let memoHosts: Set<string> | null = null

function uploadRewriteHosts(): Set<string> {
  if (!memoHosts) memoHosts = collectUploadRewriteHosts()
  return memoHosts
}

/**
 * Sayfa oluşturucuda sık yapıştırılan `https://alanadiniz/uploads/...` adreslerini
 * `/uploads/...` göreli yola indirir — `next/image` için uzak host iznine gerek kalmaz.
 * CDN veya harici barındırıcı adresleri değiştirilmez.
 */
export function normalizeSiteRelativeUploadSrc(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  if (s.startsWith('/')) return s
  if (!/^https?:\/\//i.test(s)) return s

  try {
    const u = new URL(s)
    const path = u.pathname || ''
    if (!path.startsWith('/uploads/')) return s
    if (!uploadRewriteHosts().has(u.hostname.toLowerCase())) return s
    return `${path}${u.search}${u.hash}`
  } catch {
    return s
  }
}
