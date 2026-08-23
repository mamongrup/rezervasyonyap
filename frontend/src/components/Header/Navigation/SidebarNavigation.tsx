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
  UserCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import Form from 'next/form'
import { useParams, useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import { getMessages } from '@/utils/getT'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import CurrLangDropdown from '../CurrLangDropdown'
import NotifyDropdown from '../NotifyDropdown'
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
  '1d': Compass01Icon,
  '2': LegalDocument01Icon,
  '4': GridIcon,
  admin: Compass01Icon,
}

function megaGroupIcon(groupId: string): IconComponent {
  return MEGA_GROUP_ICONS[groupId] ?? BoatIcon
}

const disclosureBtnClass =
  'group flex w-full items-center gap-3 rounded-2xl border border-neutral-200/70 bg-white p-3 text-start shadow-xs transition hover:border-neutral-300 hover:bg-neutral-50/80 aria-expanded:border-primary-300/70 aria-expanded:bg-primary-50/40 dark:border-neutral-700/80 dark:bg-neutral-800/80 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:aria-expanded:border-primary-700/60 dark:aria-expanded:bg-primary-950/20'

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
      <Disclosure key={gid} as="div" className="rounded-xl border border-neutral-100/90 bg-white/80 dark:border-neutral-700/80 dark:bg-neutral-800/40">
        <DisclosureButton className={clsx(disclosureBtnClass, 'border-transparent shadow-none p-2.5')}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
            <HugeiconsIcon icon={Icon} className="size-4" strokeWidth={1.75} aria-hidden="true" />
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
                className="flex items-center justify-between rounded-lg py-1.5 px-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-primary-600 dark:text-neutral-200 dark:hover:bg-neutral-700/60 dark:hover:text-primary-400"
              >
                <span>{child.name}</span>
                <span className="text-xs text-neutral-400">→</span>
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
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400">
            <HugeiconsIcon icon={Icon} className="size-4.5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-50">{group.name}</span>
          </span>
          <HugeiconsIcon icon={ArrowDown01Icon} className={chevronIconClass} strokeWidth={1.75} aria-hidden="true" />
        </DisclosureButton>
        <DisclosurePanel className="mt-1 space-y-0.5 rounded-xl bg-neutral-50/70 p-1.5 dark:bg-neutral-800/40">
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
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-white hover:text-primary-600 hover:shadow-2xs dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-primary-400"
                  >
                    <span>{child.name}</span>
                    <span className="text-xs text-neutral-400">→</span>
                  </Link>
                ),
              )
            : childList.map((child, idx) => (
                <Link
                  key={child.id ?? idx}
                  href={navItemHref(effectiveLocale, vitrinPath, child.href)}
                  onClick={handleClose}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-white hover:text-primary-600 hover:shadow-2xs dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-primary-400"
                >
                  <span>{child.name}</span>
                  <span className="text-xs text-neutral-400">→</span>
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
          className="flex items-center gap-3 rounded-2xl border border-primary-100 bg-gradient-to-r from-primary-50/80 via-white to-white p-3 text-sm font-semibold text-primary-900 shadow-xs transition hover:border-primary-200 hover:shadow-sm dark:border-primary-900/40 dark:from-primary-950/40 dark:via-neutral-800 dark:to-neutral-800 dark:text-primary-200"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-xs">
            <HugeiconsIcon icon={PlusSignCircleIcon} className="size-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="flex-1 leading-snug">{item.name}</span>
        </Link>
      )
    }

    return (
      <Disclosure key={item.id ?? index} as="div" defaultOpen={false}>
        <DisclosureButton className={disclosureBtnClass}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
            <HugeiconsIcon icon={Menu01Icon} className="size-4.5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="flex-1 text-start text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.name}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} className={chevronIconClass} strokeWidth={1.75} aria-hidden="true" />
        </DisclosureButton>
        <DisclosurePanel className="mt-1 space-y-0.5 rounded-xl bg-neutral-50/70 p-1.5 dark:bg-neutral-800/40">
          {item.children?.map((child, idx) =>
            child.children?.length ? (
              <div key={child.id ?? idx}>{renderNestedBranch(child, 0)}</div>
            ) : (
              <Link
                key={child.id ?? idx}
                href={navItemHref(effectiveLocale, vitrinPath, child.href)}
                onClick={handleClose}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-white hover:text-primary-600 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-primary-400"
              >
                <span>{child.name}</span>
                <span className="text-xs text-neutral-400">→</span>
              </Link>
            ),
          )}
        </DisclosurePanel>
      </Disclosure>
    )
  }

  return (
    <div className="space-y-4">
      {/* Üst Hızlı İşlem Şeridi: Sol (Telefon, WhatsApp) — Sağ (Para & Dil, Bildirimler, Hesabım) */}
      <div className="flex items-center justify-between gap-2">
        {/* Sol Grup: Telefon & WhatsApp */}
        <div className="flex items-center gap-2">
          {/* Telefon */}
          <a
            href={phoneTel || 'tel:+902120000000'}
            onClick={handleClose}
            aria-label={`Telefon: ${phoneDisplay || '+90 212 000 00 00'}`}
            title={phoneDisplay || '+90 212 000 00 00'}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200/80 bg-white text-neutral-700 shadow-xs transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-primary-950/40 dark:hover:text-primary-400"
          >
            <DeskPhoneBadge className="size-7 rounded-full" iconClassName="size-3.5" />
          </a>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/${whatsappE164 || (phoneDisplay ? phoneDisplay.replace(/\D/g, '') : '905551234567')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClose}
            aria-label={`WhatsApp: ${whatsappDisplay || phoneDisplay || '+90 212 000 00 00'}`}
            title={`WhatsApp: ${whatsappDisplay || phoneDisplay || '+90 212 000 00 00'}`}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200/80 bg-white text-neutral-700 shadow-xs transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white shadow-xs"
              aria-hidden
            >
              <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </span>
          </a>
        </div>

        {/* Sağ Grup: Para Birimi & Dil, Bildirimler, Hesabım */}
        <div className="flex items-center gap-2">
          {/* Para Birimi & Dil */}
          <div className="flex h-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200/80 bg-white px-2 shadow-xs dark:border-neutral-700 dark:bg-neutral-800">
            <CurrLangDropdown
              currencies={currencies}
              locale={effectiveLocale}
              panelAnchor={{
                to: 'bottom end',
                gap: 8,
              }}
              panelClassName="z-50 w-72 p-4!"
            />
          </div>

          {/* Bildirimler */}
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200/80 bg-white text-neutral-700 shadow-xs transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-primary-950/40 dark:hover:text-primary-400">
            <NotifyDropdown btnClassName="relative flex size-10 cursor-pointer items-center justify-center rounded-xl hover:bg-transparent focus-visible:outline-hidden" />
          </div>

          {/* Hesabım */}
          <Link
            href={navItemHref(effectiveLocale, vitrinPath, role === 'guest' ? '/login' : '/account')}
            onClick={handleClose}
            aria-label={role === 'guest' ? (s.login || 'Giriş Yap') : s.account}
            title={role === 'guest' ? (s.login || 'Giriş Yap') : s.account}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200/80 bg-white text-neutral-700 shadow-xs transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-primary-950/40 dark:hover:text-primary-400"
          >
            <HugeiconsIcon icon={UserCircleIcon} size={22} strokeWidth={1.5} />
          </Link>
        </div>
      </div>

      <Form className="flex-1 text-neutral-900 dark:text-neutral-200" action={handleSubmitForm}>
        <div className="relative flex items-center rounded-2xl border border-neutral-200/90 bg-neutral-50/90 px-3.5 py-2.5 transition-all focus-within:border-primary-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-500/15 dark:border-neutral-700/80 dark:bg-neutral-800/60 dark:focus-within:border-primary-400 dark:focus-within:bg-neutral-800">
          <HugeiconsIcon icon={Search01Icon} size={18} className="shrink-0 text-neutral-400 dark:text-neutral-500" strokeWidth={1.75} />
          <input
            type="search"
            name="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            aria-label={s.searchAria}
            placeholder={s.searchPlaceholder}
            className="ms-2.5 w-full border-none bg-transparent p-0 text-sm placeholder:text-neutral-400 focus:ring-0 focus:outline-hidden dark:placeholder:text-neutral-500"
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

      {/* 1 — Kategoriler */}
      {!showLiveSearch && megaRoot?.children?.length ? (
        <section aria-labelledby="sidebar-categories-heading" className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 id="sidebar-categories-heading" className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
              {s.categoriesHeading}
            </h2>
          </div>
          <div className="space-y-2">
            {megaRoot.children.map((group, i) => renderMegaGroup(group, i))}
          </div>
        </section>
      ) : null}

      {/* İlan ver vb. mega dışı üst öğeler */}
      {!showLiveSearch && extraMenuItems.length > 0 ? (
        <div className="space-y-2">{extraMenuItems.map((item, i) => renderExtraTopLevel(item, i))}</div>
      ) : null}

      {/* Rol bazlı bildirimler / bağlantılar */}
      <section aria-labelledby="sidebar-notif-heading" className="space-y-1.5">
        <h2 id="sidebar-notif-heading" className="px-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          {SECTION_LABELS[role]}
        </h2>
        <div className="space-y-1 rounded-2xl border border-neutral-200/60 bg-neutral-50/50 p-1.5 dark:border-neutral-700/60 dark:bg-neutral-800/30">
          {NOTIFICATIONS_BY_ROLE[role].map((notif) => {
            const href = role === 'guest' ? notif.href : vitrinPath(notif.href)
            return (
              <Link
                key={notif.id}
                href={href}
                onClick={handleClose}
                className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white hover:shadow-2xs dark:hover:bg-neutral-800/80"
              >
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${notif.color}15` }}
                >
                  <notif.icon className="size-4" style={{ color: notif.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {notif.title}
                    </p>
                    {notif.badge && (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: `${notif.color}18`, color: notif.color }}
                      >
                        {notif.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-neutral-400 dark:text-neutral-500">{notif.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <Divider className="my-1" />

      <div className="space-y-3 pt-1">
        <ButtonPrimary
          href={navItemHref(effectiveLocale, vitrinPath, '/add-listing/1')}
          onClick={handleClose}
          className="w-full justify-center rounded-xl py-3 text-sm font-semibold shadow-xs"
        >
          {s.listProperty}
        </ButtonPrimary>

        <div className="flex items-center justify-center gap-4 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          <Link href={navItemHref(effectiveLocale, vitrinPath, '/contact')} onClick={handleClose} className="transition hover:text-neutral-900 dark:hover:text-neutral-100">
            {s.contact}
          </Link>
          <span className="text-neutral-300 dark:text-neutral-600">•</span>
          <Link href={navItemHref(effectiveLocale, vitrinPath, '/blog')} onClick={handleClose} className="transition hover:text-neutral-900 dark:hover:text-neutral-100">
            {s.blog}
          </Link>
        </div>

        <p className="text-center text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">{s.lead}</p>
      </div>
    </div>
  )
}

export default SidebarNavigation
