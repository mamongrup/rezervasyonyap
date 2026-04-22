'use client'

import { type HeaderCurrencyItem, TNavigationItem } from '@/data/navigation'
import { normalizeHrefForLocale } from '@/lib/i18n-config'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import { Link } from '@/shared/link'
import { Disclosure, DisclosureButton, DisclosurePanel, useClose } from '@headlessui/react'
import {
  Airplane02Icon,
  ArrowDown01Icon,
  BoatIcon,
  Compass01Icon,
  GridIcon,
  House04Icon,
  HotAirBalloonIcon,
  LegalDocument01Icon,
  Menu01Icon,
  PlusSignCircleIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import Form from 'next/form'
import { useParams, useRouter } from 'next/navigation'
import React, { useEffect, useMemo } from 'react'
import { getMessages } from '@/utils/getT'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import CurrLangDropdown from '../CurrLangDropdown'

/** Oteller / tatil evi / araç — hızlı erişim çipleri */
const QUICK_NAV_IDS = new Set(['1', '2', '4'])

interface Props {
  data: TNavigationItem[]
  currencies: HeaderCurrencyItem[]
  locale: string
}

function navItemHref(locale: string, vitrinPath: (p: string) => string, href: string | undefined): string {
  if (!href || href === '#') return '#'
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) return href
  const raw = href.startsWith('/') ? href : `/${href}`
  return normalizeHrefForLocale(locale, vitrinPath(raw))
}

type IconComponent = typeof House04Icon

const MEGA_GROUP_ICONS: Record<string, IconComponent> = {
  '1': House04Icon,
  '1b': HotAirBalloonIcon,
  '1c': Airplane02Icon,
  '2': LegalDocument01Icon,
  '4': GridIcon,
  admin: Compass01Icon,
}

function megaGroupIcon(groupId: string): IconComponent {
  return MEGA_GROUP_ICONS[groupId] ?? BoatIcon
}

const disclosureBtnClass =
  'group flex w-full items-center gap-3 rounded-xl border border-neutral-200/90 bg-white px-3 py-3 text-start shadow-sm transition hover:border-primary-300/60 hover:bg-primary-50/40 aria-expanded:border-primary-300/55 dark:border-neutral-700 dark:bg-neutral-900/40 dark:hover:border-primary-600/50 dark:hover:bg-primary-950/30 dark:aria-expanded:border-primary-600/45'

/** Chevron — `DisclosureButton` `aria-expanded` ile döner */
const chevronIconClass =
  'h-4 w-4 shrink-0 text-neutral-400 transition duration-200 group-aria-expanded:rotate-180 dark:text-neutral-500'

const SidebarNavigation: React.FC<Props> = ({ data, currencies, locale }) => {
  const handleClose = useClose()
  const router = useRouter()
  const params = useParams()
  const effectiveLocale = typeof params?.locale === 'string' ? params.locale : locale
  const vitrinPath = useVitrinHref()
  const stayBrowseHref = vitrinPath('/oteller/all')
  const s = getMessages(effectiveLocale).sidebar

  const quickItems = data.filter((item) => item.id && QUICK_NAV_IDS.has(String(item.id)))

  const { megaRoot, extraMenuItems } = useMemo(() => {
    const menuItems = data.filter((item) => item.id && !QUICK_NAV_IDS.has(String(item.id)))
    const mega = menuItems.find((it) => it.type === 'mega-menu' && it.children?.length)
    const extra = mega ? menuItems.filter((it) => it !== mega) : menuItems
    return { megaRoot: mega, extraMenuItems: extra }
  }, [data])

  useEffect(() => {
    router.prefetch(stayBrowseHref)
  }, [router, stayBrowseHref])

  const handleSubmitForm = async (formData: FormData) => {
    const searchQuery = String(formData.get('search') ?? '').trim()
    handleClose()
    const base = vitrinPath('/ara')
    router.push(searchQuery ? `${base}?q=${encodeURIComponent(searchQuery)}` : base)
  }

  /** İç içe: yalnızca alt öğeleri olan düğümler (ör. “Diğer sayfalar”) */
  const renderNestedBranch = (item: TNavigationItem, depth: number) => {
    const gid = String(item.id ?? depth)
    const Icon = megaGroupIcon(gid)
    return (
      <Disclosure key={gid} as="div" className="rounded-lg border border-neutral-100 bg-neutral-50/80 dark:border-neutral-700/80 dark:bg-neutral-800/40">
        <DisclosureButton className={clsx(disclosureBtnClass, 'border-transparent shadow-none')}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-600 shadow-sm dark:bg-neutral-800 dark:text-neutral-300">
            <HugeiconsIcon icon={Icon} className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.name}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} className={chevronIconClass} strokeWidth={1.75} aria-hidden="true" />
        </DisclosureButton>
        <DisclosurePanel className="space-y-0.5 px-2 pb-2">
          {item.children?.map((child, idx) =>
            child.children?.length ? (
              renderNestedBranch(child, depth + 1)
            ) : (
              <Link
                key={child.id ?? idx}
                href={navItemHref(effectiveLocale, vitrinPath, child.href)}
                onClick={handleClose}
                className="block rounded-lg py-2 pl-3 text-sm text-neutral-700 hover:bg-white hover:text-primary-700 dark:text-neutral-200 dark:hover:bg-neutral-900 dark:hover:text-primary-300"
              >
                {child.name}
              </Link>
            ),
          )}
        </DisclosurePanel>
      </Disclosure>
    )
  }

  const renderMegaGroup = (group: TNavigationItem, index: number) => {
    const gid = String(group.id ?? `g${index}`)
    const Icon = megaGroupIcon(gid.startsWith('admin') ? 'admin' : gid)
    const childList = group.children ?? []
    const hasNested = childList.some((c) => c.children?.length)

    return (
      <Disclosure key={gid} defaultOpen={index === 0} as="div">
        <DisclosureButton className={disclosureBtnClass}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/15 to-primary-600/5 text-primary-700 dark:from-primary-400/20 dark:to-primary-600/5 dark:text-primary-300">
            <HugeiconsIcon icon={Icon} className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-50">{group.name}</span>
          </span>
          <HugeiconsIcon icon={ArrowDown01Icon} className={chevronIconClass} strokeWidth={1.75} aria-hidden="true" />
        </DisclosureButton>
        <DisclosurePanel className="mt-1.5 space-y-1 border-l-2 border-primary-200/80 pl-3 ml-4 dark:border-primary-800/60">
          {hasNested
            ? childList.map((child, idx) =>
                child.children?.length ? (
                  <div key={child.id ?? idx} className="pb-1">
                    {renderNestedBranch(child, 0)}
                  </div>
                ) : (
                  <Link
                    key={child.id ?? idx}
                    href={navItemHref(effectiveLocale, vitrinPath, child.href)}
                    onClick={handleClose}
                    className="flex items-center gap-2 rounded-lg py-2.5 pr-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100/90 dark:text-neutral-100 dark:hover:bg-neutral-800/80"
                  >
                    <span className="h-1 w-1 shrink-0 rounded-full bg-primary-400" aria-hidden="true" />
                    {child.name}
                  </Link>
                ),
              )
            : childList.map((child, idx) => (
                <Link
                  key={child.id ?? idx}
                  href={navItemHref(effectiveLocale, vitrinPath, child.href)}
                  onClick={handleClose}
                  className="flex items-center gap-2 rounded-lg py-2.5 pr-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100/90 dark:text-neutral-100 dark:hover:bg-neutral-800/80"
                >
                  <span className="h-1 w-1 shrink-0 rounded-full bg-primary-400" aria-hidden="true" />
                  {child.name}
                </Link>
              ))}
        </DisclosurePanel>
      </Disclosure>
    )
  }

  const renderExtraTopLevel = (item: TNavigationItem, index: number) => {
    if (!item.children?.length) {
      return (
        <Link
          key={item.id ?? index}
          href={navItemHref(effectiveLocale, vitrinPath, item.href)}
          onClick={handleClose}
          className="flex items-center gap-3 rounded-xl border border-dashed border-primary-300/70 bg-gradient-to-r from-primary-50/90 to-white px-3 py-3 text-sm font-semibold text-primary-800 shadow-sm transition hover:border-primary-400 dark:border-primary-700/60 dark:from-primary-950/40 dark:to-neutral-900/40 dark:text-primary-200"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white dark:bg-primary-500">
            <HugeiconsIcon icon={PlusSignCircleIcon} className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="flex-1 leading-snug">{item.name}</span>
        </Link>
      )
    }

    return (
      <Disclosure key={item.id ?? index} as="div" defaultOpen={false}>
        <DisclosureButton className={disclosureBtnClass}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
            <HugeiconsIcon icon={Menu01Icon} className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="flex-1 text-start text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.name}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} className={chevronIconClass} strokeWidth={1.75} aria-hidden="true" />
        </DisclosureButton>
        <DisclosurePanel className="mt-1 space-y-1 pl-1">
          {item.children?.map((child, idx) =>
            child.children?.length ? (
              <div key={child.id ?? idx}>{renderNestedBranch(child, 0)}</div>
            ) : (
              <Link
                key={child.id ?? idx}
                href={navItemHref(effectiveLocale, vitrinPath, child.href)}
                onClick={handleClose}
                className="block rounded-lg py-2 pl-3 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                {child.name}
              </Link>
            ),
          )}
        </DisclosurePanel>
      </Disclosure>
    )
  }

  return (
    <div className="space-y-6">
      <Form className="flex-1 text-neutral-900 dark:text-neutral-200" action={handleSubmitForm}>
        <div className="flex h-full items-center gap-x-2.5 rounded-xl border border-neutral-200/80 bg-neutral-50 px-3 py-3 dark:border-neutral-700 dark:bg-white/5">
          <HugeiconsIcon icon={Search01Icon} size={22} color="currentColor" strokeWidth={1.5} />
          <input
            type="search"
            name="search"
            autoComplete="off"
            aria-label={s.searchAria}
            placeholder={s.searchPlaceholder}
            className="w-full border-none bg-transparent text-[15px] focus:ring-0 focus:outline-hidden sm:text-sm"
          />
        </div>
        <input type="submit" hidden value="" />
      </Form>

      {/* 1 — Kategoriler (mega menü) üstte, tek başlık; kök “Kategoriler” satırı yok */}
      {megaRoot?.children?.length ? (
        <section aria-labelledby="sidebar-categories-heading">
          <div className="mb-3">
            <h2 id="sidebar-categories-heading" className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
              {s.categoriesHeading}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-500">{s.categoriesIntro}</p>
          </div>
          <div className="space-y-2 rounded-2xl border border-neutral-200/70 bg-neutral-50/50 p-2.5 dark:border-neutral-700/80 dark:bg-neutral-900/30">
            {megaRoot.children.map((group, i) => renderMegaGroup(group, i))}
          </div>
        </section>
      ) : null}

      {/* İlan ver vb. mega dışı üst öğeler */}
      {extraMenuItems.length > 0 ? <div className="space-y-2">{extraMenuItems.map((item, i) => renderExtraTopLevel(item, i))}</div> : null}

      {/* Hızlı erişim */}
      {quickItems.length > 0 ? (
        <section aria-labelledby="sidebar-quick-heading">
          <h2 id="sidebar-quick-heading" className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
            {s.popularShortcuts}
          </h2>
          <div className="flex flex-col gap-2">
            {quickItems.map((item) => (
              <Link
                key={item.id}
                href={navItemHref(effectiveLocale, vitrinPath, item.href)}
                onClick={handleClose}
                className="rounded-xl border border-neutral-200/90 bg-white px-3 py-2.5 text-center text-sm font-semibold text-neutral-900 shadow-sm transition hover:border-primary-400/50 hover:bg-primary-50/50 dark:border-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-100 dark:hover:border-primary-500/40 dark:hover:bg-primary-950/30"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Hesap */}
      <section aria-labelledby="sidebar-account-heading">
        <h2 id="sidebar-account-heading" className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
          {s.quickLinksTitle}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href={navItemHref(effectiveLocale, vitrinPath, '/login')}
            onClick={handleClose}
            className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            {s.login}
          </Link>
          <Link
            href={navItemHref(effectiveLocale, vitrinPath, '/signup')}
            onClick={handleClose}
            className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            {s.signup}
          </Link>
          <Link
            href={navItemHref(effectiveLocale, vitrinPath, '/account')}
            onClick={handleClose}
            className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            {s.account}
          </Link>
        </div>
      </section>

      <Divider className="my-1" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ButtonPrimary href={navItemHref(effectiveLocale, vitrinPath, '/add-listing/1')} onClick={handleClose} className="shrink-0">
          {s.listProperty}
        </ButtonPrimary>

        <CurrLangDropdown
          currencies={currencies}
          locale={effectiveLocale}
          panelAnchor={{
            to: 'top end',
            gap: 12,
          }}
          panelClassName="z-10 w-72 p-4!"
        />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href={navItemHref(effectiveLocale, vitrinPath, '/contact')} onClick={handleClose} className="text-primary-600 hover:underline dark:text-primary-400">
          {s.contact}
        </Link>
        <Link href={navItemHref(effectiveLocale, vitrinPath, '/blog')} onClick={handleClose} className="text-primary-600 hover:underline dark:text-primary-400">
          {s.blog}
        </Link>
      </div>

      <p className="pb-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{s.lead}</p>
    </div>
  )
}

export default SidebarNavigation
