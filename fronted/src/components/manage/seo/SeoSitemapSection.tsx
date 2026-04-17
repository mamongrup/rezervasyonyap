'use client'

import { getSeoSitemapEntries, type SitemapEntry } from '@/lib/travel-api'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { detailPathForVertical } from '@/lib/listing-detail-routes'
import { useCallback, useEffect, useState } from 'react'

const SITEMAP_PREVIEW = 200

function pathHintForSitemapEntry(e: SitemapEntry): string {
  switch (e.kind) {
    case 'listing': {
      const code = normalizeCatalogVertical(e.category_code ?? undefined)
      const base = detailPathForVertical(code)
      return `${base}/${e.slug}`
    }
    case 'cms_page':
      return `/p/${e.slug}`
    case 'blog_post':
      return `/blog/${e.slug}`
    default:
      return `/${e.slug}`
  }
}

export default function SeoSitemapSection() {
  const vitrinPath = useVitrinHref()
  const [smEntries, setSmEntries] = useState<SitemapEntry[]>([])
  const [smErr, setSmErr] = useState<string | null>(null)
  const [smLoading, setSmLoading] = useState(false)

  const reloadSitemapPreview = useCallback(async () => {
    setSmErr(null)
    setSmLoading(true)
    try {
      const s = await getSeoSitemapEntries()
      setSmEntries(s.entries)
    } catch (e) {
      setSmErr(e instanceof Error ? e.message : 'sitemap_preview_failed')
    } finally {
      setSmLoading(false)
    }
  }, [])

  useEffect(() => {
    void reloadSitemapPreview()
  }, [reloadSitemapPreview])

  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')
  const sitemapXmlHref = apiBase ? `${apiBase}/api/v1/seo/sitemap.xml` : ''

  return (
    <section
      id="admin-seo-block"
      className="scroll-mt-24 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-white">Site haritası (özet)</h2>
        <div className="flex flex-wrap items-center gap-3">
          {sitemapXmlHref ? (
            <a
              href={sitemapXmlHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary-600 underline dark:text-primary-400"
            >
              sitemap.xml (API)
            </a>
          ) : null}
          <button
            type="button"
            disabled={smLoading}
            onClick={() => void reloadSitemapPreview()}
            className="text-sm font-medium text-primary-600 underline disabled:opacity-50 dark:text-primary-400"
          >
            {smLoading ? '…' : 'Yenile'}
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Yayınlanmış içeriklerin JSON listesi (API ile aynı kaynak). Ön yüzde çok dilli yollar{' '}
        <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">/[locale]/…</code> ile
        kullanılır; tabloda tr örneği gösterilir. Üretimde genelde{' '}
        <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">/sitemap.xml</code> (
        <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">NEXT_PUBLIC_SITE_URL</code>{' '}
        + her dil) kullanılır.
      </p>
      {smErr ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{smErr}</p> : null}
      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
        Toplam {smEntries.length} kayıt
        {smEntries.length > SITEMAP_PREVIEW ? ` — ilk ${SITEMAP_PREVIEW} satır aşağıda` : ''}.
      </p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
              <th className="px-3 py-2 font-medium">Tür</th>
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 font-medium">Kurum ID</th>
              <th className="px-3 py-2 font-medium">Örnek (tr)</th>
            </tr>
          </thead>
          <tbody>
            {smLoading && smEntries.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={4}>
                  Yükleniyor…
                </td>
              </tr>
            ) : smEntries.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={4}>
                  Kayıt yok veya API yapılandırılmadı.
                </td>
              </tr>
            ) : (
              smEntries.slice(0, SITEMAP_PREVIEW).map((row, i) => {
                const hint = pathHintForSitemapEntry(row)
                return (
                  <tr key={`${row.kind}-${row.slug}-${i}`} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-3 py-2 font-mono text-xs">{row.kind}</td>
                    <td className="max-w-[12rem] truncate px-3 py-2 font-mono text-xs" title={row.slug}>
                      {row.slug}
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-2 font-mono text-xs text-neutral-600 dark:text-neutral-400" title={row.organization_id}>
                      {row.organization_id || '—'}
                    </td>
                    <td className="max-w-md truncate px-3 py-2 font-mono text-xs" title={vitrinPath(hint)}>
                      {vitrinPath(hint)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
