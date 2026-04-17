import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DEFAULT_FOOTER_SITE_CONFIG } from '@/lib/footer-site-defaults'
import type { FooterSiteConfig } from '@/types/footer-site-config'

const DATA_PATH = path.join(process.cwd(), 'public', 'site-data', 'footer.json')

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T
}

function normalize(cfg: Partial<FooterSiteConfig>): FooterSiteConfig {
  const base = clone(DEFAULT_FOOTER_SITE_CONFIG)
  if (cfg.version !== 1) return base

  if (typeof cfg.taglineTr === 'string') base.taglineTr = cfg.taglineTr
  if (typeof cfg.taglineEn === 'string') base.taglineEn = cfg.taglineEn

  if (Array.isArray(cfg.trustBadges) && cfg.trustBadges.length === 3) {
    base.trustBadges = cfg.trustBadges.map((b, i) => ({
      ...base.trustBadges[i],
      ...b,
      variant: b.variant === 'green' || b.variant === 'blue' || b.variant === 'amber' ? b.variant : base.trustBadges[i].variant,
    })) as FooterSiteConfig['trustBadges']
  }

  if (Array.isArray(cfg.columns) && cfg.columns.length > 0) {
    base.columns = cfg.columns.map((col, i) => ({
      titleTr: typeof col.titleTr === 'string' ? col.titleTr : base.columns[i]?.titleTr ?? '',
      titleEn: typeof col.titleEn === 'string' ? col.titleEn : base.columns[i]?.titleEn ?? '',
      links: Array.isArray(col.links)
        ? col.links
            .filter((l) => l && typeof l.href === 'string')
            .map((l) => ({
              nameTr: String(l.nameTr ?? ''),
              nameEn: String(l.nameEn ?? ''),
              href: String(l.href).trim() || '/',
            }))
        : [],
    }))
  }

  if (Array.isArray(cfg.legalLinks)) {
    base.legalLinks = cfg.legalLinks
      .filter((l) => l && typeof l.href === 'string')
      .map((l) => ({
        nameTr: String(l.nameTr ?? ''),
        nameEn: String(l.nameEn ?? ''),
        href: String(l.href).trim() || '/',
      }))
  }

  return base
}

export async function getFooterSiteConfig(): Promise<FooterSiteConfig> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<FooterSiteConfig>
    return normalize(parsed)
  } catch {
    return clone(DEFAULT_FOOTER_SITE_CONFIG)
  }
}

export function getFooterSiteConfigPath(): string {
  return DATA_PATH
}

export { DEFAULT_FOOTER_SITE_CONFIG }
