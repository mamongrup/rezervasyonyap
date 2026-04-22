'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  listAgencyAnnouncements,
  listSupplierAnnouncements,
  type PortalAnnouncement,
} from '@/lib/travel-api'
import { Loader2, Megaphone } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export default function PortalAnnouncementsClient({ portal }: { portal: 'supplier' | 'agency' }) {
  const [items, setItems] = useState<PortalAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setErr('Oturum bulunamadı.')
      setLoading(false)
      return
    }
    setErr(null)
    setLoading(true)
    try {
      const r =
        portal === 'supplier'
          ? await listSupplierAnnouncements(token)
          : await listAgencyAnnouncements(token)
      setItems(r.announcements)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Yükleme hatası')
    } finally {
      setLoading(false)
    }
  }, [portal])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
        <Megaphone className="h-7 w-7 text-primary-500" />
        Yönetici duyuruları
      </h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Platform yönetiminden size iletilen güncel duyurular.
      </p>

      {err ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-neutral-400">
          <Loader2 className="h-6 w-6 animate-spin" /> Yükleniyor…
        </div>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-400">Gösterilecek duyuru yok.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <p className="font-semibold text-neutral-900 dark:text-white">{a.title}</p>
              <p className="mt-1 text-xs text-neutral-400">
                {a.created_at}
                {a.expires_at ? ` · Geçerlilik: ${a.expires_at}` : ''}
                {a.created_by_label ? ` · ${a.created_by_label}` : ''}
              </p>
              {a.body ? (
                <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">{a.body}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
