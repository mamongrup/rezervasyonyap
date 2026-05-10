'use client'

import type { BecomeProviderModuleConfig } from '@/components/page-builder/modules/BecomeProviderModule'
import type {
  ListingFilterMode,
  ListingsModuleConfig,
} from '@/components/page-builder/modules/ListingsModule'
import type { TopProvidersModuleConfig } from '@/components/page-builder/modules/TopProvidersModule'
import Link from 'next/link'
import { HeadingSubheadingFields, SectionFieldsTitle, SimpleTextFieldRow } from './section-fields'

const asRec = (c: object) => c as Record<string, unknown>

export function TopProvidersConfigEditor({
  config,
  onChange,
}: {
  config: TopProvidersModuleConfig
  onChange: (updated: TopProvidersModuleConfig) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <SectionFieldsTitle>Bölüm Metinleri</SectionFieldsTitle>
        <HeadingSubheadingFields
          config={asRec(config)}
          onChange={(u) => onChange(u as TopProvidersModuleConfig)}
          headingKey="heading"
          subheadingKey="subheading"
          layout="stack"
          placeholders={{
            heading: 'En Başarılı İlan Sahipleri',
            subheading: 'Tüm kategorilerde en yüksek puan alan...',
          }}
        />
        <SimpleTextFieldRow
          label="Buton Metni"
          placeholder="Siz de ilan verin"
          value={config.ctaText ?? ''}
          onChange={(next) => onChange({ ...config, ctaText: next })}
        />
        <SimpleTextFieldRow
          label="Buton Linki"
          placeholder="/manage"
          value={config.ctaHref ?? ''}
          onChange={(next) => onChange({ ...config, ctaHref: next })}
        />
      </div>
      <div className="space-y-3">
        <SectionFieldsTitle>Görünüm</SectionFieldsTitle>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Maksimum gösterilen kişi
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={config.maxCount ?? 10}
            onChange={(e) => onChange({ ...config, maxCount: Number(e.target.value) })}
            className="w-28 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={config.showCategoryFilter !== false}
            onChange={(e) => onChange({ ...config, showCategoryFilter: e.target.checked })}
            className="h-4 w-4 rounded accent-primary-600"
          />
          Kategori filtresi göster
        </label>
      </div>
      <p className="text-xs text-neutral-400">
        💡 İlan sahipleri puan ortalamasına ve ilan sayısına göre otomatik sıralanır. İlan verilerini{' '}
        <Link href="/manage/admin" className="text-primary-600 hover:underline">
          Yönetim Paneli
        </Link>{' '}
        üzerinden güncelleyebilirsiniz.
      </p>
    </div>
  )
}

export function BecomeProviderConfigEditor({
  config,
  onChange,
}: {
  config: BecomeProviderModuleConfig
  onChange: (updated: BecomeProviderModuleConfig) => void
}) {
  const bgOptions = [
    { value: 'light', label: 'Açık (varsayılan)' },
    { value: 'gradient', label: 'Gradyan' },
    { value: 'dark', label: 'Koyu' },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <SectionFieldsTitle>İçerik</SectionFieldsTitle>
        <HeadingSubheadingFields
          config={asRec(config)}
          onChange={(u) => onChange(u as BecomeProviderModuleConfig)}
          headingKey="heading"
          subheadingKey="subheading"
          layout="stack"
          labels={{ subheading: 'Alt Başlık / Açıklama' }}
          placeholders={{
            heading: 'İlanınızı Ekleyin, Kazanmaya Başlayın',
            subheading: 'Milyonlarca gezgine ulaşın...',
          }}
        />
        <SimpleTextFieldRow
          label="Ana Buton Metni"
          placeholder="Ücretsiz İlan Ver"
          value={config.ctaText ?? ''}
          onChange={(next) => onChange({ ...config, ctaText: next })}
        />
        <SimpleTextFieldRow
          label="Ana Buton Linki"
          placeholder="/manage"
          value={config.ctaHref ?? ''}
          onChange={(next) => onChange({ ...config, ctaHref: next })}
        />
        <SimpleTextFieldRow
          label="İkincil Buton Metni"
          placeholder="Nasıl Çalışır?"
          value={config.secondaryCtaText ?? ''}
          onChange={(next) => onChange({ ...config, secondaryCtaText: next })}
        />
        <SimpleTextFieldRow
          label="İkincil Buton Linki"
          placeholder="/about"
          value={config.secondaryCtaHref ?? ''}
          onChange={(next) => onChange({ ...config, secondaryCtaHref: next })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Arkaplan Teması</label>
        <select
          value={config.bgVariant ?? 'light'}
          onChange={(e) =>
            onChange({
              ...config,
              bgVariant: e.target.value as BecomeProviderModuleConfig['bgVariant'],
            })
          }
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
        >
          {bgOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-neutral-400">
        💡 Adımlar ve istatistikler varsayılan olarak görünür. İlerleyen sürümde özelleştirilebilir.
      </p>
    </div>
  )
}

export function ListingsModuleConfigEditor({
  config,
  onChange,
}: {
  config: ListingsModuleConfig
  onChange: (updated: ListingsModuleConfig) => void
}) {
  const filterOptions = [
    { value: 'all', label: '🗂️ Tümü' },
    { value: 'new', label: '✨ Yeni İlanlar' },
    { value: 'discounted', label: '🏷️ İndirimli İlanlar' },
    { value: 'campaign', label: '📣 Kampanyalı İlanlar' },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <SectionFieldsTitle>İçerik</SectionFieldsTitle>
        <HeadingSubheadingFields
          config={asRec(config)}
          onChange={(u) => onChange(u as ListingsModuleConfig)}
          headingKey="title"
          subheadingKey="subheading"
          layout="stack"
          labels={{ heading: 'Başlık' }}
          placeholders={{
            heading: 'Yeni İlanlar',
            subheading: 'Son eklenen ilanlar',
          }}
        />
        <SimpleTextFieldRow
          label='"Tümünü Gör" Linki'
          placeholder="/oteller/all"
          value={config.viewAllHref ?? ''}
          onChange={(next) => onChange({ ...config, viewAllHref: next })}
        />
        <SimpleTextFieldRow
          label='"Tümünü Gör" Butonu Metni'
          placeholder="Tümünü Gör"
          value={config.viewAllLabel ?? ''}
          onChange={(next) => onChange({ ...config, viewAllLabel: next })}
        />
      </div>

      <div className="space-y-3">
        <SectionFieldsTitle>Filtre & Görünüm</SectionFieldsTitle>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">İlan Filtresi</label>
          <select
            value={config.filterMode ?? 'all'}
            onChange={(e) =>
              onChange({ ...config, filterMode: e.target.value as ListingFilterMode })
            }
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            {filterOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Gösterilecek İlan Sayısı</label>
          <input
            type="number"
            min={2}
            max={20}
            value={config.count ?? 8}
            onChange={(e) => onChange({ ...config, count: Number(e.target.value) })}
            className="w-28 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={config.showTabs === true}
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
