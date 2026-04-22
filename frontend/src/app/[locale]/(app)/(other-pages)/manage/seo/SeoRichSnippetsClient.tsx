'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { listSeoSchema, upsertSeoSchema, type StructuredSnippet } from '@/lib/travel-api'
import Link from 'next/link'
import { useState } from 'react'

const ENTITY_TYPES = [
  { value: 'listing', label: 'İlan (listing)' },
  { value: 'cms_page', label: 'CMS sayfa' },
  { value: 'blog_post', label: 'Blog yazısı' },
]

export default function SeoRichSnippetsClient() {
  const vitrinPath = useVitrinHref()
  const [entityType, setEntityType] = useState('listing')
  const [entityId, setEntityId] = useState('')
  const [snippets, setSnippets] = useState<StructuredSnippet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [schemaType, setSchemaType] = useState('Product')
  const [jsonLd, setJsonLd] = useState('{\n  "@context": "https://schema.org",\n  "@type": "Product"\n}')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  async function loadSnippets() {
    const eid = entityId.trim()
    if (!eid) {
      setError('Varlık UUID girin')
      return
    }
    setLoading(true)
    setError(null)
    setSnippets([])
    try {
      const r = await listSeoSchema({ entity_type: entityType, entity_id: eid })
      setSnippets(Array.isArray(r.snippets) ? r.snippets : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yükleme başarısız')
    } finally {
      setLoading(false)
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) {
      setSaveMsg('Oturum gerekli')
      return
    }
    const eid = entityId.trim()
    const st = schemaType.trim()
    const raw = jsonLd.trim()
    if (!eid || !st || !raw) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await upsertSeoSchema(
        {
          entity_type: entityType,
          entity_id: eid,
          schema_type: st,
          json_ld: raw,
        },
        token,
      )
      setSaveMsg('Kaydedildi.')
      await loadSnippets()
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Rich snippets (JSON-LD)</h1>
        <p className="mt-1 text-sm text-neutral-500">
          <code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">structured_data_snippets</code> tablosu
          varlık başına <strong>schema_type</strong> ile birden fazla kayıt tutar. Önizleme herkese açık GET; kayıt
          yönetici oturumu ister.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Varlık türü</label>
            <select
              className="w-full rounded-xl border border-neutral-200 p-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            >
              {ENTITY_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Varlık UUID</label>
            <input
              className="w-full rounded-xl border border-neutral-200 p-2.5 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-900"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadSnippets()}
          disabled={loading}
          className="mt-4 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Yükleniyor…' : 'Snippet’ları yükle'}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {snippets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Mevcut kayıtlar</h2>
          {snippets.map((s, i) => (
            <div key={`${s.schema_type}-${i}`} className="rounded-xl border border-neutral-200 dark:border-neutral-700">
              <div className="border-b border-neutral-200 px-3 py-2 text-sm font-medium dark:border-neutral-700">
                {s.schema_type}{' '}
                <span className="text-xs font-normal text-neutral-500">— {s.updated_at}</span>
              </div>
              <pre className="max-h-64 overflow-auto p-3 text-xs text-neutral-800 dark:text-neutral-200">{s.json_ld}</pre>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={(e) => void onSave(e)} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">Yeni / güncelle</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Aynı varlık UUID ve türü kullanın. <code className="font-mono text-xs">json_ld</code> geçerli JSON metni
          olmalıdır.
        </p>
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">Schema türü</label>
          <input
            className="w-full max-w-md rounded-xl border border-neutral-200 p-2.5 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-900"
            value={schemaType}
            onChange={(e) => setSchemaType(e.target.value)}
            placeholder="Product, FAQPage, …"
          />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">JSON-LD</label>
          <textarea
            className="h-48 w-full rounded-xl border border-neutral-200 p-3 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
            value={jsonLd}
            onChange={(e) => setJsonLd(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={saving || !entityId.trim()}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {saveMsg && <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{saveMsg}</p>}
      </form>

      <p className="text-sm text-neutral-500">
        İlan veya içerik ID’lerini katalog veya CMS ekranlarından kopyalayın:{' '}
        <Link href={vitrinPath('/manage/catalog')} className="text-primary-600 underline dark:text-primary-400">
          Katalog
        </Link>
        ,{' '}
        <Link href={vitrinPath('/manage/content/pages')} className="text-primary-600 underline dark:text-primary-400">
          CMS sayfaları
        </Link>
        .
      </p>
    </div>
  )
}
