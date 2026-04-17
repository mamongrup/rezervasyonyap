import { getSidebarNavigation, resolveHeaderCurrencies } from '@/data/navigation'
import SidebarNavigation from './Header/Navigation/SidebarNavigation'
import Aside from './aside'

interface Props {
  className?: string
  /** `[locale]` — menü metinleri ve `prefixLocale` için */
  locale?: string
}

const AsideSidebarNavigation = async ({ className, locale = 'tr' }: Props) => {
  const navigationMenu = await getSidebarNavigation(locale)
  const currencies = await resolveHeaderCurrencies()

  return (
    <Aside
      openFrom={process.env.NEXT_PUBLIC_THEME_DIR === 'rtl' ? 'left' : 'right'}
      type="sidebar-navigation"
      logoOnHeading
      contentMaxWidthClassName="max-w-md"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain py-6 pb-8 [scrollbar-gutter:stable]">
          <SidebarNavigation data={navigationMenu} currencies={currencies} locale={locale} />
        </div>
      </div>
    </Aside>
  )
}

export default AsideSidebarNavigation
