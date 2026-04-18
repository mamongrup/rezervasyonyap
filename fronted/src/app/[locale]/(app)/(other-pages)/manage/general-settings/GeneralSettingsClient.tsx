'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { useLocaleSegment } from '@/contexts/locale-context'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  createCurrency,
  getActivePaymentProvider,
  getSitePublicConfig,
  listCurrencies,
  listProductCategories,
  listSiteSettings,
  patchCurrencyActive,
  putCurrencyOrder,
  refreshTcmbRates,
  sendNetgsmTestSms,
  setActivePaymentProvider,
  upsertSiteSetting,
  type CurrencyRow,
  type ProductCategoryRow,
} from '@/lib/travel-api'
import { AI_PROFILE_MODULES, clampTimeoutSec } from '@/lib/ai-upstream-timeouts'
import {
  DEFAULT_HOME_PAGE_LINKS,
  type HomePageLinkItem,
  parseHomePageLinksFromBranding,
  parseMobileAccountPathFromBranding,
} from '@/lib/site-branding-seo'
import { uploadBrandingAsset, type BrandingUploadPurpose } from '@/lib/upload-branding-asset'
import CurrencyReorderTable from './CurrencyReorderTable'
import TravelHomeCategoryOrderPanel from './TravelHomeCategoryOrderPanel'
import { normalizeTravelCategoryHomeOrder } from '@/data/category-registry'
import { ORDERED_PRODUCT_CATEGORY_CODES, categoryLabelTr } from '@/lib/catalog-category-ui'
import ImageUpload from '@/components/editor/ImageUpload'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Status = { kind: 'idle' | 'ok' | 'err'; text?: string }

function asRecord(v: unknown): Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

type GeneralSettingsClientProps = {
  /** `true` ise başlık ve dış container kısaltılır (Yönetici sayfasında gömülü kullanım). */
  embedded?: boolean
}

function BrandingImageUploadRow({
  label,
  hint,
  url,
  onChange,
  purpose,
  accept,
  preview,
}: {
  label: string
  hint?: string
  url: string
  onChange: (v: string) => void
  purpose: BrandingUploadPurpose
  accept: string
  preview: 'logo-light' | 'logo-dark' | 'favicon'
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const newUrl = await uploadBrandingAsset(file, purpose)
      onChange(newUrl)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Yükleme başarısız')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const previewBox =
    preview === 'favicon' ? (
      <div className="mt-3 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        {url ? (
          <img src={url} alt="" className="h-9 w-9 object-contain" />
        ) : (
          <span className="text-[10px] text-neutral-400">—</span>
        )}
      </div>
    ) : preview === 'logo-dark' ? (
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-900 p-3 dark:border-neutral-800">
        {url ? (
          <>
            <img src={url} alt="" className="h-10 w-auto max-w-[200px] object-contain" />
            <span className="text-xs text-neutral-500">Koyu tema önizleme</span>
          </>
        ) : (
          <span className="text-xs text-neutral-500">Önizleme için yükleyin veya URL girin</span>
        )}
      </div>
    ) : (
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        {url ? (
          <>
            <img src={url} alt="" className="h-10 w-auto max-w-[200px] object-contain" />
            <span className="text-xs text-neutral-400">Önizleme</span>
          </>
        ) : (
          <span className="text-xs text-neutral-500">Önizleme için yükleyin veya URL girin</span>
        )}
      </div>
    )

  return (
    <div>
      <Field className="block">
        <Label>{label}</Label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept={accept}
            onChange={(e) => void onPick(e)}
          />
          <ButtonPrimary type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? 'Yükleniyor…' : 'Dosya seç ve yükle'}
          </ButtonPrimary>
          {url ? (
            <button
              type="button"
              className="text-sm text-red-600 underline dark:text-red-400"
              onClick={() => onChange('')}
            >
              Kaldır
            </button>
          ) : null}
        </div>
        {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
        <details className="mt-3 rounded-lg border border-neutral-100 p-3 dark:border-neutral-800">
          <summary className="cursor-pointer text-xs font-medium text-neutral-500">Harici URL (isteğe bağlı)</summary>
          <Input
            className="mt-2 font-mono text-sm"
            value={url}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
          />
        </details>
      </Field>
      {previewBox}
    </div>
  )
}

/** Finans sayfasından taşınan hızlı seçim — yeni kod satırını doldurur. */
const COMMON_CURRENCY_PRESETS = [
  { code: 'TRY', name: 'Türk Lirası', symbol: '₺' },
  { code: 'USD', name: 'Amerikan Doları', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'İngiliz Sterlini', symbol: '£' },
  { code: 'CNY', name: 'Çin Yuanı (Renminbi)', symbol: '¥' },
  { code: 'RUB', name: 'Rus Rublesi', symbol: '₽' },
  { code: 'CHF', name: 'İsviçre Frangı', symbol: 'CHF' },
  { code: 'SAR', name: 'Suudi Riyali', symbol: 'SAR' },
  { code: 'AED', name: 'BAE Dirhemi', symbol: 'AED' },
] as const

const SETTINGS_TABS = [
  { id: 'kimlik' as const, label: 'Site kimliği' },
  { id: 'operasyon' as const, label: 'Ödeme & kur' },
  { id: 'seo' as const, label: 'SEO' },
  { id: 'sosyal' as const, label: 'Sosyal medya' },
  { id: 'ai' as const, label: 'Yapay zeka' },
  { id: 'google' as const, label: 'Google' },
  { id: 'merchant' as const, label: 'Merchant & kategoriler' },
]

export default function GeneralSettingsClient({ embedded = false }: GeneralSettingsClientProps) {
  const locale = useLocaleSegment()
  const vitrinPath = useVitrinHref()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [loading, setLoading] = useState(true)

  const [mapsKey, setMapsKey] = useState('')
  const [mapsLat, setMapsLat] = useState('39.0')
  const [mapsLng, setMapsLng] = useState('35.0')
  const [mapsZoom, setMapsZoom] = useState('6')
  const [mapsRest, setMapsRest] = useState<Record<string, unknown>>({})

  // Google Services (stored in analytics key)
  const [ga4Id, setGa4Id] = useState('')
  const [gtmId, setGtmId] = useState('')
  const [adsenseId, setAdsenseId] = useState('')
  const [adsenseAutoAds, setAdsenseAutoAds] = useState(false)
  const [googleAdsId, setGoogleAdsId] = useState('')
  const [searchConsoleCode, setSearchConsoleCode] = useState('')
  const [analyticsRest, setAnalyticsRest] = useState<Record<string, unknown>>({})
  const [googleServicesSaving, setGoogleServicesSaving] = useState(false)

  const [headerHtml, setHeaderHtml] = useState('')
  const [footerHtml, setFooterHtml] = useState('')
  const [uiRest, setUiRest] = useState<Record<string, unknown>>({})

  const [analyticsJson, setAnalyticsJson] = useState('{}')
  const [brandingJson, setBrandingJson] = useState('{}')

  const [activePay, setActivePay] = useState<string | null>(null)

  const [tcmbMsg, setTcmbMsg] = useState<string | null>(null)

  const [currencies, setCurrencies] = useState<CurrencyRow[]>([])
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newSymbol, setNewSymbol] = useState('')
  const [newDp, setNewDp] = useState('2')
  const [currencyBusy, setCurrencyBusy] = useState(false)
  const [currencyToggleBusy, setCurrencyToggleBusy] = useState<string | null>(null)
  const [currencyHint, setCurrencyHint] = useState<string | null>(null)
  const [currencyOrderSaving, setCurrencyOrderSaving] = useState(false)

  const [netgsmTo, setNetgsmTo] = useState('')
  const [netgsmText, setNetgsmText] = useState('Travel test mesajı')
  const [netgsmMsg, setNetgsmMsg] = useState<string | null>(null)
  const [netgsmBusy, setNetgsmBusy] = useState(false)

  type TabId = (typeof SETTINGS_TABS)[number]['id']
  const validTabIds = SETTINGS_TABS.map((t) => t.id) as TabId[]
  const paramTab = searchParams?.get('tab') as TabId | null
  /** URL tab parametresi — ayrı state + useEffect ile senkronlamak yerine doğrudan türetilir (mount uyarılarını önler). */
  const activeTab: TabId = paramTab && validTabIds.includes(paramTab) ? paramTab : 'kimlik'

  // Site identity fields (stored in branding key)
  const [siteName, setSiteName] = useState('')
  const [siteDescription, setSiteDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoDarkUrl, setLogoDarkUrl] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [brandingRest, setBrandingRest] = useState<Record<string, unknown>>({})
  const [categoryLogos, setCategoryLogos] = useState<Record<string, { logo_url: string; logo_url_dark: string }>>({})
  const [categoryLogosSaving, setCategoryLogosSaving] = useState(false)
  // Icon + text logo mode
  const [logoMode, setLogoMode] = useState<'image' | 'icon_text'>('image')
  const [logoIconUrl, setLogoIconUrl] = useState('')
  const [logoTextLine1, setLogoTextLine1] = useState('')
  const [logoTextLine2, setLogoTextLine2] = useState('')
  const [logoTextLine2Color, setLogoTextLine2Color] = useState('#f97316')
  const [categories, setCategories] = useState<ProductCategoryRow[]>([])
  const [travelHomeCategorySlugs, setTravelHomeCategorySlugs] = useState<string[]>(() =>
    normalizeTravelCategoryHomeOrder(null),
  )
  const [homeCatOrderSaving, setHomeCatOrderSaving] = useState(false)
  const [homePageLinks, setHomePageLinks] = useState<HomePageLinkItem[]>(() => [...DEFAULT_HOME_PAGE_LINKS])
  const [mobileAccountPath, setMobileAccountPath] = useState('/account')

  /** site_settings key `ai` — DeepSeek (blog çevirisi vb.); env hâlâ önceliklidir. */
  const [aiRest, setAiRest] = useState<Record<string, unknown>>({})
  const [deepseekApiKey, setDeepseekApiKey] = useState('')
  const [deepseekModel, setDeepseekModel] = useState('deepseek-chat')
  const [deepseekApiUrl, setDeepseekApiUrl] = useState('https://api.deepseek.com/v1/chat/completions')
  const [requestTimeoutSec, setRequestTimeoutSec] = useState('300')
  const [moduleTimeoutsSec, setModuleTimeoutsSec] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {}
    for (const m of AI_PROFILE_MODULES) {
      o[m.profileCode] = '300'
    }
    return o
  })
  const [aiSaving, setAiSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setStatus({ kind: 'idle' })
    try {
      const [pub, cur, catRes] = await Promise.all([
        getSitePublicConfig(),
        listCurrencies(),
        listProductCategories({ active_only: true }).catch(() => ({ categories: [] as ProductCategoryRow[] })),
      ])
      setCategories(catRes.categories)
      setCurrencies(cur.currencies)
      const maps = asRecord(pub.maps)
      setMapsRest(maps)
      setMapsKey(typeof maps.google_maps_api_key === 'string' ? maps.google_maps_api_key : '')
      const c = asRecord(maps.default_center)
      if (typeof c.lat === 'number') setMapsLat(String(c.lat))
      if (typeof c.lng === 'number') setMapsLng(String(c.lng))
      if (typeof maps.default_zoom === 'number') setMapsZoom(String(maps.default_zoom))

      const ui = asRecord(pub.ui)
      setUiRest(ui)
      setHeaderHtml(typeof ui.header_html === 'string' ? ui.header_html : '')
      setFooterHtml(typeof ui.footer_html === 'string' ? ui.footer_html : '')
      setTravelHomeCategorySlugs(normalizeTravelCategoryHomeOrder(ui.travel_category_home_slugs))

      const analytics = pub.analytics ?? {}
      setAnalyticsJson(JSON.stringify(analytics, null, 2))
      // Parse structured Google service fields
      const an = analytics as Record<string, unknown>
      setGa4Id(typeof an.ga4_id === 'string' ? an.ga4_id : '')
      setGtmId(typeof an.gtm_id === 'string' ? an.gtm_id : '')
      setAdsenseId(typeof an.adsense_id === 'string' ? an.adsense_id : '')
      setAdsenseAutoAds(an.adsense_auto_ads === true)
      setGoogleAdsId(typeof an.google_ads_id === 'string' ? an.google_ads_id : '')
      setSearchConsoleCode(typeof an.search_console_verification === 'string' ? an.search_console_verification : '')
      const { ga4_id: _g, gtm_id: _t, adsense_id: _a, adsense_auto_ads: _aa, google_ads_id: _gads, search_console_verification: _sc, ...restAn } = an
      setAnalyticsRest(restAn)
      const branding = pub.branding ?? {}
      setBrandingJson(JSON.stringify(branding, null, 2))
      setHomePageLinks(parseHomePageLinksFromBranding(pub))
      setMobileAccountPath(parseMobileAccountPathFromBranding(pub))
      // Extract structured identity fields from branding
      if (typeof branding.site_name === 'string') setSiteName(branding.site_name)
      if (typeof branding.site_description === 'string') setSiteDescription(branding.site_description)
      if (typeof branding.logo_url === 'string') setLogoUrl(branding.logo_url)
      if (typeof branding.logo_url_dark === 'string') setLogoDarkUrl(branding.logo_url_dark)
      if (typeof branding.favicon_url === 'string') setFaviconUrl(branding.favicon_url)
      if (typeof branding.logo_mode === 'string') setLogoMode(branding.logo_mode as 'image' | 'icon_text')
      if (typeof branding.logo_icon_url === 'string') setLogoIconUrl(branding.logo_icon_url)
      if (typeof branding.logo_text_line1 === 'string') setLogoTextLine1(branding.logo_text_line1)
      if (typeof branding.logo_text_line2 === 'string') setLogoTextLine2(branding.logo_text_line2)
      if (typeof branding.logo_text_line2_color === 'string') setLogoTextLine2Color(branding.logo_text_line2_color)
      const {
        site_name: _sn,
        site_description: _sd,
        logo_url: _lu,
        logo_url_dark: _ld,
        favicon_url: _fu,
        category_logos: _cl,
        home_page_links: _hpl,
        mobile_account_path: _map,
        logo_mode: _lm,
        logo_icon_url: _li,
        logo_text_line1: _lt1,
        logo_text_line2: _lt2,
        logo_text_line2_color: _lt2c,
        ...rest
      } = branding
      setBrandingRest(rest)
      if (branding.category_logos && typeof branding.category_logos === 'object') {
        setCategoryLogos(branding.category_logos as Record<string, { logo_url: string; logo_url_dark: string }>)
      }

      const pay = await getActivePaymentProvider()
      setActivePay(pay.active)

      const token = getStoredAuthToken()
      if (token) {
        try {
          const aiRes = await listSiteSettings(token, { scope: 'platform', key: 'ai' })
          const row = aiRes.settings[0]
          if (row?.value_json) {
            const obj = JSON.parse(row.value_json) as Record<string, unknown>
            setAiRest(obj)
            setDeepseekApiKey(typeof obj.deepseek_api_key === 'string' ? obj.deepseek_api_key : '')
            setDeepseekModel(
              typeof obj.deepseek_model === 'string' && obj.deepseek_model.trim()
                ? obj.deepseek_model.trim()
                : 'deepseek-chat',
            )
            setDeepseekApiUrl(
              typeof obj.deepseek_api_url === 'string' && obj.deepseek_api_url.trim()
                ? obj.deepseek_api_url.trim()
                : 'https://api.deepseek.com/v1/chat/completions',
            )
            setRequestTimeoutSec(
              typeof obj.request_timeout_sec === 'number' && obj.request_timeout_sec > 0
                ? String(clampTimeoutSec(obj.request_timeout_sec))
                : '300',
            )
            setModuleTimeoutsSec((prev) => {
              const next = { ...prev }
              const mod = obj.module_timeouts_sec
              if (mod && typeof mod === 'object' && mod !== null) {
                for (const m of AI_PROFILE_MODULES) {
                  const v = (mod as Record<string, unknown>)[m.profileCode]
                  if (typeof v === 'number' && v > 0) {
                    next[m.profileCode] = String(clampTimeoutSec(v))
                  } else if (typeof v === 'string') {
                    const n = Number.parseFloat(v.trim())
                    if (Number.isFinite(n) && n > 0) next[m.profileCode] = String(clampTimeoutSec(n))
                  }
                }
              }
              return next
            })
          } else {
            setAiRest({})
            setDeepseekApiKey('')
            setDeepseekModel('deepseek-chat')
            setDeepseekApiUrl('https://api.deepseek.com/v1/chat/completions')
            setRequestTimeoutSec('300')
            setModuleTimeoutsSec(() => {
              const o: Record<string, string> = {}
              for (const m of AI_PROFILE_MODULES) o[m.profileCode] = '300'
              return o
            })
          }
        } catch {
          setAiRest({})
        }
      }
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Yükleme başarısız',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function saveMaps() {
    const token = getStoredAuthToken()
    if (!token) {
      setStatus({
        kind: 'err',
        text: 'Site ayarlarını kaydetmek için yönetici oturumu ve `admin.users.read` gerekir.',
      })
      return
    }
    setStatus({ kind: 'idle' })
    try {
      const lat = Number.parseFloat(mapsLat)
      const lng = Number.parseFloat(mapsLng)
      const zoom = Number.parseInt(mapsZoom, 10)
      const next = {
        ...mapsRest,
        google_maps_api_key: mapsKey,
        default_center: { lat, lng },
        default_zoom: Number.isFinite(zoom) ? zoom : 6,
      }
      await upsertSiteSetting(token, { key: 'maps', value_json: JSON.stringify(next) })
      setStatus({ kind: 'ok', text: 'Harita ayarları kaydedildi.' })
      await load()
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Kayıt başarısız',
      })
    }
  }

  async function saveAiSettings() {
    const token = getStoredAuthToken()
    if (!token) {
      setStatus({
        kind: 'err',
        text: 'Site ayarlarını kaydetmek için yönetici oturumu ve `admin.users.read` gerekir.',
      })
      return
    }
    setAiSaving(true)
    setStatus({ kind: 'idle' })
    try {
      const module_timeouts_sec: Record<string, number> = {}
      for (const m of AI_PROFILE_MODULES) {
        const raw = moduleTimeoutsSec[m.profileCode]?.trim() ?? ''
        const n = Number.parseFloat(raw)
        if (Number.isFinite(n) && n > 0) {
          module_timeouts_sec[m.profileCode] = clampTimeoutSec(n)
        }
      }
      const rt = Number.parseInt(requestTimeoutSec, 10)
      const next = {
        ...aiRest,
        deepseek_api_key: deepseekApiKey.trim(),
        deepseek_model: deepseekModel.trim() || 'deepseek-chat',
        deepseek_api_url: deepseekApiUrl.trim() || 'https://api.deepseek.com/v1/chat/completions',
        request_timeout_sec: Number.isFinite(rt) && rt > 0 ? clampTimeoutSec(rt) : 300,
        module_timeouts_sec,
      }
      await upsertSiteSetting(token, { key: 'ai', value_json: JSON.stringify(next) })
      setStatus({ kind: 'ok', text: 'Yapay zeka ayarları kaydedildi.' })
      await load()
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Kayıt başarısız',
      })
    } finally {
      setAiSaving(false)
    }
  }

  async function saveUi() {
    const token = getStoredAuthToken()
    if (!token) {
      setStatus({
        kind: 'err',
        text: 'Site ayarlarını kaydetmek için yönetici oturumu ve `admin.users.read` gerekir.',
      })
      return
    }
    setStatus({ kind: 'idle' })
    try {
      const next = {
        ...uiRest,
        header_html: headerHtml,
        footer_html: footerHtml,
        travel_category_home_slugs: travelHomeCategorySlugs,
      }
      await upsertSiteSetting(token, { key: 'ui', value_json: JSON.stringify(next) })
      setStatus({ kind: 'ok', text: 'Üst / alt bilgi kaydedildi.' })
      await load()
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Kayıt başarısız',
      })
    }
  }

  async function saveTravelHomeCategoryOrder() {
    const token = getStoredAuthToken()
    if (!token) {
      setStatus({
        kind: 'err',
        text: 'Site ayarlarını kaydetmek için yönetici oturumu ve `admin.users.read` gerekir.',
      })
      return
    }
    setHomeCatOrderSaving(true)
    setStatus({ kind: 'idle' })
    try {
      const next = {
        ...uiRest,
        header_html: headerHtml,
        footer_html: footerHtml,
        travel_category_home_slugs: travelHomeCategorySlugs,
      }
      await upsertSiteSetting(token, { key: 'ui', value_json: JSON.stringify(next) })
      setStatus({ kind: 'ok', text: 'Kategori vitrin sırası kaydedildi.' })
      await load()
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Kayıt başarısız',
      })
    } finally {
      setHomeCatOrderSaving(false)
    }
  }

  async function saveGoogleServices() {
    const token = getStoredAuthToken()
    if (!token) { setStatus({ kind: 'err', text: 'Yönetici oturumu gerekli.' }); return }
    setGoogleServicesSaving(true)
    setStatus({ kind: 'idle' })
    try {
      const next = {
        ...analyticsRest,
        ...(ga4Id.trim() ? { ga4_id: ga4Id.trim() } : {}),
        ...(gtmId.trim() ? { gtm_id: gtmId.trim() } : {}),
        ...(adsenseId.trim() ? { adsense_id: adsenseId.trim() } : {}),
        adsense_auto_ads: adsenseAutoAds,
        ...(googleAdsId.trim() ? { google_ads_id: googleAdsId.trim() } : {}),
        ...(searchConsoleCode.trim() ? { search_console_verification: searchConsoleCode.trim() } : {}),
      }
      await upsertSiteSetting(token, { key: 'analytics', value_json: JSON.stringify(next) })
      setStatus({ kind: 'ok', text: 'Google hizmet ayarları kaydedildi. Değişiklikler bir sonraki deploy\'da yansır.' })
      await load()
    } catch (e) {
      setStatus({ kind: 'err', text: e instanceof Error ? e.message : 'Kayıt başarısız' })
    } finally {
      setGoogleServicesSaving(false)
    }
  }

  async function saveAnalytics() {
    const token = getStoredAuthToken()
    if (!token) {
      setStatus({
        kind: 'err',
        text: 'Site ayarlarını kaydetmek için yönetici oturumu ve `admin.users.read` gerekir.',
      })
      return
    }
    setStatus({ kind: 'idle' })
    try {
      JSON.parse(analyticsJson)
      await upsertSiteSetting(token, { key: 'analytics', value_json: analyticsJson })
      setStatus({ kind: 'ok', text: 'Analytics ayarları kaydedildi.' })
      await load()
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Geçersiz JSON veya kayıt hatası',
      })
    }
  }

  async function saveBranding() {
    const token = getStoredAuthToken()
    if (!token) {
      setStatus({
        kind: 'err',
        text: 'Site ayarlarını kaydetmek için yönetici oturumu ve `admin.users.read` gerekir.',
      })
      return
    }
    setStatus({ kind: 'idle' })
    try {
      JSON.parse(brandingJson)
      await upsertSiteSetting(token, { key: 'branding', value_json: brandingJson })
      setStatus({ kind: 'ok', text: 'Marka ayarları kaydedildi.' })
      await load()
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Geçersiz JSON veya kayıt hatası',
      })
    }
  }

  async function saveIdentity() {
    const token = getStoredAuthToken()
    if (!token) { setStatus({ kind: 'err', text: 'Yönetici oturumu gerekli.' }); return }
    setStatus({ kind: 'idle' })
    try {
      const next = {
        ...brandingRest,
        site_name: siteName.trim(),
        site_description: siteDescription.trim(),
        logo_url: logoUrl.trim(),
        logo_url_dark: logoDarkUrl.trim(),
        favicon_url: faviconUrl.trim(),
        logo_mode: logoMode,
        logo_icon_url: logoIconUrl.trim(),
        logo_text_line1: logoTextLine1.trim(),
        logo_text_line2: logoTextLine2.trim(),
        logo_text_line2_color: logoTextLine2Color.trim(),
        category_logos: categoryLogos,
        home_page_links: homePageLinks
          .map((l) => ({
            label: l.label.trim(),
            path: l.path.trim().startsWith('/') ? l.path.trim() : `/${l.path.trim()}`,
          }))
          .filter((l) => l.label && l.path),
        mobile_account_path: mobileAccountPath.trim().startsWith('/')
          ? mobileAccountPath.trim()
          : '/account',
      }
      await upsertSiteSetting(token, { key: 'branding', value_json: JSON.stringify(next) })
      setBrandingJson(JSON.stringify(next, null, 2))
      setStatus({ kind: 'ok', text: 'Site kimliği kaydedildi. Logo ve favicon hemen yansır.' })
    } catch (e) {
      setStatus({ kind: 'err', text: e instanceof Error ? e.message : 'Kayıt başarısız' })
    }
  }

  async function saveCategoryLogos() {
    const token = getStoredAuthToken()
    if (!token) { setStatus({ kind: 'err', text: 'Yönetici oturumu gerekli.' }); return }
    setCategoryLogosSaving(true)
    setStatus({ kind: 'idle' })
    try {
      const next = {
        ...brandingRest,
        site_name: siteName.trim(),
        site_description: siteDescription.trim(),
        logo_url: logoUrl.trim(),
        logo_url_dark: logoDarkUrl.trim(),
        favicon_url: faviconUrl.trim(),
        logo_mode: logoMode,
        logo_icon_url: logoIconUrl.trim(),
        logo_text_line1: logoTextLine1.trim(),
        logo_text_line2: logoTextLine2.trim(),
        logo_text_line2_color: logoTextLine2Color.trim(),
        category_logos: categoryLogos,
        home_page_links: homePageLinks
          .map((l) => ({
            label: l.label.trim(),
            path: l.path.trim().startsWith('/') ? l.path.trim() : `/${l.path.trim()}`,
          }))
          .filter((l) => l.label && l.path),
        mobile_account_path: mobileAccountPath.trim().startsWith('/')
          ? mobileAccountPath.trim()
          : '/account',
      }
      await upsertSiteSetting(token, { key: 'branding', value_json: JSON.stringify(next) })
      setBrandingJson(JSON.stringify(next, null, 2))
      setStatus({ kind: 'ok', text: 'Kategori logoları kaydedildi.' })
    } catch (e) {
      setStatus({ kind: 'err', text: e instanceof Error ? e.message : 'Kayıt başarısız' })
    } finally {
      setCategoryLogosSaving(false)
    }
  }

  function setCatLogo(code: string, field: 'logo_url' | 'logo_url_dark', val: string) {
    setCategoryLogos((prev) => ({
      ...prev,
      [code]: { ...(prev[code] ?? { logo_url: '', logo_url_dark: '' }), [field]: val },
    }))
  }

  async function onSetProvider(code: 'paytr' | 'paratika') {
    const token = getStoredAuthToken()
    if (!token) {
      setStatus({
        kind: 'err',
        text: 'Ödeme sağlayıcısı değiştirmek için yönetici oturumu ve `admin.integrations.write` gerekir.',
      })
      return
    }
    setStatus({ kind: 'idle' })
    try {
      await setActivePaymentProvider(code, token)
      setActivePay(code)
      setStatus({ kind: 'ok', text: `Aktif sanal POS: ${code}` })
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Güncellenemedi',
      })
    }
  }

  async function toggleCurrencyActive(code: string, next: boolean) {
    const token = getStoredAuthToken()
    if (!token) {
      setCurrencyHint('Oturum gerekli.')
      return
    }
    setCurrencyToggleBusy(code)
    setCurrencyHint(null)
    try {
      await patchCurrencyActive(token, code, next)
      const cur = await listCurrencies()
      setCurrencies(cur.currencies)
    } catch (e) {
      setCurrencyHint(e instanceof Error ? e.message : 'Güncellenemedi')
    } finally {
      setCurrencyToggleBusy(null)
    }
  }

  async function saveCurrencyOrder() {
    const token = getStoredAuthToken()
    if (!token) {
      setCurrencyHint('Sırayı kaydetmek için yönetici oturumu gerekir.')
      return
    }
    if (currencies.length === 0) return
    setCurrencyOrderSaving(true)
    setCurrencyHint(null)
    try {
      await putCurrencyOrder(
        token,
        currencies.map((c) => c.code),
      )
      const cur = await listCurrencies()
      setCurrencies(cur.currencies)
      setCurrencyHint('Para birimi sırası kaydedildi. Ön yüz (header) birkaç dakika içinde güncellenir.')
    } catch (e) {
      setCurrencyHint(e instanceof Error ? e.message : 'Sıra kaydedilemedi')
    } finally {
      setCurrencyOrderSaving(false)
    }
  }

  async function onTcmb() {
    const token = getStoredAuthToken()
    if (!token) {
      setTcmbMsg('TCMB yenilemesi için yönetici oturumu ve `admin.users.read` gerekir.')
      return
    }
    setTcmbMsg(null)
    try {
      const r = await refreshTcmbRates(token)
      setTcmbMsg(`TCMB: ${r.inserted} kur yazıldı (${r.fetched_at}).`)
      const cur = await listCurrencies()
      setCurrencies(cur.currencies)
    } catch (e) {
      setTcmbMsg(e instanceof Error ? e.message : 'TCMB yenileme başarısız')
    }
  }

  async function onAddCurrency() {
    const token = getStoredAuthToken()
    if (!token) {
      setCurrencyHint('Para birimi eklemek için yönetici olarak giriş yapın.')
      return
    }
    setCurrencyBusy(true)
    setCurrencyHint(null)
    try {
      const dp = Number.parseInt(newDp, 10)
      await createCurrency(token, {
        code: newCode.trim().toUpperCase().slice(0, 3),
        name: newName.trim(),
        symbol: newSymbol.trim() || undefined,
        decimal_places: Number.isFinite(dp) ? dp : 2,
        is_active: true,
      })
      const cur = await listCurrencies()
      setCurrencies(cur.currencies)
      setNewCode('')
      setNewName('')
      setNewSymbol('')
      setNewDp('2')
      setCurrencyHint('Para birimi kaydedildi.')
    } catch (e) {
      setCurrencyHint(e instanceof Error ? e.message : 'Kayıt başarısız')
    } finally {
      setCurrencyBusy(false)
    }
  }

  async function onNetgsmTest() {
    const token = getStoredAuthToken()
    if (!token) {
      setNetgsmMsg('NetGSM testi için yönetici oturumu gerekir.')
      return
    }
    setNetgsmBusy(true)
    setNetgsmMsg(null)
    try {
      const r = await sendNetgsmTestSms(token, {
        gsm: netgsmTo.trim(),
        message: netgsmText.trim() || 'Test',
      })
      const raw = r.provider_raw
      setNetgsmMsg(
        `Gönderildi (ham yanıt: ${raw.length > 200 ? `${raw.slice(0, 200)}…` : raw})`,
      )
    } catch (e) {
      setNetgsmMsg(e instanceof Error ? e.message : 'SMS başarısız')
    } finally {
      setNetgsmBusy(false)
    }
  }

  if (loading) {
    return (
      <div className={embedded ? 'py-8' : 'container mx-auto max-w-4xl py-16'}>
        <p className="text-neutral-500">Yükleniyor…</p>
      </div>
    )
  }

  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')

  return (
    <div className={embedded ? '' : 'container mx-auto max-w-5xl py-10 pb-24'}>
      {!embedded ? (
        <>
          <h1 className="text-3xl font-semibold tracking-tight">Genel ayarlar</h1>
          <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-400">
            Sekmeler: ödeme/kur, SEO, sosyal marka, yapay zeka bağlantıları, Google Maps, kategori / Merchant. API
            anahtarlarını üretimde koruyun.
          </p>
        </>
      ) : (
        <>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Site ve operasyon</h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
            Aşağıdaki sekmelerden ilgili bloğu seçin. Gelişmiş SEO yönlendirme, AI iş kuyruğu ve Merchant listeleri bu
            sayfanın altındaki bölümlere bağlanır.
          </p>
        </>
      )}

      {status.kind !== 'idle' && status.text && (
        <div
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
            status.kind === 'ok'
              ? 'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100'
              : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100'
          }`}
        >
          {status.text}
        </div>
      )}

      <div className="mt-8">
        <div className="min-w-0 flex-1 space-y-10">

      {activeTab === 'kimlik' && (
        <div className="space-y-8">
          {/* Logo & Favicon */}
          <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <h2 className="text-xl font-semibold">Site Kimliği</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Logo ve favicon için dosya yükleyin; kaydettikten sonra site genelinde kullanılır. İsterseniz harici CDN URL’si
              de girebilirsiniz.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6">
              <Field className="block">
                <Label>Site Adı</Label>
                <Input className="mt-1" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="ör. Tatil & Konaklama" />
              </Field>
              <Field className="block">
                <Label>Site Açıklaması (meta description)</Label>
                <Textarea className="mt-1" rows={3} value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} placeholder="Anasayfa için varsayılan meta açıklama" />
              </Field>
            </div>

            <div className="mt-8 border-t border-neutral-100 pt-8 dark:border-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Önizleme ana sayfa linkleri</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Sağdaki «Customize» panelindeki hızlı gezinme. Yol locale öneki olmadan (ör.{' '}
                <code className="font-mono text-xs">/home-2</code>).
              </p>
              <div className="mt-4 space-y-2">
                {homePageLinks.map((row, i) => (
                  <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      value={row.label}
                      onChange={(e) =>
                        setHomePageLinks((prev) =>
                          prev.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)),
                        )
                      }
                      placeholder="Etiket"
                      className="min-w-0 flex-1"
                    />
                    <Input
                      value={row.path}
                      onChange={(e) =>
                        setHomePageLinks((prev) =>
                          prev.map((r, j) => (j === i ? { ...r, path: e.target.value } : r)),
                        )
                      }
                      placeholder="/yol"
                      className="min-w-0 flex-1 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setHomePageLinks((prev) => prev.filter((_, j) => j !== i))}
                      className="shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                    >
                      Kaldır
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setHomePageLinks((prev) => [...prev, { label: '', path: '/' }])}
                className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                + Satır ekle
              </button>
              <Field className="mt-6 block">
                <Label>Mobil alt bar — Hesap yolu</Label>
                <Input
                  className="mt-1 font-mono"
                  value={mobileAccountPath}
                  onChange={(e) => setMobileAccountPath(e.target.value)}
                  placeholder="/account"
                />
                <p className="mt-1 text-xs text-neutral-400">Mobil alt bardaki «Hesap» kısayolunun hedefi.</p>
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <h2 className="text-xl font-semibold">Logo</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Tam logo resmi yükleyin ya da ikon + yazı modunu seçin.
            </p>

            {/* Mode toggle */}
            <div className="mt-5 flex gap-3">
              {(['image', 'icon_text'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setLogoMode(m)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                    logoMode === m
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-400'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400'
                  }`}
                >
                  {m === 'image' ? '🖼️ Tam logo resmi' : '🔤 İkon + Yazı modu'}
                </button>
              ))}
            </div>

            {logoMode === 'image' ? (
              /* Full image mode */
              <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2">
                <BrandingImageUploadRow
                  label="Logo (açık tema)"
                  hint="PNG, JPEG, WebP, AVIF veya SVG. En fazla 2 MB."
                  url={logoUrl}
                  onChange={setLogoUrl}
                  purpose="logo-light"
                  accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml,.svg"
                  preview="logo-light"
                />
                <BrandingImageUploadRow
                  label="Logo (koyu tema, isteğe bağlı)"
                  hint="Koyu arka planda okunaklı bir varyant."
                  url={logoDarkUrl}
                  onChange={setLogoDarkUrl}
                  purpose="logo-dark"
                  accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml,.svg"
                  preview="logo-dark"
                />
              </div>
            ) : (
              /* Icon + text mode */
              <div className="mt-6 space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">İkon resmi</p>
                    <p className="mb-2 text-xs text-neutral-400">Sadece simge kısmı (kare veya yuvarlak). PNG/SVG şeffaf arka plan önerilir.</p>
                    <ImageUpload
                      value={logoIconUrl}
                      onChange={setLogoIconUrl}
                      folder="branding"
                      prefix="logo-icon"
                      aspectRatio="1/1"
                      placeholder="İkon yükle"
                    />
                  </div>

                  {/* Live preview */}
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">Önizleme</p>
                    <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                      {logoIconUrl ? (
                        <img src={logoIconUrl} alt="" className="h-12 w-12 shrink-0 object-contain" />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-2xl dark:bg-neutral-800">🔤</div>
                      )}
                      <span className="flex flex-col leading-none">
                        {(logoTextLine1 || siteName) && (
                          <span className="text-[17px] font-bold tracking-tight text-neutral-900 dark:text-white">
                            {logoTextLine1 || siteName}
                          </span>
                        )}
                        {logoTextLine2 && (
                          <span className="text-[13px] font-semibold tracking-wide" style={{ color: logoTextLine2Color || '#f97316' }}>
                            {logoTextLine2}
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-400">Sitedeki header&apos;da bu şekilde görünecek.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field className="block">
                    <Label>1. Satır (Ana Metin)</Label>
                    <Input
                      className="mt-1"
                      value={logoTextLine1}
                      onChange={(e) => setLogoTextLine1(e.target.value)}
                      placeholder={siteName || 'Rezervasyon'}
                    />
                    <p className="mt-1 text-xs text-neutral-400">Boş bırakılırsa Site Adı kullanılır.</p>
                  </Field>
                  <Field className="block">
                    <Label>2. Satır (Alt Metin)</Label>
                    <Input
                      className="mt-1"
                      value={logoTextLine2}
                      onChange={(e) => setLogoTextLine2(e.target.value)}
                      placeholder="yap.com.tr"
                    />
                  </Field>
                  <Field className="block">
                    <Label>2. Satır Rengi</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={logoTextLine2Color || '#f97316'}
                        onChange={(e) => setLogoTextLine2Color(e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700"
                      />
                      <Input
                        value={logoTextLine2Color}
                        onChange={(e) => setLogoTextLine2Color(e.target.value)}
                        placeholder="#f97316"
                        className="font-mono"
                      />
                    </div>
                  </Field>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <h2 className="text-xl font-semibold">Favicon</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Tarayıcı sekmesinde görünen simge. PNG, ICO veya küçük SVG. Kayıt sonrası URL{' '}
              <code className="font-mono text-xs">branding.favicon_url</code> olarak saklanır; kök{' '}
              <code className="font-mono text-xs">public/favicon.ico</code> dosyasını ayrıca değiştirmek isterseniz sunucuya
              yükleyebilirsiniz.
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <BrandingImageUploadRow
                  label="Favicon"
                  hint="PNG, ICO, WebP veya SVG. En fazla 2 MB."
                  url={faviconUrl}
                  onChange={setFaviconUrl}
                  purpose="favicon"
                  accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml,.ico,image/x-icon"
                  preview="favicon"
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-neutral-400">
              Medya kütüphanesinden URL kullanmak için{' '}
              <Link href={vitrinPath('/manage/media')} className="text-primary-600 underline">
                Medya Kütüphanesi
              </Link>{' '}
              veya yukarıdaki «Harici URL» alanını kullanın.
            </p>
          </section>

          <div>
            <ButtonPrimary type="button" onClick={() => void saveIdentity()}>
              Site kimliğini kaydet
            </ButtonPrimary>
            <p className="mt-2 text-xs text-neutral-400">
              Kaydedilen logo ve favicon site genelinde (header vb.) kullanılır.
            </p>
          </div>

          {/* ── Kategori Logoları ─────────────────────────────── */}
          <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <h2 className="text-xl font-semibold">Kategori Logoları</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Her kategori sayfasında header logosunu özelleştirin. Boş bırakılan kategorilerde genel logo görünür.
            </p>

            <div className="mt-6 divide-y divide-neutral-100 dark:divide-neutral-800">
              {ORDERED_PRODUCT_CATEGORY_CODES.map((code) => {
                const label = categoryLabelTr(code)
                const catLogo = categoryLogos[code] ?? { logo_url: '', logo_url_dark: '' }
                const hasLogo = !!(catLogo.logo_url || catLogo.logo_url_dark)
                return (
                  <div key={code} className="py-5">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</span>
                      {hasLogo && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          ✓ Özel logo
                        </span>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mb-1.5 text-xs text-neutral-500">Açık tema</p>
                        <ImageUpload
                          value={catLogo.logo_url ?? ''}
                          onChange={(url) => setCatLogo(code, 'logo_url', url)}
                          folder="branding"
                          prefix={`cat-logo-${code}`}
                          aspectRatio="3/1"
                          placeholder="Logo yükle (açık tema)"
                        />
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs text-neutral-500">Koyu tema <span className="text-neutral-400">(opsiyonel)</span></p>
                        <ImageUpload
                          value={catLogo.logo_url_dark ?? ''}
                          onChange={(url) => setCatLogo(code, 'logo_url_dark', url)}
                          folder="branding"
                          prefix={`cat-logo-dark-${code}`}
                          aspectRatio="3/1"
                          placeholder="Logo yükle (koyu tema)"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4">
              <ButtonPrimary type="button" onClick={() => void saveCategoryLogos()} disabled={categoryLogosSaving}>
                {categoryLogosSaving ? 'Kaydediliyor…' : 'Kategori logolarını kaydet'}
              </ButtonPrimary>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'operasyon' && (
        <>
      <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
        <h2 className="text-xl font-semibold">Aktif sanal POS</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Şu an: {activePay ?? '—'}. Değiştirmek için{' '}
          <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">admin.integrations.write</code>.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <ButtonPrimary type="button" onClick={() => void onSetProvider('paytr')}>
            PayTR seç
          </ButtonPrimary>
          <ButtonPrimary type="button" onClick={() => void onSetProvider('paratika')}>
            Paratika seç
          </ButtonPrimary>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
        <h2 className="text-xl font-semibold">Kur (TCMB)</h2>
        <p className="mt-1 text-sm text-neutral-500">Manuel tetik — zamanlanmış job ayrıca tanımlanmalıdır.</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <ButtonPrimary type="button" onClick={() => void onTcmb()}>
            TCMB kurlarını yenile
          </ButtonPrimary>
          {tcmbMsg && <span className="text-sm text-neutral-600 dark:text-neutral-400">{tcmbMsg}</span>}
        </div>
      </section>

      <section className="mt-10 border-t border-neutral-200 pt-10 dark:border-neutral-700">
        <h2 className="text-xl font-semibold">Para birimleri</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Yeni kod ekleyin; TCMB yenilemesi yalnızca <span className="font-mono">is_active</span> kayıtlı kodlar için kur
          yazar. Kod 3 harf (ör. GBP). Para birimleri yalnızca bu sekmede yönetilir.
        </p>
        {currencyHint ? (
          <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{currencyHint}</p>
        ) : null}
        <div className="mt-4">
          <CurrencyReorderTable
            currencies={currencies}
            onReorder={setCurrencies}
            onToggleActive={(code, next) => void toggleCurrencyActive(code, next)}
            toggleBusyCode={currencyToggleBusy}
            onSaveOrder={saveCurrencyOrder}
            orderSaving={currencyOrderSaving}
          />
        </div>
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium text-neutral-500">Hızlı doldur (henüz eklenmemiş kodlar)</p>
          <div className="flex flex-wrap gap-2">
            {COMMON_CURRENCY_PRESETS.filter((c) => !currencies.some((row) => row.code === c.code)).map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setNewCode(c.code)
                  setNewName(c.name)
                  setNewSymbol(c.symbol)
                  setNewDp('2')
                }}
                className="rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-primary-400 hover:text-primary-700 dark:border-neutral-600 dark:text-neutral-300"
              >
                {c.symbol} {c.code}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <Label>Kod (3)</Label>
            <Input className="mt-1 font-mono" value={newCode} onChange={(e) => setNewCode(e.target.value)} maxLength={3} />
          </Field>
          <Field>
            <Label>Ad</Label>
            <Input className="mt-1" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </Field>
          <Field>
            <Label>Sembol</Label>
            <Input className="mt-1" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} />
          </Field>
          <Field>
            <Label>Ondalık basamak</Label>
            <Input className="mt-1" type="number" min={0} max={8} value={newDp} onChange={(e) => setNewDp(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <ButtonPrimary type="button" disabled={currencyBusy} onClick={() => void onAddCurrency()}>
            {currencyBusy ? 'Kaydediliyor…' : 'Para birimini kaydet'}
          </ButtonPrimary>
        </div>
      </section>

      <section className="mt-10 border-t border-neutral-200 pt-10 dark:border-neutral-700">
        <h2 className="text-xl font-semibold">NetGSM (test SMS)</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Ortam değişkenleri: <span className="font-mono">NETGSM_USERCODE</span>,{' '}
          <span className="font-mono">NETGSM_PASSWORD</span>, <span className="font-mono">NETGSM_MSGHEADER</span>. Yönetici
          oturumu ve <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">admin.integrations.write</code>.
        </p>
        {netgsmMsg ? (
          <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{netgsmMsg}</p>
        ) : null}
        <div className="mt-4 grid max-w-xl gap-4">
          <Field>
            <Label>Alıcı GSM (90532…)</Label>
            <Input className="mt-1 font-mono" value={netgsmTo} onChange={(e) => setNetgsmTo(e.target.value)} />
          </Field>
          <Field>
            <Label>Mesaj</Label>
            <Textarea className="mt-1" rows={3} value={netgsmText} onChange={(e) => setNetgsmText(e.target.value)} />
          </Field>
          <ButtonPrimary type="button" disabled={netgsmBusy} onClick={() => void onNetgsmTest()}>
            {netgsmBusy ? 'Gönderiliyor…' : 'Test SMS gönder'}
          </ButtonPrimary>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
        <h2 className="text-xl font-semibold">Diller &amp; çeviriler</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Dil ekleme ve çeviri içe/dışa aktarma için{' '}
          <Link
            href={vitrinPath('/manage/i18n')}
            className="font-medium text-primary-600 underline dark:text-primary-400"
          >
            Diller &amp; çeviriler
          </Link>{' '}
          sayfasına gidin. Next.js locale routing (G1.2) ayrı iş paketi.
        </p>
      </section>
        </>
      )}

      {activeTab === 'seo' && (
        <div className="space-y-8">
          <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <h2 className="text-xl font-semibold">Üst / alt bilgi (site yapısı)</h2>
            <p className="mt-1 text-sm text-neutral-500">
              <code className="font-mono text-xs">ui</code> anahtarı — doğrulama snippet’leri, şema veya embed için HTML
              (dikkatli kullanın).
            </p>
            <Field className="mt-4 block">
              <Label>Header (HTML / snippet)</Label>
              <Textarea
                className="mt-1 font-mono text-sm"
                rows={5}
                value={headerHtml}
                onChange={(e) => setHeaderHtml(e.target.value)}
              />
            </Field>
            <Field className="mt-4 block">
              <Label>Footer (HTML / snippet)</Label>
              <Textarea
                className="mt-1 font-mono text-sm"
                rows={8}
                value={footerHtml}
                onChange={(e) => setFooterHtml(e.target.value)}
              />
            </Field>
            <div className="mt-4">
              <ButtonPrimary type="button" onClick={() => void saveUi()}>
                Üst / alt bilgiyi kaydet
              </ButtonPrimary>
            </div>
          </section>
          <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <h2 className="text-xl font-semibold">Analytics (izleme / piksel)</h2>
            <p className="mt-1 text-sm text-neutral-500">
              <code className="font-mono text-xs">analytics</code> JSON — GA4, GTM, Meta vb. anahtarları burada tutulabilir.
            </p>
            <Field className="mt-4 block">
              <Label>analytics (JSON)</Label>
              <Textarea
                className="mt-1 font-mono text-sm"
                rows={10}
                value={analyticsJson}
                onChange={(e) => setAnalyticsJson(e.target.value)}
              />
            </Field>
            <div className="mt-4">
              <ButtonPrimary type="button" onClick={() => void saveAnalytics()}>
                Analytics kaydet
              </ButtonPrimary>
            </div>
          </section>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            <a href={vitrinPath('/manage/admin/manage') + '#admin-seo-block'} className="font-medium text-primary-600 underline dark:text-primary-400">
              SEO — sitemap, yönlendirme ve 404 günlüğü
            </a>{' '}
            (Admin Yönetimi sayfasındaki SEO bloğuna gider.)
          </p>
        </div>
      )}

      {activeTab === 'sosyal' && (
        <div className="space-y-8">
          <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <h2 className="text-xl font-semibold">Marka &amp; sosyal (JSON)</h2>
            <p className="mt-1 text-sm text-neutral-500">
              <code className="font-mono text-xs">branding</code> —{' '}
              <code className="text-xs">site_name</code>, <code className="text-xs">site_description</code>,{' '}
              <code className="text-xs">logo_url</code>, <code className="text-xs">favicon_url</code> sayfa başlığı, meta
              açıklama, Open Graph ve JSON-LD için kullanılır. İsteğe bağlı{' '}
              <code className="text-xs">seo_keywords</code>: <code className="text-xs">[&quot;otel&quot;,&quot;tur&quot;]</code>{' '}
              veya virgüllü metin. Sosyal / iletişim alanları için key-value ekleyebilirsiniz.
            </p>
            <Field className="mt-4 block">
              <Label>branding (JSON)</Label>
              <Textarea
                className="mt-1 font-mono text-sm"
                rows={14}
                value={brandingJson}
                onChange={(e) => setBrandingJson(e.target.value)}
              />
            </Field>
            <div className="mt-4">
              <ButtonPrimary type="button" onClick={() => void saveBranding()}>
                Marka kaydet
              </ButtonPrimary>
            </div>
          </section>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            <a href="#admin-social-block" className="font-medium text-primary-600 underline dark:text-primary-400">
              Sosyal paylaşım şablonları ve kuyruk
            </a>{' '}
            — Instagram / Facebook vb. gönderi kuyruğu.
          </p>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <div className="flex items-start gap-3 mb-5">
              <span className="text-2xl">🤖</span>
              <div>
                <h2 className="text-base font-semibold">DeepSeek (API)</h2>
                <p className="text-sm text-neutral-500">
                  Blog çevirisi ve paneldeki yapay zeka çağrıları için. Ortam değişkeni{' '}
                  <code className="font-mono text-xs">DEEPSEEK_API_KEY</code> tanımlıysa o önceliklidir; boşsa
                  buradaki anahtar kullanılır. Aşağıdaki &quot;chat&quot; ifadeleri API adıdır: aynı uç nokta ve
                  model çeviri, özet vb. metin görevleri için de kullanılır; yalnızca sohbet anlamına gelmez.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field className="block sm:col-span-2">
                <Label>DeepSeek API anahtarı</Label>
                <Input
                  type="password"
                  className="mt-1 font-mono"
                  value={deepseekApiKey}
                  onChange={(e) => setDeepseekApiKey(e.target.value)}
                  autoComplete="off"
                  placeholder="sk-…"
                />
                <p className="mt-1 text-xs text-neutral-400">
                  <a
                    href="https://platform.deepseek.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 underline">DeepSeek Platform</a>
                  &apos;dan alın. Üretimde anahtarı güvenli tutun.
                </p>
              </Field>
              <Field className="block">
                <Label>Model</Label>
                <Input
                  className="mt-1 font-mono"
                  value={deepseekModel}
                  onChange={(e) => setDeepseekModel(e.target.value)}
                  placeholder="deepseek-chat"
                />
                <p className="mt-1 text-xs text-neutral-400">
                  <code className="font-mono">deepseek-chat</code> genel metin modelidir (çeviri dahil). Çok adımlı
                  akıl yürütme için isteğe bağlı{' '}
                  <code className="font-mono">deepseek-reasoner</code> kullanılabilir; daha yavaş ve maliyetlidir.
                </p>
              </Field>
              <Field className="block">
                <Label>API URL</Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  value={deepseekApiUrl}
                  onChange={(e) => setDeepseekApiUrl(e.target.value)}
                  placeholder="https://api.deepseek.com/v1/chat/completions"
                />
                <p className="mt-1 text-xs text-neutral-400">
                  OpenAI uyumlu Chat Completions uç noktasıdır; çeviri gibi görevler de bu URL ile yapılır.
                </p>
              </Field>
              <Field className="block sm:col-span-2">
                <Label>Varsayılan upstream süresi (saniye)</Label>
                <Input
                  type="number"
                  min={5}
                  max={3600}
                  className="mt-1 max-w-[12rem] font-mono"
                  value={requestTimeoutSec}
                  onChange={(e) => setRequestTimeoutSec(e.target.value)}
                />
                <p className="mt-1 text-xs text-neutral-400">
                  Modül bazlı süre tanımlı değilse bu değer kullanılır (varsayılan 300 = 5 dk). Üretimde{' '}
                  <code className="font-mono text-[11px]">AI_UPSTREAM_TIMEOUT_SEC</code> tanımlıysa tümünü geçersiz
                  kılar.
                </p>
              </Field>
            </div>
            <div className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-700">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Modül bazlı süre (saniye)</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Eğitim / içerik panellerindeki profillere göre DeepSeek isteği zaman aşımı. Boş bırakılanlar
                varsayılanı kullanır.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {AI_PROFILE_MODULES.map((m) => (
                  <Field key={m.profileCode}>
                    <Label className="text-xs">{m.label}</Label>
                    <Input
                      type="number"
                      min={5}
                      max={3600}
                      className="mt-1 font-mono text-sm"
                      value={moduleTimeoutsSec[m.profileCode] ?? '300'}
                      onChange={(e) =>
                        setModuleTimeoutsSec((prev) => ({
                          ...prev,
                          [m.profileCode]: e.target.value,
                        }))
                      }
                    />
                    <p className="mt-0.5 font-mono text-[10px] text-neutral-400">{m.profileCode}</p>
                  </Field>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <ButtonPrimary type="button" disabled={aiSaving} onClick={() => void saveAiSettings()}>
                {aiSaving ? 'Kaydediliyor…' : 'Kaydet'}
              </ButtonPrimary>
            </div>
          </section>
          <div className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <h2 className="text-xl font-semibold">Yapay zeka</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Sağlayıcılar, profiller ve iş kuyruğu bu sayfanın altında ayrı blokta yönetilir (okuma ağırlıklı).
            </p>
            <p className="mt-4 text-sm">
              <a href="#admin-ai-block" className="font-medium text-primary-600 underline dark:text-primary-400">
                AI bölümüne git
              </a>
            </p>
          </div>
        </div>
      )}

      {activeTab === 'google' && (
        <div className="space-y-6">

          {/* ── Google Maps ───────────────────────────────────────────── */}
          <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <div className="flex items-start gap-3 mb-5">
              <span className="text-2xl">🗺️</span>
              <div>
                <h2 className="text-base font-semibold">Google Maps</h2>
                <p className="text-sm text-neutral-500">Harita bileşeni, pin seçici ve bölge yakın mekan arama.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field className="block sm:col-span-2">
                <Label>API Anahtarı <span className="text-xs font-normal text-neutral-400">(istemci veya kısıtlı anahtar)</span></Label>
                <Input type="password" className="mt-1 font-mono" value={mapsKey} onChange={(e) => setMapsKey(e.target.value)} autoComplete="off" placeholder="AIzaSy…" />
                <p className="mt-1 text-xs text-neutral-400">
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">Google Cloud Console</a>&apos;dan alın. Maps JavaScript API + Places API etkin olmalı.
                </p>
              </Field>
              <Field className="block">
                <Label>Varsayılan enlem</Label>
                <Input className="mt-1" value={mapsLat} onChange={(e) => setMapsLat(e.target.value)} placeholder="36.62253" />
              </Field>
              <Field className="block">
                <Label>Varsayılan boylam</Label>
                <Input className="mt-1" value={mapsLng} onChange={(e) => setMapsLng(e.target.value)} placeholder="29.11481" />
              </Field>
              <Field className="block">
                <Label>Varsayılan zoom</Label>
                <Input className="mt-1" type="number" min="1" max="20" value={mapsZoom} onChange={(e) => setMapsZoom(e.target.value)} placeholder="13" />
              </Field>
            </div>
            <div className="mt-4">
              <ButtonPrimary type="button" onClick={() => void saveMaps()}>Haritayı kaydet</ButtonPrimary>
            </div>
          </section>

          {/* ── Google Analytics 4 ────────────────────────────────────── */}
          <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <div className="flex items-start gap-3 mb-5">
              <span className="text-2xl">📊</span>
              <div>
                <h2 className="text-base font-semibold">Google Analytics 4</h2>
                <p className="text-sm text-neutral-500">Ziyaretçi ve dönüşüm verileri. Ölçüm ID&apos;si <code className="font-mono text-xs">G-XXXXXXXXXX</code> formatındadır.</p>
              </div>
            </div>
            <Field className="block max-w-md">
              <Label>Ölçüm ID (Measurement ID)</Label>
              <Input className="mt-1 font-mono" value={ga4Id} onChange={(e) => setGa4Id(e.target.value)} placeholder="G-XXXXXXXXXX" />
              <p className="mt-1 text-xs text-neutral-400">
                <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">Google Analytics</a> → Yönetici → Veri akışları → Ölçüm ID
              </p>
            </Field>
          </section>

          {/* ── Google Tag Manager ────────────────────────────────────── */}
          <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <div className="flex items-start gap-3 mb-5">
              <span className="text-2xl">🏷️</span>
              <div>
                <h2 className="text-base font-semibold">Google Tag Manager</h2>
                <p className="text-sm text-neutral-500">GTM ile tüm etiketleri tek yerden yönetin. Kapsayıcı ID <code className="font-mono text-xs">GTM-XXXXXXX</code> formatındadır.</p>
              </div>
            </div>
            <Field className="block max-w-md">
              <Label>Kapsayıcı ID (Container ID)</Label>
              <Input className="mt-1 font-mono" value={gtmId} onChange={(e) => setGtmId(e.target.value)} placeholder="GTM-XXXXXXX" />
              <p className="mt-1 text-xs text-neutral-400">
                <a href="https://tagmanager.google.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">Google Tag Manager</a> → Kapsayıcı → Genel Bakış → Kapsayıcı Kimliği
              </p>
            </Field>
          </section>

          {/* ── Google AdSense ────────────────────────────────────────── */}
          <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <div className="flex items-start gap-3 mb-5">
              <span className="text-2xl">💰</span>
              <div>
                <h2 className="text-base font-semibold">Google AdSense</h2>
                <p className="text-sm text-neutral-500">Sitede reklam göstermek için yayıncı ID&apos;si. <code className="font-mono text-xs">ca-pub-XXXXXXXXXXXXXXXX</code> formatındadır.</p>
              </div>
            </div>
            <div className="space-y-4 max-w-md">
              <Field className="block">
                <Label>Yayıncı ID (Publisher ID)</Label>
                <Input className="mt-1 font-mono" value={adsenseId} onChange={(e) => setAdsenseId(e.target.value)} placeholder="ca-pub-XXXXXXXXXXXXXXXX" />
                <p className="mt-1 text-xs text-neutral-400">
                  <a href="https://adsense.google.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">Google AdSense</a> → Hesabım → Yayıncı ID
                </p>
              </Field>
              <label className="flex cursor-pointer items-center gap-3">
                <div className={`relative h-5 w-9 rounded-full transition-colors ${adsenseAutoAds ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
                  <input type="checkbox" className="sr-only" checked={adsenseAutoAds} onChange={(e) => setAdsenseAutoAds(e.target.checked)} />
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${adsenseAutoAds ? 'left-4' : 'left-0.5'}`} />
                </div>
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Otomatik Reklamları Etkinleştir</span>
              </label>
            </div>
          </section>

          {/* ── Google Ads ────────────────────────────────────────────── */}
          <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <div className="flex items-start gap-3 mb-5">
              <span className="text-2xl">📢</span>
              <div>
                <h2 className="text-base font-semibold">Google Ads</h2>
                <p className="text-sm text-neutral-500">Dönüşüm izleme için Ads kapsayıcı ID&apos;si. <code className="font-mono text-xs">AW-XXXXXXXXXX</code> formatındadır.</p>
              </div>
            </div>
            <Field className="block max-w-md">
              <Label>Dönüşüm ID (Conversion ID)</Label>
              <Input className="mt-1 font-mono" value={googleAdsId} onChange={(e) => setGoogleAdsId(e.target.value)} placeholder="AW-XXXXXXXXXX" />
              <p className="mt-1 text-xs text-neutral-400">
                <a href="https://ads.google.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">Google Ads</a> → Araçlar → Dönüşümler → Etiket kurulumu
              </p>
            </Field>
          </section>

          {/* ── Google Search Console ────────────────────────────────── */}
          <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <div className="flex items-start gap-3 mb-5">
              <span className="text-2xl">🔍</span>
              <div>
                <h2 className="text-base font-semibold">Google Search Console</h2>
                <p className="text-sm text-neutral-500">Site doğrulama meta etiketi. Kodu head&apos;e eklenecektir.</p>
              </div>
            </div>
            <Field className="block max-w-lg">
              <Label>Doğrulama kodu <span className="text-xs font-normal text-neutral-400">(sadece content değeri)</span></Label>
              <Input className="mt-1 font-mono" value={searchConsoleCode} onChange={(e) => setSearchConsoleCode(e.target.value)} placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" />
              <p className="mt-1 text-xs text-neutral-400">
                <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">Search Console</a> → Mülk ekle → HTML etiketi yöntemi → <code className="font-mono">content=&quot;…&quot;</code> değerini buraya yapıştırın.
              </p>
              {searchConsoleCode && (
                <code className="mt-2 block rounded bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                  {`<meta name="google-site-verification" content="${searchConsoleCode}" />`}
                </code>
              )}
            </Field>
          </section>

          {/* ── Save Button ───────────────────────────────────────────── */}
          <div className="flex justify-end">
            <ButtonPrimary type="button" onClick={() => void saveGoogleServices()} disabled={googleServicesSaving}>
              {googleServicesSaving ? 'Kaydediliyor…' : '💾 Tüm Google ayarlarını kaydet'}
            </ButtonPrimary>
          </div>
        </div>
      )}

      {activeTab === 'merchant' && (
        <div className="space-y-8">
          <TravelHomeCategoryOrderPanel
            slugs={travelHomeCategorySlugs}
            onSlugsChange={setTravelHomeCategorySlugs}
            onSave={saveTravelHomeCategoryOrder}
            saving={homeCatOrderSaving}
          />
          <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
            <h2 className="text-xl font-semibold">Kategori vitrin bağlantıları</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Ön yüzde kategori sayfası yolu: <code className="font-mono text-xs">/stay-categories/&#123;kod&#125;</code>.
              Tam URL için <code className="font-mono text-xs">NEXT_PUBLIC_SITE_URL</code> kullanılır (
              {siteBase || 'tanımlı değil — .env.local'}).
            </p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="px-3 py-2">Kod</th>
                    <th className="px-3 py-2">Ad (DB)</th>
                    <th className="px-3 py-2">Ön yüz yolu</th>
                    <th className="px-3 py-2">Tam URL (özet)</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-neutral-500">
                        Kategori listesi yüklenemedi veya boş.
                      </td>
                    </tr>
                  ) : (
                    categories.map((c) => {
                      const path = vitrinPath(`/stay-categories/${encodeURIComponent(c.code)}`)
                      const full = siteBase ? `${siteBase}${path.startsWith('/') ? path : `/${path}`}` : '—'
                      return (
                        <tr key={c.id} className="border-t border-neutral-100 dark:border-neutral-800">
                          <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
                          <td className="px-3 py-2">{c.name_key}</td>
                          <td className="px-3 py-2">
                            <Link
                              href={path}
                              className="text-primary-600 underline dark:text-primary-400"
                              target="_blank"
                              rel="noreferrer"
                            >
                              {path}
                            </Link>
                          </td>
                          <td className="max-w-xs truncate px-3 py-2 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                            {full}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Google Merchant Center ürün kayıtları ilan bazındadır.{' '}
            <a href="#admin-merchant-block" className="font-medium text-primary-600 underline dark:text-primary-400">
              Ticari entegrasyonlar (Google Merchant &amp; Instagram)
            </a>{' '}
            bölümüne gidin.
          </p>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}
