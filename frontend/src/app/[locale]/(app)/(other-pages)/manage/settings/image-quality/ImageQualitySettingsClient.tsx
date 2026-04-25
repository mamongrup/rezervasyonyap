'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import {
  getImageUploadProfiles,
  updateImageUploadProfile,
  type ImageUploadProfile,
} from '@/lib/travel-api'
import {
  CheckCircle2,
  Image as ImageIcon,
  Info,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Klasör başına tasarım defaults — backend seed (260_image_upload_profiles.sql)
 * ile birebir aynı tutulmalıdır. "Varsayılana döndür" butonu bu değerlerle
 * PATCH atar; backend'de yeniden seed çalıştırmaya gerek kalmaz.
 */
const DEFAULTS: Record<string, Partial<ImageUploadProfile>> = {
  hero:           { width: 1440, height: 810,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb_size: 256 },
  site:           { width: 1440, height: 810,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb_size: 0 },
  regions:        { width: 1080, height: 720,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb_size: 256 },
  listings:       { width: 800,  height: 600,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb_size: 256 },
  tours:          { width: 800,  height: 600,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb_size: 256 },
  events:         { width: 800,  height: 600,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb_size: 256 },
  travel_ideas:   { width: 800,  height: 600,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb_size: 256 },
  blog:           { width: 1080, height: 566,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb_size: 0 },
  pages:          { width: 1080, height: 720,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb_size: 0 },
  icerik:         { width: 1080, height: 720,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb_size: 0 },
  general:        { width: 1080, height: 810,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb_size: 0 },
  branding:       { width: 800,  height: 600,  fit: 'inside', vivid: false, quality: 82, effort: 6, thumb_size: 0 },
  'supplier-docs':{ width: 1400, height: 2000, fit: 'inside', vivid: false, quality: 82, effort: 6, thumb_size: 0 },
}

const FOLDER_LABELS: Record<string, string> = {
  hero: 'Anasayfa Hero',
  site: 'Site Vitrin',
  regions: 'Bölgeler',
  listings: 'İlanlar',
  tours: 'Turlar',
  events: 'Etkinlikler',
  travel_ideas: 'Seyahat Fikirleri',
  blog: 'Blog',
  pages: 'Sayfalar',
  icerik: 'İçerik (inline)',
  general: 'Genel',
  branding: 'Logo / Marka',
  'supplier-docs': 'Tedarikçi Belge',
}

type RowState = ImageUploadProfile & { dirty: boolean; saving: boolean; msg?: { ok: boolean; text: string } }

function isSameAsDefault(p: ImageUploadProfile): boolean {
  const d = DEFAULTS[p.folder]
  if (!d) return false
  return (
    d.width === p.width &&
    d.height === p.height &&
    d.fit === p.fit &&
    d.vivid === p.vivid &&
    d.quality === p.quality &&
    d.effort === p.effort &&
    d.thumb_size === p.thumb_size
  )
}

function estimateKB(width: number, height: number, quality: number): number {
  /**
   * Kaba tahmin: AVIF ortalama 0.07 bit/pixel @ q60. Quality 30→95 lineer ölçek.
   * Üretim koşullarında ±%30 sapma normal; rehber niteliğinde gösterilir.
   */
  const px = width * height
  const bpp = 0.04 + (quality - 30) * (0.13 / 65)
  return Math.max(2, Math.round((px * bpp) / 8 / 1024))
}

export default function ImageQualitySettingsClient() {
  const [rows, setRows] = useState<RowState[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const data = await getImageUploadProfiles()
      setRows(data.map((r) => ({ ...r, dirty: false, saving: false })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function patchRow(folder: string, patch: Partial<ImageUploadProfile>) {
    setRows((prev) =>
      prev.map((r) =>
        r.folder === folder
          ? { ...r, ...patch, dirty: true, msg: undefined }
          : r,
      ),
    )
  }

  function resetRowToDefault(folder: string) {
    const d = DEFAULTS[folder]
    if (!d) return
    patchRow(folder, d)
  }

  async function saveRow(folder: string) {
    const row = rows.find((r) => r.folder === folder)
    if (!row) return
    setRows((prev) =>
      prev.map((r) => (r.folder === folder ? { ...r, saving: true, msg: undefined } : r)),
    )
    try {
      await updateImageUploadProfile({
        folder: row.folder,
        width: row.width,
        height: row.height,
        fit: row.fit,
        vivid: row.vivid,
        quality: row.quality,
        effort: row.effort,
        thumb_size: row.thumb_size,
      })
      setRows((prev) =>
        prev.map((r) =>
          r.folder === folder
            ? { ...r, saving: false, dirty: false, msg: { ok: true, text: 'Kaydedildi' } }
            : r,
        ),
      )
    } catch (e) {
      setRows((prev) =>
        prev.map((r) =>
          r.folder === folder
            ? {
                ...r,
                saving: false,
                msg: { ok: false, text: e instanceof Error ? e.message : 'Hata' },
              }
            : r,
        ),
      )
    }
  }

  const dirtyCount = useMemo(() => rows.filter((r) => r.dirty).length, [rows])

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Başlık */}
      <header className="border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
          Ayarlar · Medya
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
          Görsel Kalitesi & Yükleme Profilleri
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          Panelden yüklenen görseller burada tanımlı kurallara göre otomatik
          küçültülür ve <strong>AVIF</strong> formatına dönüştürülür. Kalite
          değerleri PSI / Lighthouse hedefleri için <strong>60</strong> (denge)
          olarak kalibre edilmiştir; daha yüksek değerler dosyayı büyütür.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Bilgi şeridi */}
      <aside className="flex gap-3 rounded-xl border border-blue-200/80 bg-blue-50/60 p-4 text-sm text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/25 dark:text-blue-100">
        <Info className="mt-0.5 h-5 w-5 shrink-0 opacity-80" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">Nasıl çalışır?</p>
          <ul className="list-inside list-disc text-blue-900/90 dark:text-blue-200/90">
            <li><strong>Genişlik/Yükseklik:</strong> hedef boyut. Daha büyük yüklenen görseller buna küçültülür.</li>
            <li><strong>Fit:</strong> <code>cover</code> tam doldur (fotoğraf), <code>inside</code> oranı koru (logo/belge).</li>
            <li><strong>Kalite:</strong> 60 önerilir. 70+ büyür, 50 altı bozulur.</li>
            <li><strong>Effort:</strong> AVIF encode eforu (6 = küçük dosya, biraz yavaş encode).</li>
            <li><strong>Thumb:</strong> &gt;0 ise kart/grid önizleme için kare küçük dosya üretilir (ör. 256px).</li>
          </ul>
        </div>
      </aside>

      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {dirtyCount > 0
            ? `${dirtyCount} klasörde kaydedilmemiş değişiklik var.`
            : 'Tüm değişiklikler kaydedildi.'}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Yenile
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 py-20 dark:border-neutral-700">
          <Loader2 className="h-9 w-9 animate-spin text-primary-500" aria-hidden />
          <p className="text-sm text-neutral-500">Profiller yükleniyor…</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const sameAsDefault = isSameAsDefault(row)
            const estKB = estimateKB(row.width, row.height, row.quality)

            return (
              <details
                key={row.folder}
                className="group rounded-2xl border border-neutral-200 bg-white open:shadow-sm dark:border-neutral-700 dark:bg-neutral-900/50"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                      <ImageIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {FOLDER_LABELS[row.folder] ?? row.folder}
                        </h3>
                        <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                          {row.folder}
                        </code>
                        {sameAsDefault ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Varsayılan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            <Sparkles className="h-3 w-3" /> Özel
                          </span>
                        )}
                        {row.dirty && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            kaydedilmedi
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {row.description || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="hidden shrink-0 items-center gap-3 text-xs text-neutral-500 sm:flex">
                    <span>
                      <span className="font-mono font-medium text-neutral-700 dark:text-neutral-200">
                        {row.width}×{row.height}
                      </span>
                      {' · '}q{row.quality}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[11px] dark:bg-neutral-800">
                      ~{estKB} KB
                    </span>
                    <span className="text-neutral-400 transition group-open:rotate-180">▾</span>
                  </div>
                </summary>

                <div className="grid gap-4 border-t border-neutral-100 px-5 py-5 dark:border-neutral-800 md:grid-cols-2 lg:grid-cols-3">
                  {/* Boyut */}
                  <FieldNumber
                    label="Genişlik (px)"
                    value={row.width}
                    min={64}
                    max={4096}
                    onChange={(v) => patchRow(row.folder, { width: v })}
                  />
                  <FieldNumber
                    label="Yükseklik (px)"
                    value={row.height}
                    min={64}
                    max={4096}
                    onChange={(v) => patchRow(row.folder, { height: v })}
                  />

                  {/* Fit */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Sığdırma (fit)
                    </label>
                    <select
                      value={row.fit}
                      onChange={(e) => patchRow(row.folder, { fit: e.target.value as 'cover' | 'inside' })}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                    >
                      <option value="cover">cover — tam kırp (fotoğraf)</option>
                      <option value="inside">inside — oranı koru (logo/belge)</option>
                    </select>
                  </div>

                  {/* Quality */}
                  <FieldRange
                    label={`AVIF Kalite (${row.quality})`}
                    value={row.quality}
                    min={30}
                    max={95}
                    onChange={(v) => patchRow(row.folder, { quality: v })}
                    hint="60 önerilir · 70+ dosya büyür · 50 altı bozulabilir"
                  />

                  {/* Effort */}
                  <FieldRange
                    label={`Encode Effort (${row.effort})`}
                    value={row.effort}
                    min={0}
                    max={9}
                    onChange={(v) => patchRow(row.folder, { effort: v })}
                    hint="6 = küçük dosya, hafif yavaş encode"
                  />

                  {/* Thumb */}
                  <FieldNumber
                    label="Thumbnail Boyutu (px, 0 = kapalı)"
                    value={row.thumb_size}
                    min={0}
                    max={1024}
                    onChange={(v) => patchRow(row.folder, { thumb_size: v })}
                    hint="Kart/grid önizleme için kare küçük versiyon"
                  />

                  {/* Vivid */}
                  <label className="flex items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2 dark:border-neutral-700">
                    <input
                      type="checkbox"
                      checked={row.vivid}
                      onChange={(e) => patchRow(row.folder, { vivid: e.target.checked })}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      Canlı renk boost (saturation/brightness)
                    </span>
                  </label>

                  {/* Mesaj + butonlar */}
                  <div className="md:col-span-2 lg:col-span-3">
                    {row.msg && (
                      <p
                        className={`mb-3 text-xs ${
                          row.msg.ok
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-500'
                        }`}
                      >
                        {row.msg.text}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <ButtonPrimary
                        type="button"
                        disabled={!row.dirty || row.saving}
                        onClick={() => void saveRow(row.folder)}
                      >
                        {row.saving ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor…
                          </span>
                        ) : (
                          'Kaydet'
                        )}
                      </ButtonPrimary>
                      <button
                        type="button"
                        onClick={() => resetRowToDefault(row.folder)}
                        disabled={row.saving || sameAsDefault}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Varsayılana döndür
                      </button>
                      <span className="text-xs text-neutral-500">
                        Tahmini dosya boyutu: <span className="font-mono font-semibold">~{estKB} KB</span>
                      </span>
                    </div>
                  </div>
                </div>
              </details>
            )
          })}
        </div>
      )}

      {/* Alt not */}
      <aside className="flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 opacity-80" aria-hidden />
        <div>
          <p className="font-medium">Önemli</p>
          <p className="mt-1 leading-relaxed">
            Profil değişiklikleri yalnızca <strong>yeni yüklenen</strong> görselleri etkiler.
            Mevcut dosyaları yeniden sıkıştırmak için sunucuda{' '}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/40">
              node scripts/resize-external-avifs.mjs
            </code>{' '}
            scriptini çalıştırın.
          </p>
        </div>
      </aside>
    </div>
  )
}

function FieldNumber({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  hint?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-mono focus:border-primary-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
      />
      {hint && (
        <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{hint}</p>
      )}
    </div>
  )
}

function FieldRange({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  hint?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
        {label}
      </label>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary-500"
      />
      {hint && (
        <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{hint}</p>
      )}
    </div>
  )
}
