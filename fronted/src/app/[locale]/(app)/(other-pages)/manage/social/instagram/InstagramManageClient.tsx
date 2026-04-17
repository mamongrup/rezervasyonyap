'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  createInstagramShopLink,
  deleteInstagramShopLink,
  listInstagramShopLinks,
  patchInstagramShopLink,
  type InstagramShopLink,
} from '@/lib/travel-api'
import clsx from 'clsx'
import { ExternalLink, Instagram, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useState, type FormEvent } from 'react'

export default function InstagramManageClient() {
  const vitrinPath = useVitrinHref()

  const socialSettingsHref = vitrinPath('/manage/admin/marketing/social')
  const integrationsHref = vitrinPath('/manage/admin/settings/integrations')

  const [listingFilter, setListingFilter] = useState('')
  const [links, setLinks] = useState<InstagramShopLink[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [newListingId, setNewListingId] = useState('')
  const [newMediaId, setNewMediaId] = useState('')
  const [newSync, setNewSync] = useState(true)
  const [saving, setSaving] = useState(false)

  const activeListingId = listingFilter.trim()

  const fetchLinks = useCallback(async (listingId: string) => {
    const token = getStoredAuthToken()
    if (!token || !listingId.trim()) {
      setErr('Önce geçerli bir ilan UUID girin.')
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const r = await listInstagramShopLinks(listingId.trim(), token)
      setLinks(r.links)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Yükleme hatası')
      setLinks([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadLinks = useCallback(() => {
    void fetchLinks(activeListingId)
  }, [fetchLinks, activeListingId])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || !newListingId.trim() || !newMediaId.trim()) {
      setErr('İlan UUID ve Instagram media ID zorunlu.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const lid = newListingId.trim()
      await createInstagramShopLink(token, {
        listing_id: lid,
        instagram_media_id: newMediaId.trim(),
        sync_enabled: newSync,
      })
      setNewMediaId('')
      setListingFilter(lid)
      await fetchLinks(lid)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Kayıt hatası')
    } finally {
      setSaving(false)
    }
  }

  async function toggleSync(link: InstagramShopLink) {
    const token = getStoredAuthToken()
    if (!token) return
    setErr(null)
    try {
      await patchInstagramShopLink(token, link.id, { sync_enabled: !link.sync_enabled })
      await fetchLinks(activeListingId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Güncellenemedi')
    }
  }

  async function remove(link: InstagramShopLink) {
    if (!confirm('Bu bağlantıyı silmek istiyor musunuz?')) return
    const token = getStoredAuthToken()
    if (!token) return
    setErr(null)
    try {
      await deleteInstagramShopLink(token, link.id)
      await fetchLinks(activeListingId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Silinemedi')
    }
  }

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-pink-50/90 to-white p-6 dark:border-neutral-800 dark:from-pink-950/20 dark:to-neutral-900/80">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-md">
            <Instagram className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Instagram</h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              <strong>Shop bağlantıları</strong>, katalogdaki bir ilanı Meta&apos;daki bir gönderi / ürün medya kimliği ile
              eşler; senkron açıksa stok veya görünürlük güncellemeleri bu ilişki üzerinden takip edilebilir.{' '}
              <strong>API anahtarları ve sayfa token&apos;ları</strong> aşağıdaki bağlantıdaki Meta ayarlarından yönetilir —
              bu sayfa yalnızca ilan eşlemesidir.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={socialSettingsHref}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Meta / Instagram API ayarları
              </Link>
              <Link
                href={integrationsHref}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Genel entegrasyonlar
              </Link>
            </div>
          </div>
        </div>
      </header>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </div>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">İlan için Shop bağlantıları</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Katalogdan ilan UUID&apos;nizi kopyalayın; bu ilana bağlı Instagram medya eşlemelerini listeleyebilir veya yeni kayıt
          ekleyebilirsiniz.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[min(100%,320px)] flex-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">İlan UUID</label>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-950"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={listingFilter}
              onChange={(e) => setListingFilter(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={loading || !activeListingId}
            onClick={() => void loadLinks()}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Listele
          </button>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-100 dark:border-neutral-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 dark:bg-neutral-950/80 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3">Instagram media ID</th>
                <th className="px-4 py-3">Senkron</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {links.length === 0 && !loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-neutral-400">
                    {activeListingId
                      ? 'Bu ilan için kayıtlı bağlantı yok. Aşağıdan ekleyebilirsiniz.'
                      : 'Listelemek için ilan UUID girin.'}
                  </td>
                </tr>
              ) : (
                links.map((l) => (
                  <tr key={l.id} className="bg-white dark:bg-neutral-900/40">
                    <td className="px-4 py-3 font-mono text-xs text-neutral-800 dark:text-neutral-200">{l.instagram_media_id}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void toggleSync(l)}
                        className={clsx(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          l.sync_enabled
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
                        )}
                      >
                        {l.sync_enabled ? 'Açık' : 'Kapalı'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void remove(l)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Sil
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Yeni bağlantı ekle</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Meta Business / Instagram Commerce tarafındaki medya kimliğini girin. İlan ID&apos;si katalogdaki kayıtla eşleşmelidir.
        </p>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={(e) => void onCreate(e)}>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">İlan UUID</label>
            <input
              required
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-950"
              value={newListingId}
              onChange={(e) => setNewListingId(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Instagram media ID</label>
            <input
              required
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-950"
              placeholder="Meta katalog / gönderi kimliği"
              value={newMediaId}
              onChange={(e) => setNewMediaId(e.target.value)}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 md:col-span-2">
            <input type="checkbox" checked={newSync} onChange={(e) => setNewSync(e.target.checked)} className="rounded border-neutral-300" />
            Senkronizasyonu aç
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-500"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Kaydet
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
