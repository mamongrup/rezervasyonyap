'use client'
import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import {
  createLocationPage,
  deleteLocationPage,
  getLocationPageBySlug,
  listLocationCountries,
  listLocationDistricts,
  listLocationPages,
  listLocationRegions,
  patchLocationPage,
  type LocationCountry,
  type LocationDistrict,
  type LocationPage,
  type LocationRegion,
  type LocationTranslations,
} from '@/lib/travel-api'
import { defaultLocale, isAppLocale } from '@/lib/i18n-config'
import { asTrimmedString } from '@/lib/travel-ideas-parse'
import { regionPublicHref } from '@/lib/region-public-path'
import clsx from 'clsx'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'

const REGION_LIST_PAGE_SIZE = 200

/** Liste: çekirdek `title` boş olsa bile çevirideki ad veya meta ile gösterim başlığı */
function locationPageListTitle(page: LocationPage): string {
  const direct = asTrimmedString(page.title)
  if (direct) return direct
  try {
    const tr = JSON.parse(page.translations_json || '{}') as LocationTranslations
    const trName = asTrimmedString(tr.tr?.name)
    if (trName) return trName
    for (const k of Object.keys(tr)) {
      const n = asTrimmedString(tr[k]?.name)
      if (n) return n
    }
  } catch {
    /* ignore */
  }
  const meta = asTrimmedString(page.meta_title)
  if (meta) return meta
  const tail = page.slug_path.split('/').filter(Boolean).pop() ?? page.slug_path
  const words = tail.replace(/[-_]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return page.slug_path
  return words.map((w) => w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1).toLocaleLowerCase('tr-TR')).join(' ')
}

function slugPathSegments(slugPath: string): string[] {
  return slugPath.split('/').map((s) => s.trim()).filter(Boolean)
}

/** İl sayfası yokken başlık: TR/adana → Adana */
function fallbackProvinceLabel(provinceKey: string): string {
  const tail = provinceKey.split('/').filter(Boolean).pop() ?? provinceKey
  const words = tail.replace(/[-_]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return provinceKey
  return words.map((w) => w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1).toLocaleLowerCase('tr-TR')).join(' ')
}

type ProvinceGroup = {
  key: string
  provincePage: LocationPage | null
  districts: LocationPage[]
}

/** Ülke (tek segment), iller ve ilçeler — arama sonrası filtrelenmiş listeye göre gruplar */
function groupLocationPagesByProvince(pages: LocationPage[]): {
  countries: LocationPage[]
  groups: ProvinceGroup[]
} {
  const countries: LocationPage[] = []
  const map = new Map<string, { province: LocationPage | null; districts: LocationPage[] }>()

  for (const page of pages) {
    const parts = slugPathSegments(page.slug_path)
    if (parts.length <= 1) {
      countries.push(page)
      continue
    }
    if (parts.length === 2) {
      const key = `${parts[0]}/${parts[1]}`
      let g = map.get(key)
      if (!g) {
        g = { province: null, districts: [] }
        map.set(key, g)
      }
      g.province = page
      continue
    }
    const key = `${parts[0]}/${parts[1]}`
    let g = map.get(key)
    if (!g) {
      g = { province: null, districts: [] }
      map.set(key, g)
    }
    g.districts.push(page)
  }

  const groups: ProvinceGroup[] = Array.from(map.entries()).map(([key, v]) => ({
    key,
    provincePage: v.province,
    districts: [...v.districts].sort((a, b) =>
      locationPageListTitle(a).localeCompare(locationPageListTitle(b), 'tr'),
    ),
  }))

  groups.sort((a, b) => {
    const na = a.provincePage ? locationPageListTitle(a.provincePage) : fallbackProvinceLabel(a.key)
    const nb = b.provincePage ? locationPageListTitle(b.provincePage) : fallbackProvinceLabel(b.key)
    return na.localeCompare(nb, 'tr')
  })

  return { countries, groups }
}

// ─── Add/Edit form modal ──────────────────────────────────────────────────────
function PageFormModal({
  initial,
  countries,
  onClose,
  onSave,
  busy,
}: {
  initial?: LocationPage
  countries: LocationCountry[]
  onClose: () => void
  onSave: (data: { slug_path: string; district_id: string }) => void
  busy: boolean
}) {
  const [slugPath, setSlugPath] = useState(initial?.slug_path ?? '')
  const [districtId, setDistrictId] = useState(initial?.district_id ?? '')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [regions, setRegions] = useState<LocationRegion[]>([])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [districts, setDistricts] = useState<LocationDistrict[]>([])
  const [loadingRegions, setLoadingRegions] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)

  const loadRegions = useCallback(async (cid: string) => {
    setLoadingRegions(true)
    setRegions([])
    setDistricts([])
    setSelectedRegion('')
    setDistrictId('')
    try {
      const res = await listLocationRegions(cid)
      setRegions(res.regions)
    } finally {
      setLoadingRegions(false)
    }
  }, [])

  const loadDistricts = useCallback(async (rid: string) => {
    setLoadingDistricts(true)
    setDistricts([])
    setDistrictId('')
    try {
      const res = await listLocationDistricts(rid)
      setDistricts(res.districts)
    } finally {
      setLoadingDistricts(false)
    }
  }, [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSave({ slug_path: slugPath, district_id: districtId })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {initial ? 'Bölge Sayfasını Düzenle' : 'Yeni Bölge Sayfası'}
          </h2>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Slug Path */}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Slug yolu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={slugPath}
              onChange={(e) => setSlugPath(e.target.value)}
              placeholder="turkiye/mugla/bodrum"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
            />
            <p className="mt-1 text-xs text-neutral-400">
              Örnek: <code>turkiye/mugla/bodrum</code> → site URL adresi olur
            </p>
          </div>

          {/* Country → Region → District chain */}
          <div className="space-y-3 rounded-xl border border-neutral-100 p-4 dark:border-neutral-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              İlçeyle ilişkilendir (isteğe bağlı)
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Ülke</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    setSelectedCountry(e.target.value)
                    if (e.target.value) void loadRegions(e.target.value)
                    else { setRegions([]); setDistricts([]) }
                  }}
                  className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <option value="">Seç…</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  İl {loadingRegions ? <Loader2 className="inline h-3 w-3 animate-spin" /> : null}
                </label>
                <select
                  value={selectedRegion}
                  disabled={regions.length === 0}
                  onChange={(e) => {
                    setSelectedRegion(e.target.value)
                    if (e.target.value) void loadDistricts(e.target.value)
                  }}
                  className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <option value="">Seç…</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  İlçe {loadingDistricts ? <Loader2 className="inline h-3 w-3 animate-spin" /> : null}
                </label>
                <select
                  value={districtId}
                  disabled={districts.length === 0}
                  onChange={(e) => setDistrictId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <option value="">Seç…</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {initial ? 'Kaydet' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RegionsPageClient() {
  const router = useRouter()
  const routeParams = useParams<{ locale?: string }>()
  const routeLocale =
    typeof routeParams?.locale === 'string' && isAppLocale(routeParams.locale)
      ? routeParams.locale
      : defaultLocale

  const [pages, setPages] = useState<LocationPage[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [countries, setCountries] = useState<LocationCountry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editPage, setEditPage] = useState<LocationPage | undefined>()
  const [formBusy, setFormBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bulkPublishing, setBulkPublishing] = useState(false)
  /** Tek seferde bir il açık (accordion) */
  const [expandedProvinceKey, setExpandedProvinceKey] = useState<string | null>(null)
  /** Sayfa sınırında kalan il satırları — slug ile tamamlanır (pagination + gruplama) */
  const [provincePageByKey, setProvincePageByKey] = useState<Record<string, LocationPage | null>>({})
  const fetchedProvinceKeysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPageIndex(0)
  }, [debouncedSearch])

  const loadCountries = useCallback(async () => {
    try {
      const countriesRes = await listLocationCountries()
      setCountries(countriesRes.countries)
    } catch (e) {
      setError(formatManageApiCatch(e, 'Ülkeler yüklenemedi'))
    }
  }, [])

  const loadPages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const pagesRes = await listLocationPages({
        limit: REGION_LIST_PAGE_SIZE,
        offset: pageIndex * REGION_LIST_PAGE_SIZE,
        q: debouncedSearch || undefined,
      })
      setPages(pagesRes.pages)
      setTotalCount(pagesRes.total)
    } catch (e) {
      setError(formatManageApiCatch(e, 'Yüklenemedi'))
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, pageIndex])

  useEffect(() => { void loadCountries() }, [loadCountries])

  useEffect(() => { void loadPages() }, [loadPages])

  useEffect(() => {
    setExpandedProvinceKey(null)
  }, [debouncedSearch, pageIndex])

  const totalPages = Math.max(1, Math.ceil(totalCount / REGION_LIST_PAGE_SIZE))
  const rangeStart = totalCount === 0 ? 0 : pageIndex * REGION_LIST_PAGE_SIZE + 1
  const rangeEnd = totalCount === 0 ? 0 : pageIndex * REGION_LIST_PAGE_SIZE + pages.length

  const filteredDrafts = useMemo(
    () => pages.filter((page) => !page.is_published),
    [pages],
  )

  const { countries: countryPages, groups: provinceGroups } = useMemo(
    () => groupLocationPagesByProvince(pages),
    [pages],
  )

  useEffect(() => {
    const missing = provinceGroups
      .filter((g) => !g.provincePage)
      .map((g) => g.key)
      .filter((key) => !fetchedProvinceKeysRef.current.has(key))
    if (missing.length === 0) return
    for (const key of missing) fetchedProvinceKeysRef.current.add(key)
    let cancelled = false
    void Promise.all(
      missing.map(async (key) => {
        const page = await getLocationPageBySlug(key)
        if (cancelled) return
        setProvincePageByKey((prev) => ({ ...prev, [key]: page }))
      }),
    )
    return () => {
      cancelled = true
    }
  }, [provinceGroups])

  function resolveProvincePage(group: ProvinceGroup): LocationPage | null {
    return group.provincePage ?? provincePageByKey[group.key] ?? null
  }

  function toggleProvinceAccordion(provinceKey: string) {
    setExpandedProvinceKey((prev) => (prev === provinceKey ? null : provinceKey))
  }

  function renderPageRow(page: LocationPage, opts: { nested?: boolean }) {
    const nested = opts.nested === true
    return (
      <tr
        key={page.id}
        className={clsx(
          'transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40',
          nested && 'bg-neutral-50/70 dark:bg-neutral-900/50',
        )}
      >
        <td className={clsx('py-3', nested ? 'pl-12' : 'pl-5')}>
          <div className="flex items-start gap-2">
            {nested ? (
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" aria-hidden />
            ) : null}
            <div>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {locationPageListTitle(page)}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0 text-neutral-300" />
                <span className="font-mono text-xs text-neutral-400" title="URL yolu (slug)">
                  {page.slug_path}
                </span>
              </div>
            </div>
          </div>
        </td>
        <td className="py-3 text-xs text-neutral-400 hidden md:table-cell">
          {page.district_id ? (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[10px] dark:bg-neutral-800">
              {page.district_id.slice(0, 8)}…
            </span>
          ) : (
            <span className="text-neutral-300">—</span>
          )}
        </td>
        <td className="py-3 text-xs text-neutral-400 hidden sm:table-cell">
          {new Date(page.created_at).toLocaleDateString('tr-TR')}
        </td>
        <td className="py-3 text-center">
          <span className={clsx(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            page.is_published
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800',
          )}>
            {page.is_published ? 'Yayında' : 'Taslak'}
          </span>
        </td>
        <td className="py-3 pr-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            <a
              href={regionPublicHref(routeLocale, page.slug_path)}
              target="_blank"
              rel="noopener noreferrer"
              title="Sayfayı aç"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Link
              href={`/manage/regions/${page.id}`}
              title="Kapsamlı Düzenle"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-[color:var(--manage-primary)]/10 hover:text-[color:var(--manage-primary)] dark:hover:bg-neutral-800"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              title="Slug Düzenle"
              onClick={() => { setEditPage(page); setShowForm(true) }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Sil"
              disabled={deletingId === page.id}
              onClick={() => void handleDelete(page.id)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/30"
            >
              {deletingId === page.id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </td>
      </tr>
    )
  }

  const handleSave = useCallback(
    async (data: { slug_path: string; district_id: string }) => {
      setFormBusy(true)
      try {
        if (editPage) {
          await patchLocationPage(editPage.id, {
            slug_path: data.slug_path,
            district_id: data.district_id || undefined,
          })
          setShowForm(false)
          setEditPage(undefined)
          await loadPages()
        } else {
          const result = await createLocationPage({
            slug_path: data.slug_path,
            district_id: data.district_id || undefined,
          })
          setShowForm(false)
          router.push(`/manage/regions/${result.id}`)
        }
      } catch (e) {
        setError(formatManageApiCatch(e, 'Kaydedilemedi'))
      } finally {
        setFormBusy(false)
      }
    },
    [editPage, loadPages, router],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Bu bölge sayfası silinsin mi?')) return
      setDeletingId(id)
      try {
        await deleteLocationPage(id)
        setPages((prev) => prev.filter((p) => p.id !== id))
      } catch (e) {
        setError(formatManageApiCatch(e, 'Silinemedi'))
      } finally {
        setDeletingId(null)
      }
    },
    [],
  )

  const handleBulkPublishFiltered = useCallback(async () => {
    const drafts = filteredDrafts
    if (drafts.length === 0) return
    const scope = debouncedSearch
      ? 'bu sayfadaki arama sonucundaki taslak'
      : 'bu sayfadaki taslak'
    if (!window.confirm(`${drafts.length} ${scope} bölge sayfası yayına alınsın mı?`)) return

    setBulkPublishing(true)
    setError(null)
    try {
      for (const page of drafts) {
        await patchLocationPage(page.id, { is_published: true })
      }
      const publishedIds = new Set(drafts.map((page) => page.id))
      setPages((prev) =>
        prev.map((page) =>
          publishedIds.has(page.id) ? { ...page, is_published: true } : page,
        ),
      )
    } catch (e) {
      setError(formatManageApiCatch(e, 'Toplu yayınlama tamamlanamadı'))
      await loadPages()
    } finally {
      setBulkPublishing(false)
    }
  }, [filteredDrafts, loadPages, debouncedSearch])

  return (
    <div className="p-6 lg:p-8">
      {/* Başlık */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Bölge Sayfaları</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Destinasyon SEO sayfaları. Her sayfa bir slug yoluna sahiptir.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadPages()}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <Link
            href="regions/places"
            className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300"
          >
            <Navigation className="h-4 w-4" />
            Yakın Mekanlar
          </Link>
          <button
            type="button"
            onClick={() => { setEditPage(undefined); setShowForm(true) }}
            className="flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Yeni bölge sayfası
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Arama + toplu işlemler */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder="Başlık veya slug yoluna göre ara…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <button
          type="button"
          disabled={bulkPublishing || filteredDrafts.length === 0}
          onClick={() => void handleBulkPublishFiltered()}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
          title={
            debouncedSearch.trim()
              ? 'Bu sayfadaki arama eşleşmelerinden taslak olanları yayına al'
              : 'Bu sayfada listelenen taslakları yayına al'
          }
        >
          {bulkPublishing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {bulkPublishing ? 'Yayına alınıyor…' : `Taslakları yayına al (${filteredDrafts.length})`}
        </button>
      </div>

      {/* Tablo */}
      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Yükleniyor…
          </div>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <Globe className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">Bölge sayfası bulunamadı.</p>
            <button
              type="button"
              onClick={() => { setEditPage(undefined); setShowForm(true) }}
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              İlk bölge sayfasını ekle
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-50 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:bg-neutral-800/50">
                <th className="py-3 pl-5 text-left">Başlık</th>
                <th className="py-3 text-left hidden md:table-cell">İlçe ID</th>
                <th className="py-3 text-left hidden sm:table-cell">Oluşturulma</th>
                <th className="py-3 text-center">Durum</th>
                <th className="py-3 pr-5 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {countryPages.map((page) => renderPageRow(page, {}))}
              {provinceGroups.map((group) => {
                const prov = resolveProvincePage(group)
                const provinceTitle = prov
                  ? locationPageListTitle(prov)
                  : fallbackProvinceLabel(group.key)
                const expanded = expandedProvinceKey === group.key
                const provincePending =
                  !group.provincePage &&
                  !Object.prototype.hasOwnProperty.call(provincePageByKey, group.key)
                return (
                  <Fragment key={group.key}>
                    <tr className="bg-neutral-50/60 dark:bg-neutral-800/30">
                      <td className="py-3 pl-5">
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => toggleProvinceAccordion(group.key)}
                            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            aria-expanded={expanded}
                            title={expanded ? 'İlçeleri gizle' : 'İlçeleri göster'}
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <div>
                            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                              {provinceTitle}
                              <span className="ms-2 align-middle text-xs font-normal text-neutral-400">
                                ({group.districts.length} ilçe bu sayfada)
                              </span>
                            </p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 shrink-0 text-neutral-300" />
                              <span className="font-mono text-xs text-neutral-400" title="İl slug yolu">
                                {group.key}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden py-3 text-xs text-neutral-400 md:table-cell">—</td>
                      <td className="hidden py-3 text-xs text-neutral-400 sm:table-cell">
                        {prov ? new Date(prov.created_at).toLocaleDateString('tr-TR') : '—'}
                      </td>
                      <td className="py-3 text-center">
                        {prov ? (
                          <span className={clsx(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            prov.is_published
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800',
                          )}>
                            {prov.is_published ? 'Yayında' : 'Taslak'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-5">
                        {provincePending ? (
                          <span className="flex justify-end text-xs text-neutral-400">
                            <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                            Yükleniyor…
                          </span>
                        ) : prov ? (
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={regionPublicHref(routeLocale, prov.slug_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="İl sayfasını aç"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <Link
                              href={`/manage/regions/${prov.id}`}
                              title="İl — kapsamlı düzenle"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-[color:var(--manage-primary)]/10 hover:text-[color:var(--manage-primary)] dark:hover:bg-neutral-800"
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              type="button"
                              title="İl — slug düzenle"
                              onClick={() => { setEditPage(prov); setShowForm(true) }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="İl — sil"
                              disabled={deletingId === prov.id}
                              onClick={() => void handleDelete(prov.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/30"
                            >
                              {deletingId === prov.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="flex justify-end text-xs text-neutral-400">İl kaydı yok</span>
                        )}
                      </td>
                    </tr>
                    {expanded && group.districts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-3 pl-14 text-xs text-neutral-400">
                          Bu ile bağlı ilçe sayfası bu listede yok.
                        </td>
                      </tr>
                    ) : null}
                    {expanded
                      ? group.districts.map((d) => renderPageRow(d, { nested: true }))
                      : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && totalCount > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50/80 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/40">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              {rangeStart}–{rangeEnd}
            </span>
            {' · '}
            Toplam {totalCount} kayıt
            {debouncedSearch ? (
              <span className="text-neutral-400">{` (arama: "${debouncedSearch}")`}</span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500">
              Sayfa {pageIndex + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={pageIndex === 0 || loading}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Önceki
            </button>
            <button
              type="button"
              disabled={(pageIndex + 1) * REGION_LIST_PAGE_SIZE >= totalCount || loading}
              onClick={() => setPageIndex((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Sonraki
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-xs text-neutral-400">
        Arama kutusu sunucuda başlık, slug ve çeviriler üzerinde çalışır (sayfa başına {REGION_LIST_PAGE_SIZE} kayıt).
      </p>

      {/* Modal */}
      {showForm ? (
        <PageFormModal
          initial={editPage}
          countries={countries}
          onClose={() => { setShowForm(false); setEditPage(undefined) }}
          onSave={handleSave}
          busy={formBusy}
        />
      ) : null}
    </div>
  )
}
