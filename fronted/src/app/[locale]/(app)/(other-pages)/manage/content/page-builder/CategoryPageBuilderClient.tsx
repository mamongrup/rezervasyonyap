'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import Image from 'next/image'
import type { PageBuilderModule, PageBuilderModuleType } from '@/types/listing-types'

// ─── Module catalog (all available module types) ───────────────────────────────

const MODULE_CATALOG: { type: PageBuilderModuleType; label: string; description: string; emoji: string }[] = [
  { type: 'hero', label: 'Hero Banner', description: 'Büyük hero görseli + arama formu', emoji: '🖼️' },
  { type: 'featured_by_region', label: 'Bölgeye Göre Öne Çıkar', description: 'Şehir sekmeli ilan vitrin bölümü', emoji: '📍' },
  { type: 'top_providers', label: 'En İyi İlan Sahipleri', description: 'Tüm kategorilerden başarı sıralaması', emoji: '🏆' },
  { type: 'become_provider', label: 'İlan Ver & Kazan', description: 'İlan sahiplerini teşvik eden CTA bölümü', emoji: '💼' },
  { type: 'listings_grid', label: 'İlan Grid', description: 'İlanları grid şeklinde göster', emoji: '🏷️' },
  { type: 'listings_slider', label: 'İlan Slider', description: 'İlanları yatay kaydıran şerit', emoji: '🎠' },
  { type: 'categories_grid', label: 'Kategori Grid', description: 'Alt kategori / destinasyon kartları', emoji: '🗂️' },
  { type: 'promo_banner', label: 'Promosyon Baneri', description: 'Kampanya CTA baneri', emoji: '📢' },
  { type: 'text_block', label: 'Metin Bloğu', description: 'Başlık + zengin metin içeriği', emoji: '📝' },
  { type: 'image_text', label: 'Görsel + Metin', description: 'Yan yana görsel ve metin', emoji: '🖼️' },
  { type: 'stats', label: 'İstatistikler', description: 'Sayısal metrik gösterimi', emoji: '📊' },
  { type: 'why_us', label: 'Neden Biz?', description: 'Avantaj ve özellik kartları', emoji: '⭐' },
  { type: 'testimonials', label: 'Müşteri Yorumları', description: 'Müşteri deneyim yorumları', emoji: '💬' },
  { type: 'newsletter', label: 'Bülten Aboneliği', description: 'E-posta kayıt formu', emoji: '📧' },
  { type: 'faq', label: 'SSS', description: 'Sıkça sorulan sorular', emoji: '❓' },
  { type: 'destination_cards', label: 'Destinasyon Kartları', description: 'Bölge/şehir kartları', emoji: '🗂️' },
  { type: 'partners', label: 'Partnerler', description: 'Logo duvarı / partner grid', emoji: '🤝' },
  { type: 'video_gallery', label: 'Video Galerisi', description: 'Büyük öne çıkan video + yan küçük liste', emoji: '🎬' },
  // Homepage-specific modules
  { type: 'category_slider', label: 'Kategori Slider', description: 'Kategorileri yatay kaydırmalı göster', emoji: '🎡' },
  { type: 'gezi_onerileri', label: 'Gezi Önerileri', description: 'Öne çıkan gezi önerileri bölümü', emoji: '🗺️' },
  { type: 'featured_places', label: 'Öne Çıkan Yerler', description: 'Popüler destinasyonlar vitrini', emoji: '📌' },
  { type: 'how_it_works', label: 'Nasıl Çalışır?', description: 'Adım adım platform açıklaması', emoji: '⚙️' },
  { type: 'category_grid', label: 'Kategori Grid (Ana Sayfa)', description: 'Tüm kategorilerin grid görünümü', emoji: '🏠' },
  { type: 'section_videos', label: 'Video Bölümü', description: 'Öne çıkan videolar bölümü', emoji: '🎥' },
  { type: 'client_say', label: 'Müşteriler Ne Diyor?', description: 'Müşteri deneyim yorumları', emoji: '🌟' },
]

interface CategoryInfo {
  slug: string
  name: string
  emoji: string
  hasCustomConfig: boolean
  isSpecial?: boolean
}

// ─── Hero Image Slot ──────────────────────────────────────────────────────────

function HeroImageSlot({
  label,
  description,
  value,
  slot,
  categorySlug,
  onChange,
}: {
  label: string
  description: string
  value: string
  slot: number
  categorySlug: string
  onChange: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    form.append('folder', 'hero')
    form.append('category', categorySlug)
    form.append('slot', String(slot))
    /** API `index` ile dosya adı: `{category}-{1|2|3}.avif` — slot çakışması önlenir */
    form.append('index', String(slot + 1))

    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: form })
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string }
      if (data.ok && data.url) {
        onChange(data.url)
      } else {
        setError(data.error ?? 'Yükleme başarısız.')
      }
    } catch {
      setError('Ağ hatası. Lütfen tekrar deneyin.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{label}</span>
          <span className="ms-1.5 text-xs text-neutral-400">{description}</span>
        </div>
        {value && (
          <button
            onClick={() => onChange('')}
            className="text-xs text-red-500 hover:text-red-700"
            title="Görseli kaldır"
          >
            Kaldır
          </button>
        )}
      </div>

      {/* Preview / Drop zone */}
      <div
        className={`relative flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          value
            ? 'border-primary-300 bg-neutral-50 dark:bg-neutral-800'
            : 'border-neutral-200 bg-neutral-50 hover:border-primary-300 hover:bg-primary-50/30 dark:border-neutral-700 dark:bg-neutral-800'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
      >
        {value ? (
          <>
            <Image
              src={value}
              alt={label}
              fill
              className="object-cover"
              unoptimized={value.startsWith('/uploads/')}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
              <Upload className="h-6 w-6 text-white" />
              <span className="ms-2 text-sm font-medium text-white">Değiştir</span>
            </div>
          </>
        ) : uploading ? (
          <Loader2 className="h-7 w-7 animate-spin text-primary-400" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-neutral-400">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">Tıkla veya sürükle</span>
            <span className="text-[10px]">JPEG, PNG, WebP · maks 5 MB</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
      </div>

      {/* URL fallback input */}
      <input
        type="text"
        placeholder="ya da harici URL girin…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 placeholder-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Hero Config Editor (special editor for type === 'hero') ──────────────────

function normalizeHeroImages(raw: unknown): [string, string, string] {
  const out: [string, string, string] = ['', '', '']
  if (Array.isArray(raw)) {
    for (let i = 0; i < 3; i++) out[i] = String(raw[i] ?? '').trim()
  } else if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    for (let i = 0; i < 3; i++) out[i] = String(o[String(i)] ?? '').trim()
  }
  return out
}

function HeroConfigEditor({
  config,
  categorySlug,
  onChange,
}: {
  config: Record<string, unknown>
  categorySlug: string
  onChange: (updated: Record<string, unknown>) => void
}) {
  const configRef = useRef(config)
  useLayoutEffect(() => {
    configRef.current = config
  }, [config])

  const images = normalizeHeroImages(config.images)

  function setImage(index: number, url: string) {
    const c = configRef.current
    const next = [...normalizeHeroImages(c.images)]
    next[index] = url
    const updated = { ...c, images: next }
    configRef.current = updated
    onChange(updated)
  }

  return (
    <div className="space-y-5">
      {/* Text overrides */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Metin İçeriği</p>
        {categorySlug === 'homepage' ? (
          <p className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs font-medium text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            Ana sayfa hero metinleri ve vitrin bağlantıları üstteki «Ana Sayfa Düzenleyici» (Hero) ekranından
            yönetilir; başlık / alt metin / buton otel vitrinine yönlendirilir.
          </p>
        ) : (
          <p className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs font-medium text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            Ön yüzde hero başlığı ve istatistik satırı bu kategorinin «tüm ilanlar» vitrinine (
            <code className="rounded bg-white/80 px-1 dark:bg-neutral-900">/all</code>) yönlendirir.
          </p>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Başlık (boş bırakılırsa kategori adı kullanılır)
          </label>
          <input
            type="text"
            placeholder="ör. Hayalinizdeki Otel"
            value={(config.heading as string) ?? ''}
            onChange={(e) => onChange({ ...config, heading: e.target.value })}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Alt Başlık (boş bırakılırsa kategori açıklaması kullanılır)
          </label>
          <textarea
            placeholder="ör. Türkiye'nin en iyi otellerinde konforlu bir konaklama…"
            value={(config.subheading as string) ?? ''}
            onChange={(e) => onChange({ ...config, subheading: e.target.value })}
            rows={2}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm resize-none dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
      </div>

      {/* Image mosaic */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">
          Hero Görselleri (3 parça mozaik)
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <HeroImageSlot
            label="Görsel 1"
            description="Sol üst (md+)"
            value={images[0]}
            slot={0}
            categorySlug={categorySlug}
            onChange={(url) => setImage(0, url)}
          />
          <HeroImageSlot
            label="Görsel 2"
            description="Sol alt (md+)"
            value={images[1]}
            slot={1}
            categorySlug={categorySlug}
            onChange={(url) => setImage(1, url)}
          />
          <HeroImageSlot
            label="Görsel 3"
            description="Sağ sütun (md+)"
            value={images[2]}
            slot={2}
            categorySlug={categorySlug}
            onChange={(url) => setImage(2, url)}
          />
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          Masaüstünde bölge / anasayfa ile aynı üç parçalı mozaik: sol üst, sol alt ve sağ kolon.
          Boş slotlar kategori varsayılan görseliyle dolar.
        </p>
      </div>
    </div>
  )
}

// ─── Featured By Region Config Editor ─────────────────────────────────────────

type RegionEntry = { name: string; slug: string; listingIds: string[] }

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/İ/g, 'i').replace(/ı/g, 'i').replace(/ş/g, 's')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, '-')
}

function FeaturedByRegionConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (updated: Record<string, unknown>) => void
}) {
  const regions: RegionEntry[] = Array.isArray(config.regions)
    ? (config.regions as RegionEntry[])
    : []

  const [newCity, setNewCity] = useState('')

  function updateText(key: string, val: string) {
    onChange({ ...config, [key]: val })
  }

  function addRegion() {
    const name = newCity.trim()
    if (!name || regions.find((r) => r.name.toLowerCase() === name.toLowerCase())) return
    onChange({ ...config, regions: [...regions, { name, slug: slugify(name), listingIds: [] }] })
    setNewCity('')
  }

  function removeRegion(slug: string) {
    onChange({ ...config, regions: regions.filter((r) => r.slug !== slug) })
  }

  function moveRegion(slug: string, dir: -1 | 1) {
    const arr = [...regions]
    const idx = arr.findIndex((r) => r.slug === slug)
    const to = idx + dir
    if (to < 0 || to >= arr.length) return
    ;[arr[idx], arr[to]] = [arr[to], arr[idx]]
    onChange({ ...config, regions: arr })
  }

  return (
    <div className="space-y-5">
      {/* Text fields */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Bölüm Metinleri</p>
        {[
          { key: 'heading', label: 'Başlık', placeholder: 'ör. Bölgeye Göre Öne Çıkanlar' },
          { key: 'subheading', label: 'Alt Başlık', placeholder: 'ör. Popüler şehirlerdeki en iyi seçenekler' },
          { key: 'viewAllHref', label: '"Tümünü Gör" Linki', placeholder: '/oteller/all' },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
            <input
              type="text"
              placeholder={placeholder}
              value={(config[key] as string) ?? ''}
              onChange={(e) => updateText(key, e.target.value)}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
        ))}
      </div>

      {/* Regions */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
          Bölgeler <span className="normal-case font-normal text-neutral-400">(boş bırakılırsa ilanlardan otomatik üretilir)</span>
        </p>

        {/* Add new */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Şehir adı — ör. Antalya"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRegion()}
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
          <button
            onClick={addRegion}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            + Ekle
          </button>
        </div>

        {/* Region list */}
        {regions.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">
            Henüz bölge eklenmedi. Boş bırakırsanız ilanların şehir bilgisine göre otomatik gruplandırılır.
          </p>
        ) : (
          <div className="space-y-2">
            {regions.map((region, idx) => (
              <div
                key={region.slug}
                className="flex items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveRegion(region.slug, -1)}
                    disabled={idx === 0}
                    className="text-[10px] text-neutral-400 hover:text-neutral-700 disabled:opacity-30 leading-none"
                  >▲</button>
                  <button
                    onClick={() => moveRegion(region.slug, 1)}
                    disabled={idx === regions.length - 1}
                    className="text-[10px] text-neutral-400 hover:text-neutral-700 disabled:opacity-30 leading-none"
                  >▼</button>
                </div>
                <span className="flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {region.name}
                </span>
                {region.listingIds?.length ? (
                  <span className="text-xs text-neutral-400">{region.listingIds.length} sabitlenmiş</span>
                ) : (
                  <span className="text-xs text-neutral-400 italic">Tümü gösterilir</span>
                )}
                <button
                  onClick={() => removeRegion(region.slug)}
                  className="text-red-400 hover:text-red-600 p-0.5"
                  title="Kaldır"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-neutral-400">
          💡 Hangi ilanların görüneceğini detaylı yapılandırmak için{' '}
          <a href="/manage/content/featured-regions" className="text-primary-600 hover:underline">
            Bölge Vitrin Editörü
          </a>
          'nü kullanın.
        </p>
      </div>
    </div>
  )
}

// ─── Top Providers Config Editor ──────────────────────────────────────────────

function TopProvidersConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (updated: Record<string, unknown>) => void
}) {
  const fields = [
    { key: 'heading', label: 'Başlık', placeholder: 'En Başarılı İlan Sahipleri' },
    { key: 'subheading', label: 'Alt Başlık', placeholder: 'Tüm kategorilerde en yüksek puan alan...' },
    { key: 'ctaText', label: 'Buton Metni', placeholder: 'Siz de ilan verin' },
    { key: 'ctaHref', label: 'Buton Linki', placeholder: '/manage' },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Bölüm Metinleri</p>
        {fields.map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
            <input
              type="text"
              placeholder={placeholder}
              value={(config[key] as string) ?? ''}
              onChange={(e) => onChange({ ...config, [key]: e.target.value })}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Görünüm</p>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Maksimum gösterilen kişi
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={(config.maxCount as number) ?? 10}
            onChange={(e) => onChange({ ...config, maxCount: Number(e.target.value) })}
            className="w-28 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={(config.showCategoryFilter as boolean) !== false}
            onChange={(e) => onChange({ ...config, showCategoryFilter: e.target.checked })}
            className="h-4 w-4 rounded accent-primary-600"
          />
          Kategori filtresi göster
        </label>
      </div>
      <p className="text-xs text-neutral-400">
        💡 İlan sahipleri puan ortalamasına ve ilan sayısına göre otomatik sıralanır.
        İlan verilerini{' '}
        <a href="/manage/admin" className="text-primary-600 hover:underline">
          Yönetim Paneli
        </a>
        'nden güncelleyebilirsiniz.
      </p>
    </div>
  )
}

// ─── Become Provider Config Editor ────────────────────────────────────────────

function BecomeProviderConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (updated: Record<string, unknown>) => void
}) {
  const fields = [
    { key: 'heading', label: 'Başlık', placeholder: 'İlanınızı Ekleyin, Kazanmaya Başlayın' },
    { key: 'subheading', label: 'Alt Başlık / Açıklama', placeholder: 'Milyonlarca gezgine ulaşın...' },
    { key: 'ctaText', label: 'Ana Buton Metni', placeholder: 'Ücretsiz İlan Ver' },
    { key: 'ctaHref', label: 'Ana Buton Linki', placeholder: '/manage' },
    { key: 'secondaryCtaText', label: 'İkincil Buton Metni', placeholder: 'Nasıl Çalışır?' },
    { key: 'secondaryCtaHref', label: 'İkincil Buton Linki', placeholder: '/about' },
  ]

  const bgOptions = [
    { value: 'light', label: 'Açık (varsayılan)' },
    { value: 'gradient', label: 'Gradyan' },
    { value: 'dark', label: 'Koyu' },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">İçerik</p>
        {fields.map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
            <input
              type="text"
              placeholder={placeholder}
              value={(config[key] as string) ?? ''}
              onChange={(e) => onChange({ ...config, [key]: e.target.value })}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Arkaplan Teması</label>
        <select
          value={(config.bgVariant as string) ?? 'light'}
          onChange={(e) => onChange({ ...config, bgVariant: e.target.value })}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        >
          {bgOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <p className="text-xs text-neutral-400">
        💡 Adımlar ve istatistikler varsayılan olarak görünür. İlerleyen sürümde özelleştirilebilir.
      </p>
    </div>
  )
}

// ─── Listings Module Config Editor ────────────────────────────────────────────

function ListingsModuleConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (updated: Record<string, unknown>) => void
}) {
  const filterOptions = [
    { value: 'all', label: '🗂️ Tümü' },
    { value: 'new', label: '✨ Yeni İlanlar' },
    { value: 'discounted', label: '🏷️ İndirimli İlanlar' },
    { value: 'campaign', label: '📣 Kampanyalı İlanlar' },
  ]

  const fields = [
    { key: 'title', label: 'Başlık', placeholder: 'Yeni İlanlar' },
    { key: 'subheading', label: 'Alt Başlık', placeholder: 'Son eklenen ilanlar' },
    { key: 'viewAllHref', label: '"Tümünü Gör" Linki', placeholder: '/oteller/all' },
    { key: 'viewAllLabel', label: '"Tümünü Gör" Butonu Metni', placeholder: 'Tümünü Gör' },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">İçerik</p>
        {fields.map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
            <input
              type="text"
              placeholder={placeholder}
              value={(config[key] as string) ?? ''}
              onChange={(e) => onChange({ ...config, [key]: e.target.value })}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Filtre & Görünüm</p>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">İlan Filtresi</label>
          <select
            value={(config.filterMode as string) ?? 'all'}
            onChange={(e) => onChange({ ...config, filterMode: e.target.value })}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            {filterOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Gösterilecek İlan Sayısı</label>
          <input
            type="number"
            min={2}
            max={20}
            value={(config.count as number) ?? 8}
            onChange={(e) => onChange({ ...config, count: Number(e.target.value) })}
            className="w-28 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={(config.showTabs as boolean) === true}
            onChange={(e) => onChange({ ...config, showTabs: e.target.checked })}
            className="h-4 w-4 rounded accent-primary-600"
          />
          Sekme filtrelerini göster (Tümü / Yeni / İndirimli / Kampanyalı)
        </label>
      </div>

      <p className="text-xs text-neutral-400">
        💡 Birden fazla <strong>İlan Grid/Slider</strong> modülü ekleyerek farklı filtreli bölümler oluşturabilirsiniz.
      </p>
    </div>
  )
}

// ─── Video Gallery Config Editor ──────────────────────────────────────────────

interface VideoItemDraft {
  id: string
  title: string
  videoUrl: string
  thumbnail: string
}

function VideoGalleryConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (updated: Record<string, unknown>) => void
}) {
  const videos: VideoItemDraft[] = Array.isArray(config.videos)
    ? (config.videos as VideoItemDraft[])
    : []

  function updateMeta(key: 'title' | 'subtitle', val: string) {
    onChange({ ...config, [key]: val })
  }

  function updateVideo(index: number, field: keyof VideoItemDraft, val: string) {
    const next = videos.map((v, i) => (i === index ? { ...v, [field]: val } : v))
    onChange({ ...config, videos: next })
  }

  function addVideo() {
    const next: VideoItemDraft = {
      id: `v-${Date.now()}`,
      title: 'Yeni Video',
      videoUrl: '',
      thumbnail: '',
    }
    onChange({ ...config, videos: [...videos, next] })
  }

  function removeVideo(index: number) {
    onChange({ ...config, videos: videos.filter((_, i) => i !== index) })
  }

  function moveVideo(index: number, dir: 'up' | 'down') {
    const next = [...videos]
    const target = dir === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange({ ...config, videos: next })
  }

  const inputCls =
    'w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'

  return (
    <div className="space-y-5">
      {/* Bölüm başlığı */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Başlık</label>
          <input
            type="text"
            value={(config.title as string) ?? ''}
            onChange={(e) => updateMeta('title', e.target.value)}
            placeholder="🎬 Videolar"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Alt Başlık</label>
          <input
            type="text"
            value={(config.subtitle as string) ?? ''}
            onChange={(e) => updateMeta('subtitle', e.target.value)}
            placeholder="Kısa açıklama…"
            className={inputCls}
          />
        </div>
      </div>

      {/* Video listesi */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Videolar ({videos.length})
          </span>
          <button
            type="button"
            onClick={addVideo}
            className="flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
          >
            <Plus className="h-3.5 w-3.5" /> Video Ekle
          </button>
        </div>

        {videos.length === 0 && (
          <p className="rounded-lg bg-neutral-50 px-4 py-3 text-xs text-neutral-400 dark:bg-neutral-800">
            Henüz video eklenmedi. "Video Ekle" butonuna tıklayın.
          </p>
        )}

        {videos.map((v, i) => (
          <div
            key={v.id}
            className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Video {i + 1}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveVideo(i, 'up')}
                  disabled={i === 0}
                  className="rounded p-0.5 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-700"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveVideo(i, 'down')}
                  disabled={i === videos.length - 1}
                  className="rounded p-0.5 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-700"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeVideo(i)}
                  className="rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-500">Video Başlığı</label>
                <input
                  type="text"
                  value={v.title}
                  onChange={(e) => updateVideo(i, 'title', e.target.value)}
                  placeholder="Örn: Kapadokya Balon Turu"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-500">
                  YouTube / Vimeo URL{' '}
                  <span className="text-neutral-400">(örn: https://youtube.com/watch?v=…)</span>
                </label>
                <input
                  type="url"
                  value={v.videoUrl}
                  onChange={(e) => updateVideo(i, 'videoUrl', e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-500">
                  Kapak Resmi URL{' '}
                  <span className="text-neutral-400">(boş bırakılırsa YouTube'dan otomatik alınır)</span>
                </label>
                <input
                  type="url"
                  value={v.thumbnail}
                  onChange={(e) => updateVideo(i, 'thumbnail', e.target.value)}
                  placeholder="https://… (opsiyonel)"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-neutral-400">
        💡 İlk video büyük öne çıkan video olarak gösterilir. Sırasını değiştirmek için yukarı/aşağı oklarını kullanın.
      </p>
    </div>
  )
}

// ─── Image + Text Config Editor ───────────────────────────────────────────────

function ImageTextConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (updated: Record<string, unknown>) => void
}) {
  const inputCls = 'rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 w-full'

  const fields = [
    { key: 'title', label: 'Başlık', placeholder: 'Neden bizi seçmelisiniz?' },
    { key: 'subtitle', label: 'Alt Başlık', placeholder: 'Öne çıkan avantajlarımız' },
    { key: 'content', label: 'Açıklama Metni', placeholder: 'Detaylı açıklama buraya gelecek...' },
    { key: 'badge', label: 'Rozet (isteğe bağlı)', placeholder: 'ÖNERİLEN' },
    { key: 'imageUrl', label: 'Görsel URL', placeholder: 'https://...' },
    { key: 'imageAlt', label: 'Görsel Alt Metni', placeholder: 'Görsel açıklaması' },
    { key: 'ctaText', label: 'Ana Buton Metni', placeholder: 'Keşfet' },
    { key: 'ctaHref', label: 'Ana Buton Linki', placeholder: '/kategori' },
    { key: 'ctaSecondaryText', label: 'İkincil Buton Metni', placeholder: 'Daha Fazla' },
    { key: 'ctaSecondaryHref', label: 'İkincil Buton Linki', placeholder: '/hakkimizda' },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">İçerik</p>
        {fields.map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
            <input
              type="text"
              placeholder={placeholder}
              value={(config[key] as string) ?? ''}
              onChange={(e) => onChange({ ...config, [key]: e.target.value })}
              className={inputCls}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Görsel Konumu</label>
          <select
            value={(config.imagePosition as string) ?? 'left'}
            onChange={(e) => onChange({ ...config, imagePosition: e.target.value })}
            className={inputCls}
          >
            <option value="left">Sol</option>
            <option value="right">Sağ</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Arkaplan Stili</label>
          <select
            value={(config.backgroundStyle as string) ?? 'white'}
            onChange={(e) => onChange({ ...config, backgroundStyle: e.target.value })}
            className={inputCls}
          >
            <option value="white">Beyaz</option>
            <option value="light">Açık Gri</option>
            <option value="dark">Koyu</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// ─── Destination Cards Config Editor ──────────────────────────────────────────

function DestinationCardsConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (updated: Record<string, unknown>) => void
}) {
  const inputCls = 'rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 w-full'
  const cards = Array.isArray(config.cards) ? (config.cards as Array<Record<string, string>>) : []

  function updateCard(i: number, key: string, value: string) {
    const updated = [...cards]
    updated[i] = { ...updated[i], [key]: value }
    onChange({ ...config, cards: updated })
  }

  function addCard() {
    onChange({ ...config, cards: [...cards, { name: '', imageUrl: '', href: '', description: '', listingCount: '' }] })
  }

  function removeCard(i: number) {
    onChange({ ...config, cards: cards.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Genel</p>
        {[
          { key: 'title', label: 'Başlık', placeholder: 'Popüler Destinasyonlar' },
          { key: 'subtitle', label: 'Alt Başlık', placeholder: 'Keşfetmeyi beklediğiniz güzelliklere göz atın' },
          { key: 'viewAllHref', label: '"Tümünü Gör" Linki', placeholder: '/destinasyonlar' },
          { key: 'viewAllLabel', label: '"Tümünü Gör" Metni', placeholder: 'Tüm Destinasyonlar' },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
            <input
              type="text"
              placeholder={placeholder}
              value={(config[key] as string) ?? ''}
              onChange={(e) => onChange({ ...config, [key]: e.target.value })}
              className={inputCls}
            />
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Sütun Sayısı</label>
          <select
            value={String(config.columns ?? 3)}
            onChange={(e) => onChange({ ...config, columns: Number(e.target.value) })}
            className={inputCls}
          >
            <option value="2">2 Sütun</option>
            <option value="3">3 Sütun</option>
            <option value="4">4 Sütun</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Kartlar ({cards.length})</p>
          <button
            type="button"
            onClick={addCard}
            className="flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
          >
            <Plus className="h-3.5 w-3.5" /> Destinasyon Ekle
          </button>
        </div>

        {cards.length === 0 && (
          <p className="rounded-lg bg-neutral-50 px-4 py-3 text-xs text-neutral-400 dark:bg-neutral-800">
            Kart eklenmedi. Varsayılan destinasyonlar gösterilecek.
          </p>
        )}

        {cards.map((card, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-2 dark:border-neutral-700 dark:bg-neutral-800/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-500">Kart {i + 1}</span>
              <button type="button" onClick={() => removeCard(i)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {[
              { key: 'name', placeholder: 'İstanbul' },
              { key: 'description', placeholder: 'Tarihin ve modernliğin buluştuğu şehir' },
              { key: 'imageUrl', placeholder: 'https://images.pexels.com/...' },
              { key: 'href', placeholder: '/destinasyonlar/istanbul' },
              { key: 'listingCount', placeholder: '248' },
            ].map(({ key, placeholder }) => (
              <input
                key={key}
                type="text"
                placeholder={`${key}: ${placeholder}`}
                value={card[key] ?? ''}
                onChange={(e) => updateCard(i, key, e.target.value)}
                className={inputCls}
              />
            ))}
          </div>
        ))}
      </div>

      <p className="text-xs text-neutral-400">
        💡 Kartlar boş bırakılırsa varsayılan Türkiye destinasyonları gösterilir.
      </p>
    </div>
  )
}

// ─── Partners Config Editor ────────────────────────────────────────────────────

function PartnersConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (updated: Record<string, unknown>) => void
}) {
  const inputCls = 'rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 w-full'
  const items = Array.isArray(config.items) ? (config.items as Array<Record<string, string>>) : []

  function updateItem(i: number, key: string, value: string) {
    const updated = [...items]
    updated[i] = { ...updated[i], [key]: value }
    onChange({ ...config, items: updated })
  }

  function addItem() {
    onChange({ ...config, items: [...items, { name: '', logoUrl: '', href: '' }] })
  }

  function removeItem(i: number) {
    onChange({ ...config, items: items.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Genel</p>
        {[
          { key: 'title', label: 'Başlık', placeholder: 'Partnerlerimiz' },
          { key: 'subtitle', label: 'Alt Başlık', placeholder: 'Güvenilir iş ortaklarımızla birlikte çalışıyoruz' },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
            <input
              type="text"
              placeholder={placeholder}
              value={(config[key] as string) ?? ''}
              onChange={(e) => onChange({ ...config, [key]: e.target.value })}
              className={inputCls}
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Düzen</label>
            <select
              value={(config.layout as string) ?? 'strip'}
              onChange={(e) => onChange({ ...config, layout: e.target.value })}
              className={inputCls}
            >
              <option value="strip">Yatay Şerit</option>
              <option value="grid">Izgara</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Arkaplan</label>
            <select
              value={(config.backgroundStyle as string) ?? 'light'}
              onChange={(e) => onChange({ ...config, backgroundStyle: e.target.value })}
              className={inputCls}
            >
              <option value="white">Şeffaf</option>
              <option value="light">Açık Gri</option>
              <option value="bordered">Çerçeveli</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showNames"
            checked={(config.showNames as boolean) ?? false}
            onChange={(e) => onChange({ ...config, showNames: e.target.checked })}
            className="h-4 w-4 rounded accent-primary-600"
          />
          <label htmlFor="showNames" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Logo altında isim göster
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Partnerler ({items.length})</p>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
          >
            <Plus className="h-3.5 w-3.5" /> Partner Ekle
          </button>
        </div>

        {items.length === 0 && (
          <p className="rounded-lg bg-neutral-50 px-4 py-3 text-xs text-neutral-400 dark:bg-neutral-800">
            Partner eklenmedi. Varsayılan logolar gösterilecek.
          </p>
        )}

        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-2 dark:border-neutral-700 dark:bg-neutral-800/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-500">{item.name || `Partner ${i + 1}`}</span>
              <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {[
              { key: 'name', placeholder: 'Şirket Adı' },
              { key: 'logoUrl', placeholder: 'https://... logo URL' },
              { key: 'href', placeholder: 'https://partner-site.com (isteğe bağlı)' },
            ].map(({ key, placeholder }) => (
              <input
                key={key}
                type="text"
                placeholder={placeholder}
                value={item[key] ?? ''}
                onChange={(e) => updateItem(i, key, e.target.value)}
                className={inputCls}
              />
            ))}
          </div>
        ))}
      </div>

      <p className="text-xs text-neutral-400">
        💡 Logo listesi boş bırakılırsa demo partnerler gösterilir.
      </p>
    </div>
  )
}

// ─── Config field editor ───────────────────────────────────────────────────────

function ConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (updated: Record<string, unknown>) => void
}) {
  const entries = Object.entries(config)

  function updateField(key: string, value: unknown) {
    onChange({ ...config, [key]: value })
  }

  if (entries.length === 0) {
    return <p className="text-xs text-neutral-400">Bu modülün yapılandırma alanı yok.</p>
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, val]) => {
        const isBoolean = typeof val === 'boolean'
        const isNumber = typeof val === 'number'
        return (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 capitalize">
              {key.replace(/_/g, ' ')}
            </label>
            {isBoolean ? (
              <input
                type="checkbox"
                checked={val}
                onChange={(e) => updateField(key, e.target.checked)}
                className="h-4 w-4 rounded accent-primary-600"
              />
            ) : isNumber ? (
              <input
                type="number"
                value={val}
                onChange={(e) => updateField(key, Number(e.target.value))}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            ) : (
              <input
                type="text"
                value={String(val ?? '')}
                onChange={(e) => updateField(key, e.target.value)}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Module Row ────────────────────────────────────────────────────────────────

function ModuleRow({
  module,
  index,
  total,
  categorySlug,
  onToggle,
  onMove,
  onDelete,
  onConfigChange,
}: {
  module: PageBuilderModule
  index: number
  total: number
  categorySlug: string
  onToggle: (id: string) => void
  onMove: (id: string, dir: 'up' | 'down') => void
  onDelete: (id: string) => void
  onConfigChange: (id: string, config: Record<string, unknown>) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = MODULE_CATALOG.find((m) => m.type === module.type)

  return (
    <div
      className={`rounded-xl border transition-colors ${
        module.enabled
          ? 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
          : 'border-neutral-100 bg-neutral-50 opacity-60 dark:border-neutral-800 dark:bg-neutral-950'
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        <GripVertical className="h-4 w-4 text-neutral-300 shrink-0 cursor-grab" />

        <span className="text-lg">{meta?.emoji ?? '📦'}</span>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-neutral-900 dark:text-white">{meta?.label ?? module.type}</div>
          <div className="text-xs text-neutral-400 truncate">{meta?.description}</div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onMove(module.id, 'up')}
            disabled={index === 0}
            className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
            title="Yukarı taşı"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => onMove(module.id, 'down')}
            disabled={index === total - 1}
            className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
            title="Aşağı taşı"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => onToggle(module.id)}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title={module.enabled ? 'Gizle' : 'Göster'}
          >
            {module.enabled ? (
              <Eye className="h-4 w-4 text-primary-600" />
            ) : (
              <EyeOff className="h-4 w-4 text-neutral-400" />
            )}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Ayarlar"
          >
            <Settings className="h-4 w-4 text-neutral-500" />
          </button>
          <button
            onClick={() => onDelete(module.id)}
            className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 dark:hover:bg-red-900/20"
            title="Kaldır"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-neutral-100 p-4 dark:border-neutral-800">
          {module.type === 'hero' ? (
            <HeroConfigEditor
              config={module.config as Record<string, unknown>}
              categorySlug={categorySlug}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'featured_by_region' ? (
            <FeaturedByRegionConfigEditor
              config={module.config as Record<string, unknown>}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'top_providers' ? (
            <TopProvidersConfigEditor
              config={module.config as Record<string, unknown>}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'become_provider' ? (
            <BecomeProviderConfigEditor
              config={module.config as Record<string, unknown>}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : (module.type === 'listings_grid' || module.type === 'listings_slider') ? (
            <ListingsModuleConfigEditor
              config={module.config as Record<string, unknown>}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'video_gallery' ? (
            <VideoGalleryConfigEditor
              config={module.config as Record<string, unknown>}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'image_text' ? (
            <ImageTextConfigEditor
              config={module.config as Record<string, unknown>}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'destination_cards' ? (
            <DestinationCardsConfigEditor
              config={module.config as Record<string, unknown>}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'partners' ? (
            <PartnersConfigEditor
              config={module.config as Record<string, unknown>}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : (
            <ConfigEditor
              config={module.config as Record<string, unknown>}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add Module Dialog ────────────────────────────────────────────────────────

function AddModuleDialog({
  onAdd,
  onClose,
}: {
  onAdd: (type: PageBuilderModuleType) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Modül Ekle</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {MODULE_CATALOG.map((m) => (
            <button
              key={m.type}
              onClick={() => { onAdd(m.type); onClose() }}
              className="flex w-full items-center gap-3 rounded-xl border border-neutral-100 p-3 text-left transition hover:border-primary-200 hover:bg-primary-50 dark:border-neutral-800 dark:hover:bg-primary-900/20"
            >
              <span className="text-xl">{m.emoji}</span>
              <div>
                <div className="font-medium text-sm text-neutral-900 dark:text-white">{m.label}</div>
                <div className="text-xs text-neutral-400">{m.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CategoryPageBuilderClient({ presetSlug }: { presetSlug?: string } = {}) {
  const [categories, setCategories] = useState<CategoryInfo[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string>(presetSlug ?? '')
  const [modules, setModules] = useState<PageBuilderModule[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Load category list (only when no presetSlug)
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

  // Load modules when category changes
  useEffect(() => {
    if (!selectedSlug) return
    setLoading(true)
    fetch(`/api/page-builder?slug=${selectedSlug}`)
      .then((r) => r.json())
      .then((data: { ok: boolean; config: { modules: PageBuilderModule[] } }) => {
        if (data.ok) setModules(data.config.modules)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedSlug])

  const handleToggle = useCallback((id: string) => {
    setModules((prev) => prev.map((m) => m.id === id ? { ...m, enabled: !m.enabled } : m))
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

  const handleConfigChange = useCallback((id: string, config: Record<string, unknown>) => {
    setModules((prev) => prev.map((m) => m.id === id ? { ...m, config } : m))
  }, [])

  const handleAddModule = useCallback((type: PageBuilderModuleType) => {
    const defaultConfigs: Record<PageBuilderModuleType, Record<string, unknown>> = {
      hero: { heading: '', subheading: '', images: ['', '', ''], showSearchForm: true },
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
      listings_grid: { title: 'Yeni İlanlar', subheading: 'Son eklenen ilanlar', filterMode: 'new', showTabs: false, count: 8, viewAllHref: `/${selectedSlug}/all`, viewAllLabel: 'Tümünü Gör' },
      listings_slider: { title: 'İndirimli İlanlar', subheading: 'Özel fiyatlı seçenekler', filterMode: 'discounted', showTabs: false, count: 8, viewAllHref: `/${selectedSlug}/all`, viewAllLabel: 'Tümünü Gör' },
      categories_grid: { title: 'Destinasyonlar', layout: 'grid' },
      promo_banner: { title: 'Kampanya', description: '', ctaText: 'İncele', ctaHref: '#' },
      text_block: { title: '', content: '', align: 'left' },
      image_text: { title: '', content: '', imageUrl: '', imagePosition: 'left' },
      stats: { title: '' },
      why_us: { title: 'Neden Bizi Seçin?' },
      testimonials: { title: 'Müşteri Yorumları' },
      newsletter: { title: 'Bültene Abone Ol' },
      faq: { title: 'Sıkça Sorulan Sorular' },
      become_provider: {
        heading: 'İlanınızı Ekleyin, Kazanmaya Başlayın',
        subheading: 'Otel, tur, tatil evi, tekne, araç kiralama — ne sunarsanız sunun, milyonlarca gezgine ulaşmanın en kolay yolu burada.',
        ctaText: 'Ücretsiz İlan Ver',
        ctaHref: '/manage',
        secondaryCtaText: 'Nasıl Çalışır?',
        secondaryCtaHref: '/about',
        bgVariant: 'light',
      },
      destination_cards: { title: 'Destinasyonlar', count: 6 },
      partners: { title: 'Partnerlerimiz' },
      video_gallery: {
        title: '🎬 Videolar',
        subtitle: 'En yeni destinasyonları ve deneyimleri keşfedin.',
        videos: [
          { id: 'v1', title: 'Tanıtım Videosu', videoUrl: '', thumbnail: '' },
        ],
      },
      category_slider: { heading: '', subheading: '', cardType: 'card3', slice: 'first6' },
      gezi_onerileri: {},
      featured_places: { heading: '', subHeading: '', viewAllHref: `/${selectedSlug}/all` },
      how_it_works: { title: '', subheading: '' },
      category_grid: { heading: '', subheading: '' },
      section_videos: { heading: '', subheading: '' },
      client_say: { heading: '', subHeading: '' },
      search_results: { perPage: 24 },
    }

    const newModule: PageBuilderModule = {
      id: `${selectedSlug}-${type}-${Date.now()}`,
      type,
      enabled: true,
      order: modules.length + 1,
      config: defaultConfigs[type] ?? {},
    }
    setModules((prev) => [...prev, newModule])
  }, [selectedSlug, modules.length])

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
        setMsg({ ok: true, text: '✓ Kaydedildi. Değişiklikler kategori sayfasına yansıtıldı.' })
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
    // Reload default
    setLoading(true)
    fetch(`/api/page-builder?slug=${selectedSlug}`)
      .then((r) => r.json())
      .then((data: { ok: boolean; config: { modules: PageBuilderModule[] } }) => {
        if (data.ok) setModules(data.config.modules)
        setMsg({ ok: true, text: 'Varsayılan ayarlara döndürüldü.' })
      })
      .finally(() => setLoading(false))
  }

  const selectedCat = categories.find((c) => c.slug === selectedSlug)
  const isPreset = !!presetSlug

  return (
    <div className={`flex flex-col gap-6 ${isPreset ? '' : 'lg:flex-row lg:items-start'}`}>
      {/* Category Selector — hidden in preset mode */}
      {!isPreset && (
        <aside className="w-full shrink-0 lg:w-64">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            {/* Special pages */}
            {categories.some((c) => c.isSpecial) && (
              <>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  Özel Sayfalar
                </p>
                <div className="mb-3 space-y-1">
                  {categories.filter((c) => c.isSpecial).map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => { setSelectedSlug(cat.slug); setMsg(null) }}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                        selectedSlug === cat.slug
                          ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                          : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span className="flex-1 truncate">{cat.name}</span>
                      {cat.hasCustomConfig && (
                        <span className="h-2 w-2 rounded-full bg-primary-500 shrink-0" title="Özelleştirilmiş" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="mb-3 border-t border-neutral-100 dark:border-neutral-800" />
              </>
            )}
            {/* Category pages */}
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              Kategori Sayfaları
            </p>
            <div className="space-y-1">
              {categories.filter((c) => !c.isSpecial).map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => { setSelectedSlug(cat.slug); setMsg(null) }}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                    selectedSlug === cat.slug
                      ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span className="flex-1 truncate">{cat.name}</span>
                  {cat.hasCustomConfig && (
                    <span className="h-2 w-2 rounded-full bg-primary-500 shrink-0" title="Özelleştirilmiş" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* Module Editor */}
      <div className="flex-1 min-w-0">
        {/* Header */}
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
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <RotateCcw className="h-4 w-4" />
              Varsayılana Sıfırla
            </button>
            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
            >
              <Plus className="h-4 w-4" />
              Modül Ekle
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </button>
          </div>
        </div>

        {/* Status message */}
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

        {/* Preview link */}
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

        {/* Module list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-300" />
          </div>
        ) : (
          <div className="space-y-3">
            {modules.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-neutral-200 p-10 text-center text-neutral-400 dark:border-neutral-700">
                Modül yok. "Modül Ekle" butonuna tıklayarak başlayın.
              </div>
            )}
            {modules.map((module, index) => (
              <ModuleRow
                key={module.id}
                module={module}
                index={index}
                total={modules.length}
                categorySlug={selectedSlug}
                onToggle={handleToggle}
                onMove={handleMove}
                onDelete={handleDelete}
                onConfigChange={handleConfigChange}
              />
            ))}
          </div>
        )}

        {/* Guide */}
        <div className="mt-8 rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          <p className="font-medium mb-2 text-neutral-700 dark:text-neutral-300">💡 Nasıl Çalışır?</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Modülleri yukarı/aşağı oklar ile sıralayın</li>
            <li>Göz ikonu ile modülleri göster/gizle</li>
            <li>Dişli ikonu ile modül ayarlarını düzenleyin</li>
            <li>"Kaydet" ile değişikliklerinizi yayınlayın</li>
            <li>Her kategorinin kendi bağımsız sayfa düzeni vardır</li>
          </ul>
        </div>
      </div>

      {/* Add Module Dialog */}
      {showAddDialog && (
        <AddModuleDialog onAdd={handleAddModule} onClose={() => setShowAddDialog(false)} />
      )}
    </div>
  )
}
