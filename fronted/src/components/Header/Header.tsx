import { getCatalogMenuForLocale } from '@/data/catalog-menu'
import { resolveMegaMenuFeatured } from '@/data/mega-menu-sidebar'
import { getNavMegaMenuLocalized, resolveHeaderCurrencies } from '@/data/navigation'
import Logo from '@/shared/Logo'
import clsx from 'clsx'
import { FC } from 'react'
import AvatarDropdown from './AvatarDropdown'
import CategoriesDropdown from './CategoriesDropdown'
import CurrLangDropdown from './CurrLangDropdown'
import HamburgerBtnMenu from './HamburgerBtnMenu'
import MegaMenuPopover from './MegaMenuPopover'
import NotifyDropdown from './NotifyDropdown'
import AddListingDropdown from './AddListingDropdown'
import GlobalSearch from '@/components/search/GlobalSearch'
interface HeaderProps {
  hasBorderBottom?: boolean
  className?: string
  /** URL [locale] segmenti (ör. tr, en) */
  locale?: string
}

const Header: FC<HeaderProps> = async ({ hasBorderBottom = true, className, locale = 'tr' }) => {
  const [megamenu, currencies, featuredCategory, siteConfig, catalogMenuItems] = await Promise.all([
    getNavMegaMenuLocalized(locale),
    resolveHeaderCurrencies(),
    resolveMegaMenuFeatured(locale),
    import('@/lib/site-config-cache').then((m) => m.getCachedSiteConfig()).catch(() => null),
    getCatalogMenuForLocale(locale),
  ])
  const branding = siteConfig?.branding as Record<string, unknown> | null ?? null
  const logoSrc = typeof branding?.logo_url === 'string' && branding.logo_url ? branding.logo_url : undefined
  const logoDarkSrc = typeof branding?.logo_url_dark === 'string' && branding.logo_url_dark ? branding.logo_url_dark : undefined
  const siteName = typeof branding?.site_name === 'string' ? branding.site_name : 'Logo'

  return (
    <div className={clsx('relative', className)}>
      <div className="container">
        <div
          className={clsx(
            'flex h-16 justify-between gap-x-2 border-neutral-200 dark:border-neutral-700',
            hasBorderBottom && 'border-b',
            !hasBorderBottom && 'has-[.header-popover-full-panel]:border-b'
          )}
        >
          <div className="flex items-center justify-center gap-x-2 sm:gap-x-6">
            <Logo src={logoSrc} darkSrc={logoDarkSrc} alt={siteName} />
            <div className="hidden h-7 border-l border-neutral-200 md:block dark:border-neutral-700"></div>
            <div className="hidden md:block">
              <CategoriesDropdown items={catalogMenuItems} />
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end gap-x-2.5 sm:gap-x-6">
            <div className="block lg:hidden">
              <HamburgerBtnMenu />
            </div>
            <MegaMenuPopover megamenu={megamenu} featuredCategory={featuredCategory} locale={locale} />
            <GlobalSearch locale={locale} iconOnly />
            <CurrLangDropdown currencies={currencies} locale={locale} className="hidden md:block" />
            <AddListingDropdown />
            <NotifyDropdown />
            <AvatarDropdown />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header
