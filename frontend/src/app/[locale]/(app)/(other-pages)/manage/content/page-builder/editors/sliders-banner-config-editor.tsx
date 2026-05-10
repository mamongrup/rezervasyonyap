'use client'

import type { SlidersBannerModuleConfig } from '@/components/page-builder/modules/SlidersBannerModule'

export function SlidersBannerConfigEditor({
  config,
  defaultPageKey,
  onChange,
}: {
  config: SlidersBannerModuleConfig
  defaultPageKey: string
  onChange: (updated: SlidersBannerModuleConfig) => void
}) {
  const pageKey = String(config.pageKey ?? '')
  const effective = pageKey || defaultPageKey
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Slayt kaynağı (pageKey)
        </label>
        <input
          type="text"
          value={pageKey}
          placeholder={defaultPageKey || 'homepage'}
          onChange={(e) => onChange({ ...config, pageKey: e.target.value })}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
        />
        <p className="mt-1 text-xs text-neutral-400">
          Boş bırakırsanız bu sayfanın anahtarı kullanılır:{' '}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">{defaultPageKey}</code>
        </p>
      </div>
      <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
        Slaytları{' '}
        <a
          href="/manage/content/sliders"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline"
        >
          İçerik → Slider & banner
        </a>{' '}
        sayfasından düzenleyin. Geçerli kaynak:{' '}
        <code className="rounded bg-white/70 px-1 dark:bg-neutral-900">{effective}</code>
      </div>
    </div>
  )
}
