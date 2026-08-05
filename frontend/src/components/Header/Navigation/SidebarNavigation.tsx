'use client'

import { type HeaderCurrencyItem, TNavigationItem } from '@/data/navigation'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { notifySearchLoading } from '@/lib/hero-search-plan'
import { normalizeHrefForLocale } from '@/lib/i18n-config'
import {
  detectRole,
  NOTIFICATIONS_BY_ROLE,
  SECTION_LABELS,
  type UserRole,
} from '@/lib/notification-roles'
import { phoneToTelHref, resolveDisplayPhone } from '@/lib/site-phone'
import { getSitePublicConfig, mergeBrandingIntoEnvContact } from '@/lib/site-public-config'
import { getAuthMe, getSitePublicConfig as fetchSitePublicConfig } from '@/lib/travel-api'
import { DeskPhoneBadge } from '@/components/DeskPhoneBadge'
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
import React, { useEffect, useMemo, useState } from 'react'
import { getMessages } from '@/utils/getT'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import CurrLangDropdown from '../CurrLangDropdown'
import ListingSearchSuggestions from '@/components/search/ListingSearchSuggestions'
import { SEARCH_MIN_QUERY_LEN } from '@/lib/search-listings-display'

/** Mobil çekmece — mavi üst kartlar (API menüsü UUID id kullanır; href ile eşleştir) */
const SIDEBAR_HIDDEN_TOP_IDS = new Set(['1', '2', '4', '6'])
const SIDEBAR_HIDDEN_PATH_PREFIXES = ['/oteller', '/tatil-evleri', '/arac-kiralama', '/ilan-ver']

function normalizeNavPath(href: string | undefined): string {
  if (!href) return ''
  try {
    const raw = href.startsWith('http') ? new URL(href).pathname : href
    return raw.replace(/^\/(tr|en|de|ru|zh|fr)(?=\/|$)/i, '').toLowerCase()
  } catch {
    return href.toLowerCase()
  }
}

function isSidebarHiddenTopItem(item: TNavigationItem): boolean {
  if (item.type === 'mega-menu') return false
  const id = String(item.id ?? '')
  if (SIDEBAR_HIDDEN_TOP_IDS.has(id)) return true
  const path = normalizeNavPath(item.href)
  return SIDEBAR_HIDDEN_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
}

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
  const [role, setRole] = useState<UserRole>('guest')
  const [searchQuery, setSearchQuery] = useState('')
  const [phoneDisplay, setPhoneDisplay] = useState(() => resolveDisplayPhone(getSitePublicConfig().phone))
  const [whatsappE164, setWhatsappE164] = useState(() => getSitePublicConfig().whatsappE164)
  const showLiveSearch = searchQuery.trim().length >= SEARCH_MIN_QUERY_LEN
  const phoneTel = phoneToTelHref(phoneDisplay)
  const whatsappDisplay = whatsappE164
    ? resolveDisplayPhone(whatsappE164.startsWith('+') ? whatsappE164 : `+${whatsappE164}`)
    : ''

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) return
    getAuthMe(token)
      .then((u) => {
        const perms = Array.isArray(u.permissions) ? u.permissions : []
        const roles = Array.isArray(u.roles) ? u.roles : []
        setRole(detectRole(roles, perms))
      })
      .catch(() => setRole('guest'))
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchSitePublicConfig(undefined)
      .then((pub) => {
        if (cancelled) return
        const merged = mergeBrandingIntoEnvContact(getSitePublicConfig(), pub.branding)
        setPhoneDisplay(resolveDisplayPhone(merged.phone))
        setWhatsappE164(merged.whatsappE164)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const { megaRoot, extraMenuItems } = useMemo(() => {
    const menuItems = data.filter((item) => !isSidebarHiddenTopItem(item))
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
    notifySearchLoading()
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
                className="block rounded-lg py-2 pl-3 text-sm text-neutral-700 hover:bg-white hover:text-primary-700 dark:text-neutral-200 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            aria-label={s.searchAria}
            placeholder={s.searchPlaceholder}
            className="w-full border-none bg-transparent text-[15px] focus:ring-0 focus:outline-hidden sm:text-sm"
          />
        </div>
        <input type="submit" hidden value="" />
      </Form>

      {showLiveSearch ? (
        <ListingSearchSuggestions
          query={searchQuery}
          locale={effectiveLocale}
          onNavigate={handleClose}
        />
      ) : null}

      {/* 1 — Kategoriler (mega menü) üstte, tek başlık; kök “Kategoriler” satırı yok */}
      {!showLiveSearch && megaRoot?.children?.length ? (
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
      {!showLiveSearch && extraMenuItems.length > 0 ? (
        <div className="space-y-2">{extraMenuItems.map((item, i) => renderExtraTopLevel(item, i))}</div>
      ) : null}

      {/* Rol bazlı bildirimler */}
      <section aria-labelledby="sidebar-notif-heading">
        <h2 id="sidebar-notif-heading" className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
          {SECTION_LABELS[role]}
        </h2>
        <div className="space-y-1.5">
          {NOTIFICATIONS_BY_ROLE[role].map((notif) => {
            const href = role === 'guest' ? notif.href : vitrinPath(notif.href)
            return (
              <Link
                key={notif.id}
                href={href}
                onClick={handleClose}
                className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${notif.color}18` }}
                >
                  <notif.icon className="h-4 w-4" style={{ color: notif.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {notif.title}
                    </p>
                    {notif.badge && (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: `${notif.color}20`, color: notif.color }}
                      >
                        {notif.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-tight text-neutral-400">{notif.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {role !== 'guest' ? (
        <section aria-label={s.account}>
          <Link
            href={navItemHref(effectiveLocale, vitrinPath, '/account')}
            onClick={handleClose}
            className="inline-flex rounded-full border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            {s.account}
          </Link>
        </section>
      ) : null}

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

      {(phoneTel || whatsappE164) ? (
        <div className="flex flex-col gap-1.5">
          {phoneTel ? (
            <a
              href={phoneTel}
              onClick={handleClose}
              className="inline-flex items-center gap-2.5 rounded-xl px-1 py-1 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              <DeskPhoneBadge className="size-8 rounded-full" iconClassName="size-4" />
              <span>{phoneDisplay}</span>
            </a>
          ) : null}
          {whatsappE164 ? (
            <a
              href={`https://wa.me/${whatsappE164}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClose}
              className="inline-flex items-center gap-2.5 rounded-xl px-1 py-1 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white shadow-sm ring-1 ring-black/5"
                aria-hidden
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </span>
              <span>{whatsappDisplay || phoneDisplay}</span>
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href={navItemHref(effectiveLocale, vitrinPath, '/contact')} onClick={handleClose} className="text-link-muted-underline">
          {s.contact}
        </Link>
        <Link href={navItemHref(effectiveLocale, vitrinPath, '/blog')} onClick={handleClose} className="text-link-muted-underline">
          {s.blog}
        </Link>
      </div>

      <p className="pb-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{s.lead}</p>
    </div>
  )
}

export default SidebarNavigation
