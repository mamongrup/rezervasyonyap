'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import Link from 'next/link'

const CARDS: { href: string; title: string; desc: string }[] = [
  {
    href: '/manage/seo/sitemap',
    title: 'Site haritası',
    desc: 'Yayın içerik özeti ve API üzerinden XML sitemap bağlantısı.',
  },
  {
    href: '/manage/seo/redirects',
    title: '301 yönlendirmeler',
    desc: 'Eski URL’leri yeni adreslere yönlendirin.',
  },
  {
    href: '/manage/seo/404',
    title: '404 yönetimi',
    desc: 'Kırık yol günlüğü; sık istekleri yönlendirmeye dönüştürün.',
  },
  {
    href: '/manage/seo/rich-snippets',
    title: 'Rich snippets',
    desc: 'İlan, sayfa veya yazı için schema.org JSON-LD önizleme ve düzenleme.',
  },
  {
    href: '/manage/seo/merchant',
    title: 'Google Merchant',
    desc: 'Ürün feed’i ve Merchant Center için yönlendirmeler.',
  },
  {
    href: '/manage/seo/links',
    title: 'Link stratejisi',
    desc: 'İç/dış bağlantı ve içerik öbekleri.',
  },
]

export default function SeoOverviewClient() {
  const vitrinPath = useVitrinHref()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">SEO genel</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Meta başlık/açıklama ve robots kuralları çoğunlukla sayfa veya ilan bazında (
          <code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">seo_metadata</code>) ve çeviri
          katmanında yönetilir. Burada site haritası, yönlendirme ve 404 günlüğü araçları toplanmıştır.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300">
        <p>
          <strong>robots.txt</strong> ve kök <strong>sitemap.xml</strong> genelde Next.js üretim çıktısı ve{' '}
          <code className="rounded bg-white px-1 font-mono text-xs dark:bg-neutral-800">NEXT_PUBLIC_SITE_URL</code>{' '}
          ile ilişkilidir. Ham veri özeti aşağıdaki &quot;Site haritası&quot; ve API{' '}
          <code className="rounded bg-white px-1 font-mono text-xs dark:bg-neutral-800">/api/v1/seo/sitemap.xml</code>{' '}
          uçlarından gelir.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={vitrinPath(c.href)}
            className="group rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-primary-300 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-900/40 dark:hover:border-primary-700"
          >
            <h2 className="font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
              {c.title}
            </h2>
            <p className="mt-2 text-sm text-neutral-500">{c.desc}</p>
          </Link>
        ))}
      </div>

      <p className="text-sm text-neutral-500">
        Gelişmiş site ayarları:{' '}
        <Link
          href={vitrinPath('/manage/admin/settings?tab=seo')}
          className="font-medium text-primary-600 underline dark:text-primary-400"
        >
          Yönetici → Ayarlar → SEO
        </Link>
        .
      </p>
    </div>
  )
}
