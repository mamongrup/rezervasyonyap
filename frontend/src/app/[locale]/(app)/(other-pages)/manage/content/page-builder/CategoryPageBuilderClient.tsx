'use client'

import type { PageBuilderModule, PageBuilderModuleType } from '@/types/listing-types'
import type { PageBuilderModuleConfigByType } from '@/types/page-builder-module'
import { buildTurlarCategoryHubGridConfig } from '@/data/tour-hub-categories'
import { patchModuleConfigById } from '@/lib/page-builder/module-state'
import { Eye, Loader2, Plus, RotateCcw, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AddModuleDialog, ModuleRow } from './editors'

interface CategoryInfo {
  slug: string
  name: string
  emoji: string
  hasCustomConfig: boolean
  isSpecial?: boolean
}

export default function CategoryPageBuilderClient({ presetSlug }: { presetSlug?: string } = {}) {
  const [categories, setCategories] = useState<CategoryInfo[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string>(presetSlug ?? '')
  const [modules, setModules] = useState<PageBuilderModule[]>([])
  const [loadedModulesJson, setLoadedModulesJson] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  useEffect(() => {
    if (presetSlug) return
    fetch('/api/page-builder')
      .then((r) => r.json())
      .then((data: { ok: boolean; categories: CategoryInfo[] }) => {
        if (data.ok) {
          setCategories(data.categories)
          if (data.categories.length > 0) setSelectedSlug(data.categories[0].slug)
        }
      })
      .catch(console.error)
  }, [presetSlug])

  useEffect(() => {
    if (!selectedSlug) return
    setLoading(true)
    fetch(`/api/page-builder?slug=${selectedSlug}`)
      .then((r) => r.json())
      .then((data: { ok: boolean; config: { modules: PageBuilderModule[] } }) => {
        if (data.ok) {
          setModules(data.config.modules)
          setLoadedModulesJson(JSON.stringify(data.config.modules))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedSlug])

  const isDirty = useMemo(() => {
    if (!loadedModulesJson) return false
    return JSON.stringify(modules) !== loadedModulesJson
  }, [modules, loadedModulesJson])

  const baselineModuleList = useMemo((): PageBuilderModule[] => {
    if (!loadedModulesJson) return []
    try {
      return JSON.parse(loadedModulesJson) as PageBuilderModule[]
    } catch {
      return []
    }
  }, [loadedModulesJson])

  /** Kayıtlı sürüme göre değişen modül satırları (sıra + içerik) */
  const dirtyModuleIds = useMemo(() => {
    const dirty = new Set<string>()
    const baseById = new Map(baselineModuleList.map((m) => [m.id, m]))
    for (const m of modules) {
      const b = baseById.get(m.id)
      if (!b || JSON.stringify(m) !== JSON.stringify(b)) dirty.add(m.id)
    }
    return dirty
  }, [modules, baselineModuleList])

  const handleToggle = useCallback((id: string) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)))
  }, [])

  const handleMove = useCallback((id: string, dir: 'up' | 'down') => {
    setModules((prev) => {
      const idx = prev.findIndex((m) => m.id === id)
      if (idx === -1) return prev
      const next = [...prev]
      const target = dir === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next.map((m, i) => ({ ...m, order: i + 1 }))
    })
  }, [])

  const handleDelete = useCallback((id: string) => {
    setModules((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const handleConfigChange = useCallback((id: string, config: PageBuilderModule['config']) => {
    setModules((prev) => patchModuleConfigById(prev, id, config))
  }, [])

  const handleDuplicate = useCallback((id: string) => {
    setModules((prev) => {
      const idx = prev.findIndex((m) => m.id === id)
      if (idx === -1) return prev
      const base = prev[idx]
      const copy = {
        ...base,
        id: `${selectedSlug}-${base.type}-${Date.now()}`,
        order: prev.length + 1,
        enabled: true,
        config: JSON.parse(JSON.stringify(base.config)),
      } as PageBuilderModule
      const next = [...prev, copy]
      return next.map((m, i) => ({ ...m, order: i + 1 }))
    })
  }, [selectedSlug])

  const handleAddModule = useCallback(
    (type: PageBuilderModuleType) => {
      const defaultConfigs = {
        hero: {
          heading: '',
          subheading: '',
          ctaText: '',
          ctaHref: '',
          images: ['', '', ''],
          showSearchForm: true,
        },
        featured_by_region: {
          heading: 'Bölgeye Göre Öne Çıkanlar',
          subheading: 'Popüler şehirlerdeki en beğenilen ilanlar',
          viewAllHref: `/${selectedSlug}/all`,
          regions: [],
        },
        top_providers: {
          heading: 'En Başarılı İlan Sahipleri',
          subheading: 'Tüm kategorilerde müşterilerinden en yüksek puanı alan ilan sağlayıcılar',
          ctaText: 'Siz de ilan verin',
          ctaHref: '/manage',
          maxCount: 10,
          showCategoryFilter: true,
        },
        listings_grid: {
          title: 'Yeni İlanlar',
          subheading: 'Son eklenen ilanlar',
          filterMode: 'new',
          showTabs: false,
          count: 8,
          viewAllHref: `/${selectedSlug}/all`,
          viewAllLabel: 'Tümünü Gör',
        },
        listings_slider: {
          title: 'İndirimli İlanlar',
          subheading: 'Özel fiyatlı seçenekler',
          filterMode: 'discounted',
          showTabs: false,
          count: 8,
          viewAllHref: `/${selectedSlug}/all`,
          viewAllLabel: 'Tümünü Gör',
        },
        categories_grid: { title: 'Destinasyonlar', layout: 'grid' },
        promo_banner: { title: 'Kampanya', description: '', ctaText: 'İncele', ctaHref: '#' },
        sliders_banner: { pageKey: selectedSlug },
        text_block: { title: '', content: '', align: 'left' },
        image_text: { title: '', content: '', imageUrl: '', imagePosition: 'left' },
        stats: { title: '' },
        why_us: { title: 'Neden Bizi Seçin?' },
        testimonials: { title: 'Müşteri Yorumları' },
        newsletter: { title: 'Bültene Abone Ol' },
        faq: { title: 'Sıkça Sorulan Sorular' },
        become_provider: {
          heading: 'İlanınızı Ekleyin, Kazanmaya Başlayın',
          subheading:
            'Otel, tur, tatil evi, tekne, araç kiralama — ne sunarsanız sunun, milyonlarca gezgine ulaşmanın en kolay yolu burada.',
          ctaText: 'Ücretsiz İlan Ver',
          ctaHref: '/manage',
          secondaryCtaText: 'Nasıl Çalışır?',
          secondaryCtaHref: '/about',
          bgVariant: 'light',
        },
        destination_cards: { title: 'Destinasyonlar', limit: 6 },
        partners: { title: 'Partnerlerimiz' },
        video_gallery: {
          title: '🎬 Videolar',
          subtitle: 'En yeni destinasyonları ve deneyimleri keşfedin.',
          videos: [{ id: 'v1', title: 'Tanıtım Videosu', videoUrl: '', thumbnail: '' }],
        },
        category_slider: { heading: '', subheading: '', cardType: 'card3', slice: 'first6', categoryThumbnails: {} },
        travel_category_images: { thumbnails: {} },
        region_slider: {
          heading: '',
          subheading: '',
          cardType: 'card3',
          categoryCode: '',
          categoryRoute: 'oteller',
          unit: 'ilan',
          limit: 12,
        },
        gezi_onerileri: {},
        featured_places: { heading: '', subHeading: '', viewAllHref: `/${selectedSlug}/all` },
        how_it_works: { title: '', subheading: '' },
        category_grid: { heading: '', subheading: '', categoryThumbnails: {} },
        category_hub_grid:
          selectedSlug === 'turlar'
            ? buildTurlarCategoryHubGridConfig('tr')
            : { heading: '', headingEn: '', subheading: '', subheadingEn: '', cards: [] },
        section_videos: { heading: '', subheading: '', videos: [] },
        client_say: { heading: '', subHeading: '' },
        search_results: { perPage: 24 },
        active_campaigns: {
          title: {},
          subheading: {},
          limit: 6,
          viewAllHref: `/${selectedSlug}/kampanyalar`,
          viewAllLabel: {},
        },
        early_booking_promo: {
          title: {},
          subheading: {},
          ctaHref: `/${selectedSlug}/all`,
          ctaLabel: {},
          gradient: 'from-emerald-500 to-teal-600',
        },
        last_minute_promo: {
          title: {},
          subheading: {},
          ctaHref: `/${selectedSlug}/all`,
          ctaLabel: {},
          gradient: 'from-rose-500 via-orange-500 to-amber-500',
        },
        coupons_strip: { title: {}, subheading: {}, limit: 6 },
        holiday_packages: { title: {}, subheading: {}, limit: 6, viewAllHref: '/tr/paketler', viewAllLabel: {} },
        cross_sell_widget: { title: {}, subheading: {}, triggerCategory: selectedSlug, limit: 4 },
        region_detail_hero: {},
        region_detail_breadcrumb: {},
        region_detail_listings: {},
        region_detail_explore_hotels: {},
        region_detail_newsletter: {},
        region_detail_about: {},
        region_detail_travel_ideas: {},
        region_detail_places_vitrin: {},
        region_detail_nearby: {},
        region_detail_map: {},
        region_detail_empty_hint: {},
        region_detail_subdivisions: {},
      } satisfies PageBuilderModuleConfigByType

      const newModule = {
        id: `${selectedSlug}-${type}-${Date.now()}`,
        type,
        enabled: true,
        order: modules.length + 1,
        config: defaultConfigs[type] ?? {},
      } as PageBuilderModule
      setModules((prev) => [...prev, newModule])
    },
    [selectedSlug, modules.length],
  )

  const handleSave = async () => {
    if (!selectedSlug) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/page-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: selectedSlug, modules }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (data.ok) {
        setLoadedModulesJson(JSON.stringify(modules))
        setMsg({
          ok: true,
          text:
            selectedSlug === 'bolge-detay'
              ? '✓ Kaydedildi. Bölge vitrin sayfalarına (`/bolge/…`) sıra yansıtıldı.'
              : '✓ Kaydedildi. Değişiklikler kategori sayfasına yansıtıldı.',
        })
        setCategories((prev) =>
          prev.map((c) => (c.slug === selectedSlug ? { ...c, hasCustomConfig: true } : c)),
        )
      } else {
        setMsg({ ok: false, text: data.error ?? 'Kayıt başarısız.' })
      }
    } catch {
      setMsg({ ok: false, text: 'Bir hata oluştu.' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!selectedSlug || !confirm('Bu kategorinin page builder ayarları sıfırlanacak. Emin misiniz?')) return
    await fetch(`/api/page-builder?slug=${selectedSlug}`, { method: 'DELETE' })
    setLoading(true)
    fetch(`/api/page-builder?slug=${selectedSlug}`)
      .then((r) => r.json())
      .then((data: { ok: boolean; config: { modules: PageBuilderModule[] } }) => {
        if (data.ok) {
          setModules(data.config.modules)
          setLoadedModulesJson(JSON.stringify(data.config.modules))
        }
        setMsg({ ok: true, text: 'Varsayılan ayarlara döndürüldü.' })
      })
      .finally(() => setLoading(false))
  }

  const selectedCat = categories.find((c) => c.slug === selectedSlug)
  const isPreset = !!presetSlug

  return (
    <div className={`flex flex-col gap-6 ${isPreset ? '' : 'lg:flex-row lg:items-start'}`}>
      {!isPreset && (
        <aside className="w-full shrink-0 lg:w-64">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            {categories.some((c) => c.isSpecial) && (
              <>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  Özel Sayfalar
                </p>
                <div className="mb-3 space-y-1">
                  {categories
                    .filter((c) => c.isSpecial)
                    .map((cat) => (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => {
                          setSelectedSlug(cat.slug)
                          setMsg(null)
                        }}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                          selectedSlug === cat.slug
                            ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                            : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <span>{cat.emoji}</span>
                        <span className="flex-1 truncate">{cat.name}</span>
                        {cat.hasCustomConfig && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500" title="Özelleştirilmiş" />
                        )}
                      </button>
                    ))}
                </div>
                <div className="mb-3 border-t border-neutral-100 dark:border-neutral-800" />
              </>
            )}
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              Kategori Sayfaları
            </p>
            <div className="space-y-1">
              {categories
                .filter((c) => !c.isSpecial)
                .map((cat) => (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => {
                      setSelectedSlug(cat.slug)
                      setMsg(null)
                    }}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                      selectedSlug === cat.slug
                        ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span className="flex-1 truncate">{cat.name}</span>
                    {cat.hasCustomConfig && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500" title="Özelleştirilmiş" />
                    )}
                  </button>
                ))}
            </div>
          </div>
        </aside>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            {!isPreset && (
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                {selectedCat ? `${selectedCat.emoji} ${selectedCat.name}` : 'Kategori Seçin'}
              </h2>
            )}
            {!isPreset && selectedCat && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                /{selectedCat.slug} sayfası için modül düzeni
                {isDirty ? (
                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                    Kaydedilmemiş değişiklik
                  </span>
                ) : null}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <RotateCcw className="h-4 w-4" />
              Varsayılana Sıfırla
            </button>
            <button
              type="button"
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
            >
              <Plus className="h-4 w-4" />
              Modül Ekle
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </button>
          </div>
        </div>

        {isDirty ? (
          <details className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            <summary className="cursor-pointer font-medium">Değişiklik özeti (JSON)</summary>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-semibold text-neutral-500">Önce</div>
                <pre className="max-h-72 overflow-auto rounded-lg bg-white p-2 text-[11px] dark:bg-neutral-950">
                  {loadedModulesJson}
                </pre>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-neutral-500">Şimdi</div>
                <pre className="max-h-72 overflow-auto rounded-lg bg-white p-2 text-[11px] dark:bg-neutral-950">
                  {JSON.stringify(modules)}
                </pre>
              </div>
            </div>
          </details>
        ) : null}

        {msg && (
          <div
            className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
              msg.ok
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {msg.text}
          </div>
        )}

        {isPreset ? (
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 flex items-center gap-2 text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            <Eye className="h-4 w-4" />
            Ana sayfayı önizle →
          </a>
        ) : selectedCat ? (
          <a
            href={
              selectedCat.slug === 'homepage'
                ? '/'
                : selectedCat.slug === 'ara'
                  ? '/ara?q=antalya'
                  : `/${selectedCat.slug}/all`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 flex items-center gap-2 text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            <Eye className="h-4 w-4" />
            {selectedCat.slug === 'homepage'
              ? 'Ana sayfayı önizle →'
              : selectedCat.slug === 'ara'
                ? 'Arama sayfasını önizle →'
                : `/${selectedCat.slug}/all sayfasını önizle →`}
          </a>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-300" />
          </div>
        ) : (
          <div className="space-y-3">
            {modules.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-neutral-200 p-10 text-center text-neutral-400 dark:border-neutral-700">
                Modül yok. Modül Ekle butonuna tıklayarak başlayın.
              </div>
            )}
            {modules.map((module, index) => (
              <ModuleRow
                key={module.id}
                module={module}
                index={index}
                total={modules.length}
                categorySlug={selectedSlug}
                rowDirty={dirtyModuleIds.has(module.id)}
                onToggle={handleToggle}
                onMove={handleMove}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onConfigChange={handleConfigChange}
              />
            ))}
          </div>
        )}

        <div className="mt-8 rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          <p className="mb-2 font-medium text-neutral-700 dark:text-neutral-300">💡 Nasıl Çalışır?</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Modülleri yukarı/aşağı oklar ile sıralayın</li>
            <li>Göz ikonu ile modülleri göster/gizle</li>
            <li>Dişli ikonu ile modül ayarlarını düzenleyin</li>
            <li>Kaydet ile değişikliklerinizi yayınlayın</li>
            <li>
              <strong>Kategori görselleri (paylaşımlı)</strong> yalnızca <strong>Ana Sayfa</strong> kaydında eklenir;
              diğer kategorilerde kart görseli için ilgili <em>Kategori Slider / Grid</em> ayarlarını kullanın
            </li>
          </ul>
        </div>
      </div>

      {showAddDialog ? (
        <AddModuleDialog
          pageSlug={selectedSlug}
          onAdd={handleAddModule}
          onClose={() => setShowAddDialog(false)}
        />
      ) : null}
    </div>
  )
}
