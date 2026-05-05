import type { Metadata } from 'next'
import CategoryImagesClient from './CategoryImagesClient'

export const metadata: Metadata = {
  title: 'Kategori Resimleri — İçerik',
}

export default function CategoryImagesPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Kategori Resimleri</h1>
        <p className="mt-1.5 text-neutral-500 dark:text-neutral-400">
          On iki seyahat kategorisi için ortak kart görsellerini tek yerden yönetin; slider ve grid modüllerinde
          özelleştirme yoksa bu görseller kullanılır.
        </p>
      </div>
      <CategoryImagesClient />
    </div>
  )
}
