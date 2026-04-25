'use client'

import { categoryLabelTr } from '@/lib/catalog-category-ui'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { getStaffReservations } from '@/lib/travel-api'
import { useTheme } from '@/components/theme-provider'
import clsx from 'clsx'
import {
  Bell,
  CalendarPlus,
  ChevronRight,
  FilePlus,
  Moon,
  PenSquare,
  Plus,
  Search,
  Sun,
  X,
} from 'lucide-react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ─── Breadcrumb helpers ───────────────────────────────────────────────────────

const PATH_LABELS: Record<string, string> = {
  manage: 'Yönetim',
  admin: 'Gösterge Paneli',
  catalog: 'Katalog',
  reservations: 'Rezervasyonlar',
  members: 'Üyeler',
  customers: 'Müşteriler',
  agencies: 'Acenteler',
  suppliers: 'Tedarikçiler',
  staff: 'Personel',
  admins: 'Yöneticiler',
  content: 'İçerik',
  blog: 'Blog',
  pages: 'Sayfalar',
  sliders: 'Slider & Banner',
  popups: 'Popuplar',
  'header-footer': 'Header & Footer',
  'mega-menu': 'Mega Menü',
  'catalog-menu': 'Katalog menüsü',
  media: 'Medya',
  finance: 'Finans',
  invoices: 'Faturalar',
  commissions: 'Komisyonlar',
  currencies: 'Ödeme & kur',
  'payment-gateways': 'Sanal POS',
  wallets: 'Cüzdan',
  reports: 'Raporlar',
  campaigns: 'Kampanyalar',
  coupons: 'Kuponlar',
  'early-booking': 'Erken Rezervasyon',
  'last-minute': 'Son Dakika',
  packages: 'Paket Tatil',
  social: 'Sosyal Medya',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  ads: 'Reklamlar',
  notifications: 'Bildirimler',
  email: 'E-posta',
  sms: 'SMS',
  push: 'Push',
  ai: 'Yapay Zeka',
  regions: 'Bölgeler',
  countries: 'Ülkeler & Şehirler',
  seo: 'SEO',
  sitemap: 'Site Haritası',
  '404': '404 Yönetimi',
  redirects: '301 Yönlendirmeler',
  'rich-snippets': 'Rich Snippets',
  merchant: 'Google Merchant',
  links: 'Link Yönetimi',
  settings: 'Ayarlar',
  cookies: 'Çerez ayarları',
  maps: 'Google Maps',
  cdn: 'CDN',
  'image-quality': 'Görsel Kalitesi',
  'live-support': 'Canlı Destek',
  reviews: 'Yorum Yönetimi',
  'audit-log': 'Denetim Günlüğü',
  i18n: 'Diller & Çeviriler',
  'general-settings': 'Genel Ayarlar',
  'hero-menu': 'Hero Menü',
  calendar: 'Takvim',
  offers: 'Teklifler',
  ical: 'iCal',
  analytics: 'Analitik',
  tools: 'Araçlar',
  chatbot: 'Chatbot',
  translate: 'Çeviri',
  agency: 'Acente Portalı',
  supplier: 'Tedarikçi Portalı',
  'category-contracts': 'Kategori Sözleşmeleri',
  // Yeni admin bölüm sayfaları
  banners: 'Banner Yönetimi',
  navigation: 'Navigasyon',
  'seo-redirects': 'SEO Yönlendirmeleri',
  grants: 'Kategori İzinleri',
  payments: 'Ödemeler',
  provizyon: 'Provizyon Yönetimi',
  gateways: 'Ticari & sosyal entegrasyonlar',
  marketing: 'Pazarlama',
  messaging: 'Mesajlaşma',
  integrations: 'Entegrasyon Ayarları',
  general: 'Genel Ayarlar',
  access: 'Erişim Kontrolü',
  workspace: 'İş planı & duyurular',
  announcements: 'Duyurular',
  listings: 'İlanlar',
  new: 'Yeni ilan',
  attributes: 'Öznitelikler',
  'price-inclusions': 'Dahil / Hariç',
  'accommodation-rules': 'Kurallar',
  availability: 'Müsaitlik',
  recovery: 'Kurtarma',
  translations: 'Çeviriler',
  'room-features': 'Oda öznitelikleri',
}

function buildBreadcrumbs(pathname: string | null, locale: string, vitrinPath: (internal: string) => string) {
  if (!pathname) return []
  const parts = pathname
    .replace(`/${locale}/`, '/')
    .split('/')
    .filter(Boolean)

  const crumbs: { label: string; href: string }[] = []
  let cumulative = ''
  for (const part of parts) {
    cumulative += `/${part}`
    const label = PATH_LABELS[part] ?? categoryLabelTr(part)
    crumbs.push({ label, href: vitrinPath(cumulative) })
  }
  // Remove first "manage" since we're inside it
  return crumbs.slice(1)
}

// ─── Global search ────────────────────────────────────────────────────────────

const SEARCH_INDEX = [
  { label: 'Gösterge Paneli', href: '/manage/admin', tag: 'panel' },
  { label: 'Tüm Rezervasyonlar', href: '/manage/reservations', tag: 'rezervasyon' },
  { label: 'Takvim Görünümü', href: '/manage/reservations/calendar', tag: 'rezervasyon' },
  { label: 'Teklifler', href: '/manage/reservations/offers', tag: 'rezervasyon' },
  { label: 'iCal Senkronizasyonu', href: '/manage/reservations/ical', tag: 'rezervasyon' },
  { label: 'Blog Yönetimi', href: '/manage/content/blog', tag: 'içerik' },
  { label: 'CMS Sayfalar', href: '/manage/content/pages', tag: 'içerik' },
  { label: 'Slider & Banner', href: '/manage/content/sliders', tag: 'içerik' },
  { label: 'Popup Yönetimi', href: '/manage/content/popups', tag: 'içerik' },
  { label: 'Katalog menüsü (header)', href: '/manage/content/catalog-menu', tag: 'içerik' },
  { label: 'Medya Kütüphanesi', href: '/manage/media', tag: 'medya' },
  { label: 'Müşteriler', href: '/manage/members/customers', tag: 'üye' },
  { label: 'Acenteler', href: '/manage/members/agencies', tag: 'üye' },
  { label: 'Tedarikçiler', href: '/manage/members/suppliers', tag: 'üye' },
  { label: 'Katalog', href: '/manage/catalog', tag: 'katalog' },
  { label: 'Katalog — Dahil / Hariç (villa)', href: '/manage/catalog/holiday_home/price-inclusions', tag: 'katalog' },
  { label: 'Kuponlar', href: '/manage/campaigns/coupons', tag: 'kampanya' },
  { label: 'Tüm Faturalar', href: '/manage/finance/invoices', tag: 'finans' },
  { label: 'Komisyonlar', href: '/manage/finance/commissions', tag: 'finans' },
  { label: 'Ödeme & kur (para birimleri)', href: '/manage/admin/settings?tab=operasyon', tag: 'ayarlar' },
  { label: 'Sanal POS', href: '/manage/finance/payment-gateways', tag: 'finans' },
  { label: 'E-posta Bildirimleri', href: '/manage/notifications/email', tag: 'bildirim' },
  { label: 'SMS (Netgsm)', href: '/manage/notifications/sms', tag: 'bildirim' },
  { label: 'Instagram', href: '/manage/social/instagram', tag: 'sosyal' },
  { label: 'WhatsApp', href: '/manage/social/whatsapp', tag: 'sosyal' },
  { label: 'AI İçerik Oluşturucu', href: '/manage/ai/content', tag: 'yapay zeka' },
  { label: 'AI Bölge Oluşturucu', href: '/manage/ai/regions', tag: 'yapay zeka' },
  { label: 'AI SEO', href: '/manage/ai/seo', tag: 'yapay zeka' },
  { label: 'SEO Genel', href: '/manage/seo', tag: 'seo' },
  { label: '301 Yönlendirmeler', href: '/manage/seo/redirects', tag: 'seo' },
  { label: '404 Yönetimi', href: '/manage/seo/404', tag: 'seo' },
  { label: 'Site Haritası', href: '/manage/seo/sitemap', tag: 'seo' },
  { label: 'Google Maps', href: '/manage/settings/maps', tag: 'ayarlar' },
  { label: 'CDN Ayarları', href: '/manage/settings/cdn', tag: 'ayarlar' },
  { label: 'Görsel Kalitesi & Yükleme', href: '/manage/settings/image-quality', tag: 'ayarlar' },
  { label: 'Canlı Destek', href: '/manage/settings/live-support', tag: 'ayarlar' },
  { label: 'Yorum Yönetimi', href: '/manage/settings/reviews', tag: 'ayarlar' },
  { label: 'Denetim Günlüğü', href: '/manage/audit-log', tag: 'araçlar' },
  { label: 'Diller & Çeviriler', href: '/manage/i18n', tag: 'ayarlar' },
  { label: 'Bölge Listesi', href: '/manage/regions', tag: 'bölge' },
  { label: 'Ülkeler & Şehirler & İlçeler', href: '/manage/regions/countries', tag: 'bölge' },
  { label: 'Analitik', href: '/manage/admin/analytics', tag: 'panel' },
  { label: 'Blog Yönetimi (Admin)', href: '/manage/admin/content/blog', tag: 'içerik' },
  { label: 'Navigasyon Menüsü', href: '/manage/admin/content/navigation', tag: 'içerik' },
  { label: 'SEO Yönlendirmeleri', href: '/manage/admin/content/seo-redirects', tag: 'seo' },
  { label: 'Tedarikçi Başvuruları', href: '/manage/admin/catalog/suppliers', tag: 'üye' },
  { label: 'Acente Profilleri', href: '/manage/admin/catalog/agencies', tag: 'üye' },
  { label: 'Kategori İzinleri', href: '/manage/admin/catalog/grants', tag: 'üye' },
  { label: 'Provizyon Yönetimi', href: '/manage/admin/payments/provizyon', tag: 'finans' },
  { label: 'Ticari & sosyal entegrasyonlar', href: '/manage/admin/payments/gateways', tag: 'finans' },
  { label: 'Sosyal Medya (Admin)', href: '/manage/admin/marketing/social', tag: 'pazarlama' },
  { label: 'Mesajlaşma & Bildirimler', href: '/manage/admin/marketing/messaging', tag: 'pazarlama' },
  { label: 'Yapay Zeka Ayarları', href: '/manage/admin/marketing/ai', tag: 'pazarlama' },
  { label: 'Merchant & Sosyal Satış', href: '/manage/admin/marketing/merchant', tag: 'pazarlama' },
  { label: 'Entegrasyon API Ayarları', href: '/manage/admin/settings/integrations', tag: 'ayarlar' },
  { label: 'Bildirim Ayarları', href: '/manage/admin/settings/notifications', tag: 'ayarlar' },
  { label: 'Genel Ayarlar', href: '/manage/admin/settings/general', tag: 'ayarlar' },
  { label: 'Çerez ayarları', href: '/manage/admin/settings/cookies', tag: 'ayarlar' },
  { label: 'İş planı & duyurular', href: '/manage/admin/workspace', tag: 'görev' },
  { label: 'Personel iş planı', href: '/manage/staff/workspace', tag: 'personel' },
]

function SearchModal({ vitrinPath, onClose }: { vitrinPath: (internal: string) => string; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const results = query.trim()
    ? SEARCH_INDEX.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.tag.includes(query.toLowerCase()),
      ).slice(0, 8)
    : SEARCH_INDEX.slice(0, 8)

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[10vh] bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
          <Search className="h-5 w-5 shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sayfa, modül veya özellik ara…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="manage-search-query"
          />
          <kbd className="hidden rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-400 dark:border-neutral-700 sm:block">ESC</kbd>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X className="h-4 w-4" /></button>
        </div>
        <ul className="max-h-80 overflow-y-auto py-2">
          {results.map((item) => (
            <li key={item.href}>
              <Link
                href={vitrinPath(item.href)}
                onClick={onClose}
                className="flex items-center justify-between px-4 py-2.5 text-sm text-neutral-700 hover:bg-[color:var(--manage-primary-soft)] hover:text-[color:var(--manage-primary)] dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <span>{item.label}</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800">
                  {item.tag}
                </span>
              </Link>
            </li>
          ))}
          {query && results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-neutral-400">Sonuç bulunamadı.</li>
          )}
        </ul>
        <div className="border-t border-neutral-50 px-4 py-2 dark:border-neutral-800">
          <p className="text-[11px] text-neutral-400">
            <kbd className="rounded border border-neutral-200 px-1 py-0.5 dark:border-neutral-700">↑↓</kbd> gezin &nbsp;
            <kbd className="rounded border border-neutral-200 px-1 py-0.5 dark:border-neutral-700">↵</kbd> seç &nbsp;
            <kbd className="rounded border border-neutral-200 px-1 py-0.5 dark:border-neutral-700">ESC</kbd> kapat
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Quick Create Menu ────────────────────────────────────────────────────────

const QUICK_CREATE = [
  { label: 'Yeni Blog Yazısı', icon: PenSquare, href: '/manage/content/blog' },
  { label: 'Yeni CMS Sayfası', icon: FilePlus, href: '/manage/content/pages' },
  { label: 'Yeni Kampanya', icon: Plus, href: '/manage/campaigns' },
  { label: 'Yeni Rezervasyon Teklifi', icon: CalendarPlus, href: '/manage/reservations/offers' },
]

// ─── Notification dot ────────────────────────────────────────────────────────

function NotifBell({ vitrinPath }: { vitrinPath: (internal: string) => string }) {
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const token = getStoredAuthToken() ?? ''

  useEffect(() => {
    if (!token) return
    getStaffReservations(token)
      .then((r) => setCount(r.reservations.filter((rv) => rv.status === 'pending').length))
      .catch(() => {})
  }, [token])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
      >
        <Bell className="h-5 w-5" />
        {count > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-neutral-100 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Bekleyen İşlemler</p>
          {count > 0 ? (
            <Link href={vitrinPath('/manage/reservations')} onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300">
              <span>Onay bekleyen rezervasyon</span>
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">{count}</span>
            </Link>
          ) : (
            <p className="text-center text-sm text-neutral-400 py-3">✅ Bekleyen işlem yok</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManagePanelTopBar() {
  const params = useParams()
  const pathname = usePathname()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const { resolvedTheme, setTheme } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const crumbs = useMemo(() => buildBreadcrumbs(pathname, locale, vitrinPath), [pathname, locale, vitrinPath])

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[color:var(--manage-header-border)] bg-[color:var(--manage-header-bg)] px-4 backdrop-blur-xl lg:px-6">
        {/* Breadcrumbs */}
        <nav className="hidden min-w-0 flex-1 items-center gap-1 text-sm md:flex">
          {crumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-300" />}
              {i === crumbs.length - 1 ? (
                <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[180px]">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 truncate max-w-[120px]">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-400 hover:border-[color:var(--manage-primary)] hover:text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:text-neutral-300"
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Ara…</span>
            <kbd className="hidden rounded border border-neutral-200 px-1 py-0.5 text-[10px] dark:border-neutral-700 lg:inline">⌘K</kbd>
          </button>

          {/* Dark/Light mode toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 hover:bg-[color:var(--manage-hover-bg)] hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            title={resolvedTheme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>

          {/* Notifications */}
          <NotifBell vitrinPath={vitrinPath} />

          {/* Quick create */}
          <div className="relative">
            <button
              onClick={() => setQuickOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-xl bg-[color:var(--manage-primary)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Yeni</span>
            </button>
            {quickOpen ? (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setQuickOpen(false)} />
                <div className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                  {QUICK_CREATE.map((item) => (
                    <Link
                      key={item.href}
                      href={vitrinPath(item.href)}
                      onClick={() => setQuickOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 hover:bg-[color:var(--manage-primary-soft)] hover:text-[color:var(--manage-primary)] dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {searchOpen ? <SearchModal vitrinPath={vitrinPath} onClose={() => setSearchOpen(false)} /> : null}
    </>
  )
}
