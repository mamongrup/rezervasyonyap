'use client'

import clsx from 'clsx'
import {
  Bell,
  Bot,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  GalleryHorizontalEnd,
  LayoutDashboard,
  MapPin,
  Megaphone,
  MessageSquare,
  Package,
  Search,
  Settings,
  Share2,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import ManageCatalogNavItem from './ManageCatalogNavItem'

type NavLeaf = { path: string; label: string }
type NavSection = { heading: string; items: NavLeaf[] }
type NavGroupDef = {
  id: string
  label: string
  Icon: React.ElementType
  /** Düz liste (sections ile birlikte kullanılmaz) */
  items?: NavLeaf[]
  /** Alt başlıklar altında gruplanmış bağlantılar */
  sections?: NavSection[]
}

function getGroupItems(g: NavGroupDef): NavLeaf[] {
  if (g.sections?.length) return g.sections.flatMap((s) => s.items)
  return g.items ?? []
}

const GROUPS: NavGroupDef[] = [
  {
    id: 'dashboard',
    label: 'Gösterge Paneli',
    Icon: LayoutDashboard,
    items: [
      { path: '/manage/admin', label: 'Gösterge & istatistikler' },
      { path: '/manage/admin/workspace', label: 'İş planı & duyurular' },
      { path: '/manage/admin/access', label: 'Kullanıcı & rol yönetimi' },
      { path: '/manage/admin/settings?tab=google', label: 'Analitik & takip kodları' },
    ],
  },
  {
    id: 'reservations',
    label: 'Rezervasyonlar',
    Icon: CalendarCheck,
    items: [
      { path: '/manage/reservations', label: 'Tüm rezervasyonlar' },
      { path: '/manage/reservations/offers', label: 'Teklifler' },
      { path: '/manage/reservations/calendar', label: 'Takvim görünümü' },
      { path: '/manage/reservations/ical', label: 'iCal senkronizasyonu' },
    ],
  },
  {
    id: 'regions',
    label: 'Bölgeler',
    Icon: MapPin,
    items: [
      { path: '/manage/regions', label: 'Bölge listesi' },
      { path: '/manage/regions/hero-images', label: 'Bölge hero görselleri' },
      { path: '/manage/regions/countries', label: 'Ülkeler & şehirler & ilçeler' },
      { path: '/manage/regions/places', label: 'Yakın mekanlar (Google Maps)' },
    ],
  },
  {
    id: 'members',
    label: 'Üyeler',
    Icon: Users,
    items: [
      { path: '/manage/members/customers', label: 'Müşteriler' },
      { path: '/manage/admin/catalog/suppliers', label: 'Tedarikçi başvuruları' },
      { path: '/manage/admin/catalog/agencies', label: 'Acente profilleri' },
      { path: '/manage/admin/catalog/grants', label: 'Kategori izinleri' },
      { path: '/manage/admin/catalog/subcategories', label: 'Alt kategori yönetimi' },
      { path: '/manage/members/agencies', label: 'Acenteler' },
      { path: '/manage/agency-verify', label: 'TÜRSAB Doğrulama' },
      { path: '/manage/supplier-verify', label: 'Firma Doğrulama' },
      { path: '/manage/members/staff', label: 'Personel' },
      { path: '/manage/members/admins', label: 'Yöneticiler' },
    ],
  },
  {
    id: 'content',
    label: 'İçerik Yönetimi',
    Icon: FileText,
    items: [
      { path: '/manage/content/blog', label: 'Blog kategorileri & yazılar' },
      { path: '/manage/admin/content/navigation', label: 'Navigasyon menüsü' },
      { path: '/manage/content/header-footer', label: 'Header & footer (üst / alt menü linkleri)' },
      { path: '/manage/content/mega-menu', label: 'Mega menü' },
      { path: '/manage/content/catalog-menu', label: 'Katalog menüsü (header)' },
      { path: '/manage/content/sliders', label: 'Slider & banner' },
      { path: '/manage/content/popups', label: 'Popup yönetimi' },
      { path: '/manage/admin/content/seo-redirects', label: 'SEO yönlendirmeleri' },
      { path: '/manage/content/page-builder', label: 'Kategori & arama sayfaları' },
      { path: '/manage/content/pages', label: 'Sayfalar (CMS)' },
    ],
  },
  {
    id: 'media',
    label: 'Medya',
    Icon: GalleryHorizontalEnd,
    items: [
      { path: '/manage/media', label: 'Medya kütüphanesi' },
    ],
  },
  {
    id: 'campaigns',
    label: 'Kampanyalar',
    Icon: Megaphone,
    items: [
      { path: '/manage/campaigns', label: 'Tüm kampanyalar' },
      { path: '/manage/campaigns/coupons', label: 'Kuponlar' },
      { path: '/manage/campaigns/early-booking', label: 'Erken rezervasyon' },
      { path: '/manage/campaigns/last-minute', label: 'Son dakika' },
      { path: '/manage/campaigns/packages', label: 'Paket tatil' },
    ],
  },
  {
    id: 'marketing_comms',
    label: 'Pazarlama & iletişim',
    Icon: MessageSquare,
    items: [
      { path: '/manage/admin/marketing/messaging', label: 'Mesajlaşma kataloğu' },
    ],
  },
  {
    id: 'social_media',
    label: 'Sosyal medya',
    Icon: Share2,
    sections: [
      {
        heading: 'API & paylaşım',
        items: [{ path: '/manage/admin/marketing/social', label: 'Sosyal API & kuyruk' }],
      },
      {
        heading: 'Kanal sayfaları',
        items: [
          { path: '/manage/social/instagram', label: 'Instagram Shop & Story' },
          { path: '/manage/social/whatsapp', label: 'WhatsApp' },
        ],
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finans & Muhasebe',
    Icon: CreditCard,
    items: [
      { path: '/manage/admin/payments/provizyon', label: 'Provizyon yönetimi' },
      { path: '/manage/admin/payments/gateways', label: 'Ticari & sosyal (GMP/IG/WA)' },
      { path: '/manage/finance/invoices', label: 'Tüm faturalar' },
      { path: '/manage/finance/commissions', label: 'Komisyon ayarları' },
      { path: '/manage/finance/payment-gateways', label: 'Sanal POS (PayTR / Paratika)' },
      { path: '/manage/finance/reports', label: 'Mali raporlar' },
    ],
  },
  {
    id: 'notifications',
    label: 'Bildirimler',
    Icon: Bell,
    items: [
      { path: '/manage/notifications/email', label: 'E-posta şablonları' },
      { path: '/manage/notifications/sms', label: 'SMS (Netgsm)' },
      { path: '/manage/notifications/push', label: 'Push bildirimleri' },
    ],
  },
  {
    id: 'ai',
    label: 'Yapay zeka',
    Icon: Bot,
    sections: [
      {
        heading: 'Operasyon & içerik araçları',
        items: [
          { path: '/manage/ai', label: 'Modüller & genel ayarlar' },
          { path: '/manage/ai/content', label: 'İçerik oluşturucu' },
          { path: '/manage/ai/regions', label: 'Bölge oluşturucu' },
          { path: '/manage/ai/seo', label: 'SEO oluşturucu' },
          { path: '/manage/ai/translate', label: 'Çeviri asistanı' },
          { path: '/manage/ai/chatbot', label: 'Chatbot ayarları' },
        ],
      },
      {
        heading: 'Yönetim & izleme',
        items: [{ path: '/manage/admin/marketing/ai', label: 'Sağlayıcılar & iş kuyruğu' }],
      },
    ],
  },
  {
    id: 'seo',
    label: 'SEO',
    Icon: Search,
    items: [
      { path: '/manage/seo', label: 'SEO genel ayarları' },
      { path: '/manage/seo/sitemap', label: 'Site haritası' },
      { path: '/manage/seo/404', label: '404 yönetimi' },
      { path: '/manage/seo/redirects', label: '301 yönlendirmeler' },
      { path: '/manage/seo/rich-snippets', label: 'Rich Snippets' },
      { path: '/manage/seo/merchant', label: 'Google Merchant' },
      { path: '/manage/seo/links', label: 'Link yönetimi' },
    ],
  },
  {
    id: 'settings',
    label: 'Ayarlar',
    Icon: Settings,
    items: [
      { path: '/manage/admin/settings?tab=kimlik', label: 'Site kimliği' },
      { path: '/manage/admin/settings?tab=operasyon', label: 'Ödeme & kur' },
      { path: '/manage/admin/settings?tab=seo', label: 'SEO' },
      { path: '/manage/admin/settings?tab=sosyal', label: 'Sosyal medya' },
      { path: '/manage/admin/settings?tab=ai', label: 'Yapay zeka' },
      { path: '/manage/admin/settings?tab=google', label: 'Google' },
      { path: '/manage/admin/settings?tab=merchant', label: 'Merchant & kategoriler' },
      { path: '/manage/admin/settings/integrations', label: 'Entegrasyon API ayarları' },
      { path: '/manage/admin/settings/notifications', label: 'Bildirim ayarları' },
      { path: '/manage/i18n', label: 'Diller & çeviriler' },
      { path: '/manage/settings/cdn', label: 'CDN (Bunny / Cloudflare)' },
      { path: '/manage/settings/image-quality', label: 'Görsel kalitesi & yükleme' },
      { path: '/manage/settings/reviews', label: 'Yorum yönetimi' },
    ],
  },
  {
    id: 'access',
    label: 'Erişim Kontrolü',
    Icon: Users,
    items: [
      { path: '/manage/admin/access', label: 'Kullanıcılar & Roller' },
    ],
  },
  {
    id: 'tools',
    label: 'Araçlar',
    Icon: Wrench,
    items: [
      { path: '/manage/admin/tools', label: 'Araçlar' },
      { path: '/manage/audit-log', label: 'Denetim günlüğü' },
    ],
  },
]

/** Katalog grubu için sabit tanım (items dinamik API'den gelir) */
const CATALOG_GROUP_ID = 'catalog'

function isUnderPath(pathname: string | null, prefixed: string): boolean {
  if (!pathname) return false
  return pathname === prefixed || pathname.startsWith(`${prefixed}/`)
}

export default function ManageAdminNavTree({
  onNavLinkClick,
}: {
  onNavLinkClick?: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const vitrinPath = useVitrinHref()

  const [manualOpen, setManualOpen] = useState<Record<string, boolean | undefined>>({})
  const [navSearch, setNavSearch] = useState('')

  const isGroupAutoOpen = useCallback(
    (group: NavGroupDef) => {
      const currentTab = searchParams?.get('tab') ?? ''
      return getGroupItems(group).some((i) => {
        const [itemPath, itemQuery = ''] = i.path.split('?')
        const h = vitrinPath(itemPath)
        if (itemQuery) {
          const itemTab = new URLSearchParams(itemQuery).get('tab') ?? ''
          return pathname === h && currentTab === itemTab
        }
        return isUnderPath(pathname, h)
      })
    },
    [pathname, vitrinPath, searchParams],
  )

  const isGroupOpen = useCallback(
    (group: NavGroupDef) => {
      const manual = manualOpen[group.id]
      if (manual !== undefined) return manual
      return isGroupAutoOpen(group)
    },
    [manualOpen, isGroupAutoOpen],
  )

  const categoryContractsHref = vitrinPath('/manage/admin/category-contracts')
  const isCatalogOpen = useMemo(() => {
    const manual = manualOpen[CATALOG_GROUP_ID]
    if (manual !== undefined) return manual
    const h = vitrinPath('/manage/catalog')
    return isUnderPath(pathname, h) || isUnderPath(pathname, categoryContractsHref)
  }, [manualOpen, pathname, vitrinPath, categoryContractsHref])

  const toggleGroup = useCallback((id: string, currentOpen: boolean) => {
    setManualOpen((prev) => ({ ...prev, [id]: !currentOpen }))
  }, [])

  /** Returns the deepest matching item path (most specific match first), supports ?tab= params */
  const activeItemPath = useMemo(() => {
    const currentTab = searchParams?.get('tab') ?? ''
    const allItems = GROUPS.flatMap((g) => getGroupItems(g))
    return [...allItems]
      .sort((a, b) => b.path.length - a.path.length)
      .find((i) => {
        const [itemPath, itemQuery = ''] = i.path.split('?')
        const prefixed = vitrinPath(itemPath)
        if (itemQuery) {
          // Query param'lı item: pathname ve tab param eşleşmeli
          const itemTab = new URLSearchParams(itemQuery).get('tab') ?? ''
          return pathname === prefixed && currentTab === itemTab
        }
        return isUnderPath(pathname, prefixed)
      })?.path
  }, [pathname, vitrinPath, searchParams])

  const LINK_BASE =
    'block rounded px-2 py-1.5 text-xs transition-colors'
  const LINK_ACTIVE = clsx(LINK_BASE, 'font-semibold text-[color:var(--manage-primary)]')
  const LINK_IDLE = clsx(
    LINK_BASE,
    'text-[color:var(--manage-text-muted)] hover:text-[color:var(--manage-text)]',
  )

  const GROUP_BTN_BASE =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors'
  const GROUP_BTN_ACTIVE = clsx(
    GROUP_BTN_BASE,
    'bg-[color:var(--manage-primary-soft)] text-[color:var(--manage-primary)]',
  )
  const GROUP_BTN_IDLE = clsx(
    GROUP_BTN_BASE,
    'text-[color:var(--manage-text-muted)] hover:bg-black/[0.04] hover:text-[color:var(--manage-text)] dark:hover:bg-white/[0.06]',
  )

  const catalogHref = vitrinPath('/manage/catalog')
  const inCatalog =
    isUnderPath(pathname, catalogHref) || isUnderPath(pathname, categoryContractsHref)

  // Filter groups by search query
  const searchQuery = navSearch.toLowerCase().trim()
  const filteredGroups = searchQuery
    ? GROUPS.map((g) => {
        const flat = getGroupItems(g).filter((i) => i.label.toLowerCase().includes(searchQuery))
        if (flat.length === 0 && !g.label.toLowerCase().includes(searchQuery)) return null
        return { ...g, items: flat, sections: undefined } as NavGroupDef
      }).filter((g): g is NavGroupDef => g != null)
    : GROUPS

  return (
    <div className="flex flex-col gap-0.5 px-2 pb-4">
      {/* Nav search */}
      <div className="mb-2 px-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            placeholder="Menüde ara…"
            className="w-full rounded-xl border border-[color:var(--manage-sidebar-border)] bg-transparent py-1.5 pl-8 pr-7 text-xs text-[color:var(--manage-text)] placeholder:text-neutral-400 focus:border-[color:var(--manage-primary)] focus:outline-none"
          />
          {navSearch ? (
            <button onClick={() => setNavSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>
      {/* ─── Katalog (dinamik kategorili özel grup) ─── */}
      <div className={searchQuery ? 'hidden' : ''}>
        <button
          type="button"
          onClick={() => toggleGroup(CATALOG_GROUP_ID, isCatalogOpen)}
          className={inCatalog ? GROUP_BTN_ACTIVE : GROUP_BTN_IDLE}
          aria-expanded={isCatalogOpen}
        >
          <Package className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Katalog</span>
          {isCatalogOpen
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        </button>
        {isCatalogOpen ? (
          <ul className="ms-4 mt-0.5 space-y-0.5 border-l border-[color:var(--manage-sidebar-border)] ps-1">
            <ManageCatalogNavItem onNavLinkClick={onNavLinkClick} embedded />
            <li className="list-none">
              <Link
                href={categoryContractsHref}
                onClick={onNavLinkClick}
                className={isUnderPath(pathname, categoryContractsHref) ? LINK_ACTIVE : LINK_IDLE}
              >
                Sözleşme şablonları (kategori)
              </Link>
            </li>
          </ul>
        ) : null}
      </div>

      {/* ─── Statik gruplar ─── */}
      {filteredGroups.map((group) => {
        const open = searchQuery ? true : isGroupOpen(group)
        const hasActive = getGroupItems(group).some((i) => activeItemPath === i.path)
        const { Icon } = group
        const useSections = !searchQuery && Boolean(group.sections?.length)

        return (
          <div key={group.id}>
            <button
              type="button"
              onClick={() => !searchQuery && toggleGroup(group.id, open)}
              className={hasActive ? GROUP_BTN_ACTIVE : GROUP_BTN_IDLE}
              aria-expanded={open}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{group.label}</span>
              {!searchQuery && (open
                ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                : <ChevronRight className="h-3.5 w-3.5 shrink-0" />)}
            </button>

            {open ? (
              <ul className="ms-4 mt-0.5 space-y-0.5 border-l border-[color:var(--manage-sidebar-border)] ps-3">
                {useSections
                  ? group.sections!.map((section) => (
                      <li key={section.heading} className="list-none">
                        <div className="pt-2 first:pt-0">
                          <span className="mb-1 block px-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--manage-text-muted)] opacity-90">
                            {section.heading}
                          </span>
                          <ul className="space-y-0.5">
                            {section.items.map((item) => {
                              const active = activeItemPath === item.path
                              return (
                                <li key={item.path}>
                                  <Link
                                    href={vitrinPath(item.path)}
                                    prefetch={false}
                                    onClick={() => {
                                      setNavSearch('')
                                      onNavLinkClick?.()
                                    }}
                                    className={active ? LINK_ACTIVE : LINK_IDLE}
                                  >
                                    {item.label}
                                  </Link>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      </li>
                    ))
                  : getGroupItems(group).map((item) => {
                      const active = activeItemPath === item.path
                      return (
                        <li key={item.path}>
                          <Link
                            href={vitrinPath(item.path)}
                            prefetch={false}
                            onClick={() => {
                              setNavSearch('')
                              onNavLinkClick?.()
                            }}
                            className={active ? LINK_ACTIVE : LINK_IDLE}
                          >
                            {item.label}
                          </Link>
                        </li>
                      )
                    })}
              </ul>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
