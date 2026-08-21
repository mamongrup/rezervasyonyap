'use client'

import { Footer2TrustBadge } from '@/components/Footer2TrustBadge'
import { FooterCategorySection, FooterPlainSection } from '@/components/FooterLinkSections'
import {
  buildFooterFiveSectionLayout,
  footerCategoriesTitle,
  footerPartnershipsTitle,
  type FooterDisplayColumn,
} from '@/lib/footer-site-layout'
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
  const columns: FooterDisplayColumn[] = cfg.columns.map((column) => ({
    title: pickI18nWithLegacy(
      { tr: column.titleTr, en: column.titleEn },
      column.title_i18n,
      locale,
      column.titleEn || column.titleTr,
    ),
    links: column.links.map((link) => ({
      name: pickI18nWithLegacy(
        { tr: link.nameTr, en: link.nameEn },
        link.name_i18n,
        locale,
        link.nameEn || link.nameTr,
      ),
      href: link.href,
    })),
  }))
  const layout = buildFooterFiveSectionLayout(columns, locale)

  return (
    <footer className="min-w-0 overflow-x-clip border-t border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-950">
      <div className="container min-w-0 pt-16 pb-8 sm:pt-20 sm:pb-10">
        <div className="grid min-w-0 grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(240px,1.3fr)_minmax(210px,1.15fr)_repeat(3,minmax(0,1fr))] xl:gap-x-10">
          <div className="min-w-0 max-w-md space-y-6">
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

          <FooterCategorySection
            title={footerCategoriesTitle(locale)}
            groups={layout.categoryGroups}
            destinations={layout.destinations}
            preview
          />
          <FooterPlainSection column={layout.support} preview />
          <FooterPlainSection column={layout.company} preview />
          <FooterPlainSection column={layout.partners} preview />
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
