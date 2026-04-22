'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import Link from 'next/link'

export default function SeoLinksClient() {
  const vitrinPath = useVitrinHref()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Link yönetimi</h1>
        <p className="mt-1 text-sm text-neutral-500">
          İç ve dış bağlantı stratejisi; teknik yönlendirmeler ve kırık URL’ler için aşağıdaki araçları kullanın.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={vitrinPath('/manage/seo/redirects')}
          className="rounded-2xl border border-neutral-200 bg-white p-5 hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-900/40"
        >
          <h2 className="font-semibold text-neutral-900 dark:text-white">301 yönlendirmeler</h2>
          <p className="mt-2 text-sm text-neutral-500">Eski URL’leri kalıcı olarak yeni adrese taşıyın.</p>
        </Link>
        <Link
          href={vitrinPath('/manage/seo/404')}
          className="rounded-2xl border border-neutral-200 bg-white p-5 hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-900/40"
        >
          <h2 className="font-semibold text-neutral-900 dark:text-white">404 günlüğü</h2>
          <p className="mt-2 text-sm text-neutral-500">Sık istenen kırık yolları tespit edin.</p>
        </Link>
        <Link
          href={vitrinPath('/manage/content/pages')}
          className="rounded-2xl border border-neutral-200 bg-white p-5 hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-900/40"
        >
          <h2 className="font-semibold text-neutral-900 dark:text-white">CMS sayfaları</h2>
          <p className="mt-2 text-sm text-neutral-500">Statik sayfa slug’ları ve iç bağlantılar.</p>
        </Link>
        <Link
          href={vitrinPath('/manage/content/blog')}
          className="rounded-2xl border border-neutral-200 bg-white p-5 hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-900/40"
        >
          <h2 className="font-semibold text-neutral-900 dark:text-white">Blog</h2>
          <p className="mt-2 text-sm text-neutral-500">Konu kümelenen içerik ve dahili linkler.</p>
        </Link>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 text-sm text-blue-950 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-100">
        <p className="font-medium">İyi uygulamalar</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Önemli sayfalara menü ve footer üzerinden bağlantı verin.</li>
          <li>Aynı konuyu hedefleyen çok sayıda ince sayfa yerine güçlü bir hub sayfası kullanın.</li>
          <li>Silinen veya taşınan URL’ler için 301 kullanın; 404 günlüğünü düzenli kontrol edin.</li>
        </ul>
      </div>
    </div>
  )
}
