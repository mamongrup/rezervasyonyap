'use client'

import type { CategorySliderModuleConfig } from '@/components/page-builder/modules/CategorySliderModule'
import type { RegionSliderModuleConfig } from '@/components/page-builder/modules/RegionSliderModule'
import { CategoryThumbnailsGridSection } from '@/components/manage/TravelCategoryThumbnailsGrid'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { HeadingSubheadingFields, PB_TEXT_INPUT_CLS, SectionFieldsTitle } from './section-fields'
import { CATEGORY_CARD_TYPE_OPTIONS, CATEGORY_SLICE_OPTIONS } from './module-catalog'

const asRec = (c: object) => c as Record<string, unknown>

export function CategoryCardsConfigEditor({
  config,
  onChange,
}: {
  config: Partial<CategorySliderModuleConfig>
  onChange: (updated: Partial<CategorySliderModuleConfig>) => void
}) {
  const thumbnailConfig =
    config.categoryThumbnails && typeof config.categoryThumbnails === 'object' && !Array.isArray(config.categoryThumbnails)
      ? (config.categoryThumbnails as Record<string, unknown>)
      : {}

  function updateField<K extends keyof CategorySliderModuleConfig>(key: K, value: CategorySliderModuleConfig[K]) {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="space-y-5">
      <HeadingSubheadingFields
        config={asRec(config)}
        onChange={(u) => onChange(u as Partial<CategorySliderModuleConfig>)}
        headingKey="heading"
        subheadingKey="subheading"
      />

      {'cardType' in config || 'slice' in config ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Kart Tipi</label>
            <select
              value={config.cardType ?? 'card3'}
              onChange={(e) => updateField('cardType', e.target.value)}
              className={PB_TEXT_INPUT_CLS}
            >
              {CATEGORY_CARD_TYPE_OPTIONS.map((option, index) => (
                <option key={option.value} value={option.value}>
                  {index + 1}/{CATEGORY_CARD_TYPE_OPTIONS.length} - {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Kategori aralığı</label>
            <select
              value={config.slice ?? 'first6'}
              onChange={(e) =>
                updateField(
                  'slice',
                  e.target.value as NonNullable<CategorySliderModuleConfig['slice']>,
                )
              }
              className={PB_TEXT_INPUT_CLS}
            >
              {CATEGORY_SLICE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Yayınlanacak kategori sayısı
            </label>
            <input
              type="number"
              min={1}
              max={CATEGORY_REGISTRY.length}
              value={
                typeof config.categoryLimit === 'number' && Number.isFinite(config.categoryLimit)
                  ? config.categoryLimit
                  : ''
              }
              placeholder={
                (config.slice as string) === 'all'
                  ? `Boş = tümü (${CATEGORY_REGISTRY.length})`
                  : (config.slice as string) === 'last6'
                    ? 'Boş = 7–12. sıra (eski davranış)'
                    : 'Boş = 6'
              }
              onChange={(e) => {
                const t = e.target.value.trim()
                if (t === '') {
                  updateField('categoryLimit', undefined)
                  return
                }
                const num = parseInt(t, 10)
                if (!Number.isFinite(num) || num < 1) {
                  updateField('categoryLimit', undefined)
                  return
                }
                updateField('categoryLimit', Math.min(num, CATEGORY_REGISTRY.length))
              }}
              className={`max-w-xs ${PB_TEXT_INPUT_CLS}`}
            />
            <p className="text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
              <strong>Baştan:</strong> boş bırakırsanız 6 kart.{' '}
              <strong>Sondan / 7–12:</strong> boş bırakırsanız eski düzen (yalnızca 7–12. sıradakiler); bir sayı
              girerseniz listenin <em>sonundan</em> o kadar gösterilir. <strong>Tümü:</strong> boşta kayıttaki bütün
              kategoriler; sayı girilirse en fazla o kadar.
            </p>
          </div>
        </div>
      ) : null}

      <CategoryThumbnailsGridSection
        thumbnails={thumbnailConfig}
        onThumbnailsChange={(next) => onChange({ ...config, categoryThumbnails: next })}
        description="Bu modülde doldurduğunuz görsel bu slider/grid için önceliklidir; boş slug’larda İçerik → Kategori Resimleri, sayfadaki diğer slider/grid birleşimi ve (ana sayfada) «Kategori görselleri (paylaşımlı)» katmanları uygulanır."
      />
    </div>
  )
}

export function RegionSliderConfigEditor({
  config,
  onChange,
}: {
  config: RegionSliderModuleConfig
  onChange: (updated: RegionSliderModuleConfig) => void
}) {
  function updateField<K extends keyof RegionSliderModuleConfig>(key: K, value: RegionSliderModuleConfig[K]) {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="space-y-5">
      <HeadingSubheadingFields
        config={asRec(config)}
        onChange={(u) => onChange(u as RegionSliderModuleConfig)}
        headingKey="heading"
        subheadingKey="subheading"
      />

      <div className="space-y-3">
        <SectionFieldsTitle>Görünüm</SectionFieldsTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Kart Tipi</label>
            <select
              value={config.cardType ?? 'card3'}
              onChange={(e) =>
                updateField('cardType', e.target.value as NonNullable<RegionSliderModuleConfig['cardType']>)
              }
              className={PB_TEXT_INPUT_CLS}
            >
              {CATEGORY_CARD_TYPE_OPTIONS.map((option, index) => (
                <option key={option.value} value={option.value}>
                  {index + 1}/{CATEGORY_CARD_TYPE_OPTIONS.length} - {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Maksimum bölge sayısı
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={
                typeof config.limit === 'number' && Number.isFinite(config.limit) ? config.limit : ''
              }
              placeholder="12"
              onChange={(e) => {
                const t = e.target.value.trim()
                if (t === '') return updateField('limit', undefined)
                const n = parseInt(t, 10)
                if (!Number.isFinite(n) || n < 1) return updateField('limit', undefined)
                updateField('limit', Math.min(50, n))
              }}
              className={PB_TEXT_INPUT_CLS}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Backend kategori kodu</label>
            <input
              type="text"
              value={config.categoryCode ?? ''}
              onChange={(e) => updateField('categoryCode', e.target.value)}
              placeholder="(boş = tüm kategoriler)"
              className={PB_TEXT_INPUT_CLS}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Kategori route (link prefix)
            </label>
            <input
              type="text"
              value={config.categoryRoute ?? ''}
              onChange={(e) => updateField('categoryRoute', e.target.value)}
              placeholder="oteller (boş = /bolge/slug)"
              className={PB_TEXT_INPUT_CLS}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1 max-w-xs">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Birim etiketi</label>
          <input
            type="text"
            value={config.unit ?? ''}
            onChange={(e) => updateField('unit', e.target.value)}
            placeholder="ilan / otel / tur"
            className={PB_TEXT_INPUT_CLS}
          />
        </div>
      </div>
    </div>
  )
}
