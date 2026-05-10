'use client'

import type { ImageTextModuleConfig } from '@/components/page-builder/modules/ImageTextModule'
import ImageUpload from '@/components/editor/ImageUpload'
import { slugifyMediaSegment } from '@/lib/upload-media-paths'
import { HeadingSubheadingFields, PB_TEXT_INPUT_CLS, SectionFieldsTitle } from './section-fields'

const asRec = (c: object) => c as Record<string, unknown>

export function ImageTextConfigEditor({
  config,
  onChange,
  pageSlug,
}: {
  config: ImageTextModuleConfig
  onChange: (updated: ImageTextModuleConfig) => void
  pageSlug: string
}) {
  const fields = [
    { key: 'content', label: 'Açıklama Metni', placeholder: 'Detaylı açıklama buraya gelecek...' },
    { key: 'badge', label: 'Rozet (isteğe bağlı)', placeholder: 'ÖNERİLEN' },
    { key: 'imageAlt', label: 'Görsel Alt Metni', placeholder: 'Görsel açıklaması' },
    { key: 'ctaText', label: 'Ana Buton Metni', placeholder: 'Keşfet' },
    { key: 'ctaHref', label: 'Ana Buton Linki', placeholder: '/kategori' },
    { key: 'ctaSecondaryText', label: 'İkincil Buton Metni', placeholder: 'Daha Fazla' },
    { key: 'ctaSecondaryHref', label: 'İkincil Buton Linki', placeholder: '/hakkimizda' },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <SectionFieldsTitle>İçerik</SectionFieldsTitle>
        <HeadingSubheadingFields
          config={asRec(config)}
          onChange={(u) => onChange(u as ImageTextModuleConfig)}
          headingKey="title"
          subheadingKey="subtitle"
          layout="stack"
          placeholders={{
            heading: 'Neden bizi seçmelisiniz?',
            subheading: 'Öne çıkan avantajlarımız',
          }}
        />
        {fields.map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
            <input
              type="text"
              placeholder={placeholder}
              value={String(config[key as keyof ImageTextModuleConfig] ?? '')}
              onChange={(e) =>
                onChange({ ...config, [key]: e.target.value } as ImageTextModuleConfig)
              }
              className={PB_TEXT_INPUT_CLS}
            />
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Görsel</label>
          <ImageUpload
            value={config.imageUrl ?? ''}
            onChange={(url) => onChange({ ...config, imageUrl: url })}
            folder="site"
            subPath={`page-builder/image-text/${slugifyMediaSegment(pageSlug)}`}
            prefix="block"
            useOriginalStem
            aspectRatio="16/9"
            placeholder="Görsel — galeri veya sürükle-bırak"
          />
          <details className="rounded-lg border border-neutral-200 bg-neutral-50/80 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900/40">
            <summary className="cursor-pointer text-[11px] font-medium text-neutral-500">Harici görsel URL</summary>
            <input
              type="url"
              placeholder="https://..."
              value={config.imageUrl ?? ''}
              onChange={(e) => onChange({ ...config, imageUrl: e.target.value })}
              className={`${PB_TEXT_INPUT_CLS} mt-2`}
            />
          </details>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Görsel Konumu</label>
          <select
            value={config.imagePosition ?? 'left'}
            onChange={(e) =>
              onChange({
                ...config,
                imagePosition: e.target.value as ImageTextModuleConfig['imagePosition'],
              })
            }
            className={PB_TEXT_INPUT_CLS}
          >
            <option value="left">Sol</option>
            <option value="right">Sağ</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Arkaplan Stili</label>
          <select
            value={config.backgroundStyle ?? 'white'}
            onChange={(e) =>
              onChange({
                ...config,
                backgroundStyle: e.target.value as ImageTextModuleConfig['backgroundStyle'],
              })
            }
            className={PB_TEXT_INPUT_CLS}
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
