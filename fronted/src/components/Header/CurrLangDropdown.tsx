'use client'

import { useAvailableLocales } from '@/contexts/available-locales-context'
import { useLocalizedRouteIndexes } from '@/contexts/localized-routes-context'
import {
  PREFERRED_CURRENCY_EVENT,
  PREFERRED_CURRENCY_STORAGE_KEY,
} from '@/contexts/preferred-currency-context'
import { type HeaderCurrencyItem } from '@/data/navigation'
import { swapLocaleInPathnameLocalized } from '@/lib/localized-path-shared'
import { Link } from '@/shared/link'
import {
  CloseButton,
  Popover,
  PopoverButton,
  PopoverPanel,
  PopoverPanelProps,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from '@headlessui/react'
import { getMessages } from '@/utils/getT'
import { CurrencyStackDollarIcon } from '@/components/Header/CurrencyStackDollarIcon'
import { ChevronDown, Globe } from 'lucide-react'
import clsx from 'clsx'
import { usePathname } from 'next/navigation'
import { FC, useEffect, useMemo, useState } from 'react'

type CurrencyItem = HeaderCurrencyItem

interface CurrenciesProps {
  currencies: CurrencyItem[]
  activeCurrencyId: string
  onSelect: (id: string) => void
}

const Currencies = ({ currencies, activeCurrencyId, onSelect }: CurrenciesProps) => {
  return (
    <div className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
      {currencies.map((item) => {
        const isActive = item.id === activeCurrencyId
        return (
          <CloseButton
            as="button"
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={clsx(
              '-m-1 flex w-full items-center rounded-lg px-2.5 py-2.5 text-start transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden focus-visible:ring-0 focus-visible:ring-offset-0 dark:hover:bg-neutral-600/50',
              isActive ? 'bg-neutral-100 dark:bg-neutral-700' : '',
            )}
          >
            <span
              className={clsx(
                'grid size-[26px] shrink-0 select-none place-items-center rounded-full border border-neutral-200 bg-white text-center leading-none text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
                item.glyph.length > 2 ? 'text-[9px] font-medium' : 'text-[13px] font-medium',
              )}
              aria-hidden
            >
              <span className="block max-w-[22px] truncate leading-none">{item.glyph}</span>
            </span>
            <p className="ms-2 text-sm font-medium tracking-wide text-neutral-800 dark:text-neutral-200">
              {item.id}
            </p>
          </CloseButton>
        )
      })}
    </div>
  )
}

const Languages = ({ activeLocale }: { activeLocale: string }) => {
  const pathname = usePathname()
  const uiLanguages = useAvailableLocales()
  const routeIdx = useLocalizedRouteIndexes()
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {uiLanguages.map((item) => {
        const href = swapLocaleInPathnameLocalized(pathname, item.code, routeIdx)
        const isActive = activeLocale === item.code
        return (
          <CloseButton
            as={Link}
            href={href}
            key={item.code}
            className={clsx(
              '-m-2.5 flex items-center rounded-lg p-2.5 transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden dark:hover:bg-neutral-700',
              isActive ? 'bg-neutral-100 dark:bg-neutral-700' : 'opacity-80',
            )}
          >
            <div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.code.toUpperCase()}</p>
            </div>
          </CloseButton>
        )
      })}
    </div>
  )
}

interface Props {
  panelAnchor?: PopoverPanelProps['anchor']
  panelClassName?: PopoverPanelProps['className']

  className?: string
  currencies: HeaderCurrencyItem[]
  /** Aktif [locale] — dil seçici vurgusu için */
  locale: string
}

const CurrLangDropdown: FC<Props> = ({
  panelAnchor = {
    to: 'bottom end',
    gap: 16,
  },
  className,
  locale,
  currencies,
  panelClassName = 'w-[min(100vw-2rem,22rem)] sm:w-[22rem]',
}) => {
  const [activeCurrencyId, setActiveCurrencyId] = useState<string>(() => {
    // Context ile aynı senkron okuma — EUR/TRY tutarsızlığını engeller
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(PREFERRED_CURRENCY_STORAGE_KEY)
        if (saved?.trim() && currencies.some((c) => c.id === saved.trim().toUpperCase())) {
          return saved.trim().toUpperCase()
        }
      } catch { /* ignore */ }
    }
    return currencies[0]?.id ?? 'TRY'
  })

  useEffect(() => {
    // Para birimi listesi değişirse (API'den geldi) seçimi güncelle
    setActiveCurrencyId((prev) =>
      currencies.some((c) => c.id === prev) ? prev : (currencies[0]?.id ?? 'TRY'),
    )
  }, [currencies])

  const handleSelectCurrency = (id: string) => {
    setActiveCurrencyId(id)
    if (typeof window !== 'undefined') {
      localStorage.setItem(PREFERRED_CURRENCY_STORAGE_KEY, id)
      window.dispatchEvent(new CustomEvent(PREFERRED_CURRENCY_EVENT, { detail: id }))
    }
  }

  const currLang = useMemo(() => getMessages(locale).Header.CurrLang, [locale])
  const tabItems = useMemo(
    () =>
      [
        { id: 'language' as const, label: currLang.languageTab },
        { id: 'currency' as const, label: currLang.currencyTab },
      ] as const,
    [currLang],
  )

  return (
    <Popover className={clsx('group', className)}>
      <PopoverButton
        className="-m-2.5 flex items-center gap-x-0.5 p-2.5 text-sm font-medium text-neutral-600 group-hover:text-neutral-950 focus:outline-hidden focus-visible:outline-hidden dark:text-neutral-200 dark:group-hover:text-neutral-100"
        aria-label={currLang.openSwitcher}
      >
        <Globe className="size-[19px] shrink-0 stroke-[1.75]" aria-hidden />
        <span className="shrink-0 px-0.5 text-sm text-neutral-400 dark:text-neutral-500" aria-hidden>
          /
        </span>
        <CurrencyStackDollarIcon className="size-[18px] max-h-[18px] max-w-[18px] translate-x-px" />
        <ChevronDown
          className="ms-0.5 size-4 shrink-0 group-data-open:rotate-180 transition-transform stroke-[1.75]"
          aria-hidden
        />
      </PopoverButton>

      <PopoverPanel
        anchor={panelAnchor}
        transition
        className={clsx(
          'z-40 rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.06] transition duration-200 ease-in-out data-closed:translate-y-1 data-closed:opacity-0 dark:bg-neutral-800 dark:ring-white/10',
          panelClassName
        )}
      >
        <TabGroup>
          <TabList className="flex gap-1 rounded-full bg-neutral-100 p-1 dark:bg-neutral-700">
            {tabItems.map(({ id, label }) => (
              <Tab
                key={id}
                className={({ selected }) =>
                  clsx(
                    'w-full rounded-full py-2 text-sm leading-5 font-medium focus:ring-0 focus:outline-hidden focus-visible:ring-0',
                    selected
                      ? 'border border-neutral-200 bg-white text-neutral-900 shadow-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:shadow-none'
                      : 'border border-transparent text-neutral-600 hover:bg-white/60 dark:text-neutral-300 dark:hover:bg-white/5',
                  )
                }
              >
                {label}
              </Tab>
            ))}
          </TabList>
          <TabPanels className="mt-5">
            <TabPanel className="rounded-xl px-0.5 py-1 outline-none focus:outline-none focus-visible:outline-none sm:px-0">
              <Languages activeLocale={locale} />
            </TabPanel>
            <TabPanel className="rounded-xl px-0.5 py-1 outline-none focus:outline-none focus-visible:outline-none sm:px-0">
              <Currencies
                currencies={currencies}
                activeCurrencyId={activeCurrencyId}
                onSelect={handleSelectCurrency}
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </PopoverPanel>
    </Popover>
  )
}
export default CurrLangDropdown
