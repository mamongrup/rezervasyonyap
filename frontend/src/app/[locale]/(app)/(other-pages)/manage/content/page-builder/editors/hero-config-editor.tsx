'use client'

import type { HeroModuleConfig } from '@/types/page-builder-module'
import { ManageMediaPickerModal } from '@/components/manage/ManageMediaPickerModal'
import { managePanelUploadPreviewSrc } from '@/lib/site-upload-browser-href'
import { slugifyMediaSegment } from '@/lib/upload-media-paths'
import { ImageIcon, Upload } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { HeadingSubheadingFields, LocalizedTextFieldRow, PB_FIELD_LABEL_CLS, PB_TEXT_INPUT_CLS, SectionFieldsTitle } from './section-fields'

const asRec = (c: object) => c as Record<string, unknown>

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
  const [pickerOpen, setPickerOpen] = useState(false)
  const uploadTarget = useMemo(
    () =>
      ({
        folder: 'site',
        subPath: `vitrin-kategori/${slugifyMediaSegment(categorySlug)}`,
        prefix: 'slide',
        index: String(slot + 1),
      }) as const,
    [categorySlug, slot],
  )

  return (
    <div className="flex flex-col gap-2">
      <ManageMediaPickerModal
        open={pickerOpen}
        title={`${label} — görsel seç`}
        uploadTarget={uploadTarget}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => onChange(url)}
      />
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{label}</span>
          <span className="ms-1.5 text-xs text-neutral-400">{description}</span>
        </div>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-red-500 hover:text-red-700"
            title="Görseli kaldır"
          >
            Kaldır
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className={`relative flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          value
            ? 'border-primary-300 bg-neutral-50 dark:bg-neutral-800'
            : 'border-neutral-200 bg-neutral-50 hover:border-primary-300 hover:bg-primary-50/30 dark:border-neutral-700 dark:bg-neutral-800'
        }`}
        onClick={() => setPickerOpen(true)}
      >
        {value ? (
          <>
            <img
              src={managePanelUploadPreviewSrc(value)}
              alt={label}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
              <Upload className="h-6 w-6 text-white" />
              <span className="ms-2 text-sm font-medium text-white">Galeriden seç / yükle</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-neutral-400">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">Galeriden seç veya yükle</span>
            <span className="text-[10px]">JPEG, PNG, WebP, AVIF</span>
          </div>
        )}
      </button>

      <input
        type="text"
        placeholder="İleri düzey: harici URL yapıştırın…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 placeholder-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
      />
    </div>
  )
}

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

export function HeroConfigEditor({
  config,
  categorySlug,
  onChange,
}: {
  config: HeroModuleConfig
  categorySlug: string
  onChange: (updated: HeroModuleConfig) => void
}) {
  const configRef = useRef(config)
  useLayoutEffect(() => {
    configRef.current = config
  }, [config])

  const images = normalizeHeroImages(config.images)
  const rec = asRec(config)

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
      <div className="space-y-3">
        <SectionFieldsTitle>Metin İçeriği</SectionFieldsTitle>
        {categorySlug === 'homepage' ? (
          <p className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs font-medium text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            Ana sayfa hero metinleri ve vitrin bağlantıları üstteki «Ana Sayfa Düzenleyici» (Hero) ekranından yönetilir;
            başlık / alt metin / buton otel vitrinine yönlendirilir.
          </p>
        ) : (
          <p className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs font-medium text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            Ön yüzde hero başlığı ve istatistik satırı bu kategorinin «tüm ilanlar» vitrinine (
            <code className="rounded bg-white/80 px-1 dark:bg-neutral-900">/all</code>) yönlendirir.
          </p>
        )}
        <HeadingSubheadingFields
          config={asRec(config)}
          onChange={(u) => onChange(u as HeroModuleConfig)}
          headingKey="heading"
          subheadingKey="subheading"
          layout="stack"
          subheadingAsTextarea
          labels={{
            heading: 'Başlık (boş bırakılırsa kategori adı kullanılır)',
            subheading: 'Alt Başlık (boş bırakılırsa kategori açıklaması kullanılır)',
          }}
          placeholders={{
            heading: 'ör. Hayalinizdeki Otel',
            subheading: "ör. Türkiye'nin en iyi otellerinde konforlu bir konaklama…",
          }}
        />
      </div>

      <div className="space-y-3">
        <SectionFieldsTitle>Buton (İsteğe Bağlı)</SectionFieldsTitle>
        <LocalizedTextFieldRow
          label="Buton Metni"
          placeholder="ör. Otelleri Keşfet"
          value={rec.ctaText}
          onChange={(next) => onChange({ ...(rec as HeroModuleConfig), ctaText: next as unknown as string })}
          inputClassName={PB_TEXT_INPUT_CLS}
        />
        <div className="flex flex-col gap-1">
          <label className={PB_FIELD_LABEL_CLS}>Buton Linki</label>
          <input
            type="text"
            placeholder="ör. /oteller veya https://..."
            value={config.ctaHref ?? ''}
            onChange={(e) => onChange({ ...config, ctaHref: e.target.value })}
            className={PB_TEXT_INPUT_CLS}
          />
        </div>
        <p className="text-xs text-neutral-400">Boş bırakılırsa buton gösterilmez.</p>
      </div>

      <div className="space-y-3">
        <SectionFieldsTitle>Görünüm ve arka plan</SectionFieldsTitle>
        <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
          <div className="flex flex-col gap-1">
            <label className={PB_FIELD_LABEL_CLS}>Hero düzeni</label>
            <select
              value={config.style ?? 'full'}
              onChange={(e) =>
                onChange({
                  ...config,
                  style: e.target.value as HeroModuleConfig['style'],
                })
              }
              className={PB_TEXT_INPUT_CLS}
            >
              <option value="full">Tam (yüksek)</option>
              <option value="compact">Kompakt</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>
          {categorySlug === 'homepage' ? (
            <label className="flex items-center gap-2 pb-1 text-sm text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={config.hideVerticalTabs === true}
                onChange={(e) => onChange({ ...config, hideVerticalTabs: e.target.checked })}
                className="h-4 w-4 rounded accent-primary-600"
              />
              Dikey kategori sekmelerini gizle
            </label>
          ) : (
            <span className="hidden sm:block" aria-hidden />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className={PB_FIELD_LABEL_CLS}>Arka plan görseli URL (isteğe bağlı)</label>
          <input
            type="text"
            value={config.backgroundUrl ?? ''}
            onChange={(e) =>
              onChange({
                ...config,
                backgroundUrl: e.target.value.trim() ? e.target.value.trim() : undefined,
              })
            }
            className={PB_TEXT_INPUT_CLS}
            placeholder="Boşsa gradient; tek görsel tam genişlik hero"
          />
        </div>
        {config.backgroundUrl ? (
          <div className="flex flex-col gap-1">
            <label className={PB_FIELD_LABEL_CLS}>
              Karartma katmanı: {(config.overlayOpacity ?? 0.45).toFixed(2)}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.overlayOpacity ?? 0.45}
              onChange={(e) =>
                onChange({ ...config, overlayOpacity: Number(e.target.value) })
              }
              className="w-full accent-primary-600"
            />
          </div>
        ) : null}
        <p className="text-xs text-neutral-400">
          Üstteki üç mozaik görsel ile birlikte kullanılabilir; URL doldurursanız gradient üzerine fotoğraf bindirilir.
        </p>
      </div>

      <div>
        <SectionFieldsTitle className="mb-3">Hero Görselleri (3 parça mozaik)</SectionFieldsTitle>
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
          Masaüstünde bölge / anasayfa ile aynı üç parçalı mozaik: sol üst, sol alt ve sağ kolon. Boş slotlar kategori
          varsayılan görseliyle dolar.
        </p>
      </div>
    </div>
  )
}
