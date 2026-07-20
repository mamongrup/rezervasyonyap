'use client'

import { Footer2TrustBadge } from '@/components/Footer2TrustBadge'
import { pickI18nWithLegacy } from '@/lib/i18n-field'
import { getSitePublicConfig } from '@/lib/site-public-config'
import Logo, { type BrandingConfig } from '@/shared/Logo'
import type { FooterSiteConfig } from '@/types/footer-site-config'
import { getMessages } from '@/utils/getT'

/**
 * Panel «Footer yönetimi» canlı önizleme — önyüz `Footer2` ile aynı düzen/sınıflar.
 * Sunucu `Footer2` async/fs kullandığı için client önizlemede aynı markup burada.
 */
export function Footer2ManagePreview({
  cfg,
  locale = 'tr',
  branding,
}: {
  cfg: FooterSiteConfig
  locale?: string
  branding?: Record<string, unknown> | null
}) {
  const year = new Date().getFullYear()
  const site = getSitePublicConfig()
  const tagline =
    pickI18nWithLegacy({ tr: cfg.taglineTr, en: cfg.taglineEn }, cfg.tagline_i18n, locale, '') ||
    site.tagline ||
    cfg.taglineTr ||
    cfg.taglineEn
  const logoSrc = typeof branding?.logo_url === 'string' && branding.logo_url ? branding.logo_url : undefined
  const logoDarkSrc =
    typeof branding?.logo_url_dark === 'string' && branding.logo_url_dark ? branding.logo_url_dark : undefined
  const logoAlt =
    (typeof branding?.site_name === 'string' && branding.site_name) || site.orgName || 'Logo'
  const copyName = site.orgLegalName || site.orgName || logoAlt
  const rights = getMessages(locale).site.footer.rights
  const linkCls =
    'text-sm/6 text-gray-600 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
  const headingCls = 'text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-neutral-200'

  return (
    <footer className="min-w-0 overflow-x-clip border-t border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-950">
      <div className="container min-w-0 pt-16 pb-8 sm:pt-20 sm:pb-10">
        <div className="grid min-w-0 grid-cols-1 gap-10 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-6">
            <Logo
              src={logoSrc}
              darkSrc={logoDarkSrc}
              alt={logoAlt}
              initialBranding={(branding ?? {}) as BrandingConfig}
            />
            <p className="break-words text-sm/6 text-balance text-gray-600 dark:text-neutral-400">{tagline}</p>
            <div className="grid grid-cols-1 gap-3 pt-2">
              {cfg.trustBadges.map((badge, i) => (
                <Footer2TrustBadge key={i} badge={badge} locale={locale} />
              ))}
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {cfg.columns.map((col, colIdx) => {
              const title = pickI18nWithLegacy(
                { tr: col.titleTr, en: col.titleEn },
                col.title_i18n,
                locale,
                col.titleEn || col.titleTr,
              )
              return (
                <div key={`footer-preview-col-${colIdx}`} className="min-w-0">
                  <h3 className={`${headingCls} break-words`}>{title}</h3>
                  <ul role="list" className="mt-4 space-y-3">
                    {col.links.map((item, li) => {
                      const name = pickI18nWithLegacy(
                        { tr: item.nameTr, en: item.nameEn },
                        item.name_i18n,
                        locale,
                        item.nameEn || item.nameTr,
                      )
                      return (
                        <li key={`${title}-${name}-${li}`} className="min-w-0">
                          <span className={`${linkCls} break-words`}>{name || item.href}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-16 flex min-w-0 flex-col items-start gap-4 border-t border-gray-900/10 pt-8 sm:mt-20 sm:flex-row sm:items-center sm:justify-between lg:mt-24 dark:border-gray-700">
          <p className="min-w-0 max-w-full break-words text-sm/6 text-gray-500 dark:text-neutral-400">
            &copy; {year} {copyName}. {rights}
          </p>
          <div className="flex min-w-0 max-w-full flex-wrap gap-x-6 gap-y-2 sm:justify-end">
            {cfg.legalLinks.map((item, i) => {
              const name = pickI18nWithLegacy(
                { tr: item.nameTr, en: item.nameEn },
                item.name_i18n,
                locale,
                item.nameEn || item.nameTr,
              )
              return (
                <span
                  key={`legal-${i}`}
                  className="break-words text-xs text-gray-700 dark:text-neutral-300"
                >
                  {name || item.href}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </footer>
  )
}
