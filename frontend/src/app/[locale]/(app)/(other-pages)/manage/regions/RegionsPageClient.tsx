'use client'

import {
  createLocationPage,
  deleteLocationPage,
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
import { regionPublicHref } from '@/lib/region-public-path'
import clsx from 'clsx'
import {
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
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'

/** Liste: çekirdek `title` boş olsa bile çevirideki ad veya meta ile gösterim başlığı */
function locationPageListTitle(page: LocationPage): string {
  const direct = page.title?.trim()
  if (direct) return direct
  try {
    const tr = JSON.parse(page.translations_json || '{}') as LocationTranslations
    const trName = tr.tr?.name?.trim()
    if (trName) return trName
    for (const k of Object.keys(tr)) {
      const n = tr[k]?.name?.trim()
      if (n) return n
    }
  } catch {
    /* ignore */
  }
  const meta = page.meta_title?.trim()
  if (meta) return meta
  const tail = page.slug_path.split('/').filter(Boolean).pop() ?? page.slug_path
  const words = tail.replace(/[-_]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return page.slug_path
  return words.map((w) => w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1).toLocaleLowerCase('tr-TR')).join(' ')
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
              Örnek: <code>turkiye/mugla/bodrum</code> → site URL'si olur
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
  const [countries, setCountries] = useState<LocationCountry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editPage, setEditPage] = useState<LocationPage | undefined>()
  const [formBusy, setFormBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pagesRes, countriesRes] = await Promise.all([
        listLocationPages(),
        listLocationCountries(),
      ])
      setPages(pagesRes.pages)
      setCountries(countriesRes.countries)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadAll() }, [loadAll])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pages
    return pages.filter((p) => {
      if (p.slug_path.toLowerCase().includes(q)) return true
      if (locationPageListTitle(p).toLowerCase().includes(q)) return true
      if (p.title?.toLowerCase().includes(q)) return true
      if (p.meta_title?.toLowerCase().includes(q)) return true
      try {
        const raw = JSON.parse(p.translations_json || '{}') as LocationTranslations
        return Object.values(raw).some((v) => v?.name?.toLowerCase().includes(q))
      } catch {
        return false
      }
    })
  }, [pages, search])

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
          await loadAll()
        } else {
          const result = await createLocationPage({
            slug_path: data.slug_path,
            district_id: data.district_id || undefined,
          })
          setShowForm(false)
          router.push(`/manage/regions/${result.id}`)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kaydedilemedi')
      } finally {
        setFormBusy(false)
      }
    },
    [editPage, loadAll],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Bu bölge sayfası silinsin mi?')) return
      setDeletingId(id)
      try {
        await deleteLocationPage(id)
        setPages((prev) => prev.filter((p) => p.id !== id))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Silinemedi')
      } finally {
        setDeletingId(null)
      }
    },
    [],
  )

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
            onClick={() => void loadAll()}
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

      {/* Arama */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="search"
          placeholder="Başlık veya slug yoluna göre ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>

      {/* Tablo */}
      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Yükleniyor…
          </div>
        ) : filtered.length === 0 ? (
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
              {filtered.map((page) => (
                <tr
                  key={page.id}
                  className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                >
                  <td className="py-3 pl-5">
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
                  <td className="py-3 pr-5">
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-3 text-xs text-neutral-400">
        {filtered.length} bölge sayfası gösteriliyor
        {filtered.length !== pages.length ? ` (toplam ${pages.length})` : ''}
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
