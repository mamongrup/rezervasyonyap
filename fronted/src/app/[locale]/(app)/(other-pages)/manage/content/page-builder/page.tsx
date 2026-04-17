import { Metadata } from 'next'
import CategoryPageBuilderClient from './CategoryPageBuilderClient'

export const metadata: Metadata = {
  title: 'Sayfa Düzenleyici — Kategori & Arama Sayfaları',
}

export default function PageBuilderPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Sayfa Düzenleyici
        </h1>
        <p className="mt-1.5 text-neutral-500 dark:text-neutral-400">
          Ana sayfa, arama sayfası ve tüm kategori sayfalarının (Oteller, Turlar, Yatlar…) bölüm
          düzenini buradan yönetin. Sol taraftan bir sayfa seçin, modülleri sıralayın, açın/kapatın
          veya ayarlarını düzenleyin.
        </p>
      </div>
      <CategoryPageBuilderClient />
    </div>
  )
}
