import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DEFAULT_FOOTER_SITE_CONFIG } from '@/lib/footer-site-defaults'
import { compactI18nField } from '@/lib/i18n-field'
import type { FooterSiteConfig } from '@/types/footer-site-config'

const DATA_PATH = path.join(process.cwd(), 'public', 'site-data', 'footer.json')

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T
}

/**
 * `*_i18n` haritası geldiyse normalize edip kullan; yoksa eski `xxxTr`/`xxxEn`
 * alanlarından sentetik bir harita üret. Üretilen harita en azından TR ve EN
 * için bir değer içerir, diğer 4 dil opsiyoneldir.
 */
function maybeI18n(
  raw: unknown,
  legacy: { tr?: unknown; en?: unknown },
): ReturnType<typeof compactI18nField> {
  const compact = compactI18nField(raw as Record<string, unknown>)
  if (Object.keys(compact).length > 0) return compact
  const out: Record<string, string> = {}
  if (typeof legacy.tr === 'string' && legacy.tr.trim() !== '') out.tr = legacy.tr
  if (typeof legacy.en === 'string' && legacy.en.trim() !== '') out.en = legacy.en
  return out as ReturnType<typeof compactI18nField>
}

function normalize(cfg: Partial<FooterSiteConfig>): FooterSiteConfig {
  const base = clone(DEFAULT_FOOTER_SITE_CONFIG)
  if (cfg.version !== 1) return base

  if (typeof cfg.taglineTr === 'string') base.taglineTr = cfg.taglineTr
  if (typeof cfg.taglineEn === 'string') base.taglineEn = cfg.taglineEn
  base.tagline_i18n = maybeI18n(cfg.tagline_i18n, { tr: cfg.taglineTr, en: cfg.taglineEn })

  if (Array.isArray(cfg.trustBadges) && cfg.trustBadges.length === 3) {
    base.trustBadges = cfg.trustBadges.map((b, i) => {
      const baseBadge = base.trustBadges[i]
      return {
        ...baseBadge,
        ...b,
        variant: b.variant === 'green' || b.variant === 'blue' || b.variant === 'amber' ? b.variant : baseBadge.variant,
        title_i18n: maybeI18n(b.title_i18n, { tr: b.titleTr, en: b.titleEn }),
        subtitle_i18n: maybeI18n(b.subtitle_i18n, { tr: b.subtitleTr, en: b.subtitleEn }),
      }
    }) as FooterSiteConfig['trustBadges']
  }

  if (Array.isArray(cfg.columns) && cfg.columns.length > 0) {
    base.columns = cfg.columns.map((col, i) => ({
      titleTr: typeof col.titleTr === 'string' ? col.titleTr : base.columns[i]?.titleTr ?? '',
      titleEn: typeof col.titleEn === 'string' ? col.titleEn : base.columns[i]?.titleEn ?? '',
      title_i18n: maybeI18n(col.title_i18n, { tr: col.titleTr, en: col.titleEn }),
      links: Array.isArray(col.links)
        ? col.links
            .filter((l) => l && typeof l.href === 'string')
            .map((l) => ({
              nameTr: String(l.nameTr ?? ''),
              nameEn: String(l.nameEn ?? ''),
              name_i18n: maybeI18n(l.name_i18n, { tr: l.nameTr, en: l.nameEn }),
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
        name_i18n: maybeI18n(l.name_i18n, { tr: l.nameTr, en: l.nameEn }),
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
