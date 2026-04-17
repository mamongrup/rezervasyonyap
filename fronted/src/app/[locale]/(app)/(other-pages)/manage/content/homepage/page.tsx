import { Metadata } from 'next'
import CategoryPageBuilderClient from '../page-builder/CategoryPageBuilderClient'

export const metadata: Metadata = {
  title: 'Ana Sayfa Düzenleyici — Page Builder',
}

export default function HomepageBuilderPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Ana Sayfa Düzenleyici</h1>
        <p className="mt-1.5 text-neutral-500 dark:text-neutral-400">
          Ana sayfanın modüler yapısını düzenleyin. Hero bölümü, öne çıkan ilanlar, kategoriler ve daha fazlasını
          buradan yönetin.
        </p>
      </div>
      <CategoryPageBuilderClient presetSlug="homepage" />
    </div>
  )
}
