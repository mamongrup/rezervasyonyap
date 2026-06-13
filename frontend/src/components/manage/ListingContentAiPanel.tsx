'use client'

import { CATEGORY_LABEL_TR } from '@/lib/catalog-category-ui'
import {
  getListingContentStats,
  listProductCategories,
  processNextListingContent,
  queueAllListingContent,
  resetStuckListingContent,
  type ListingContentStats,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import clsx from 'clsx'
import { Loader2, Package, RefreshCw, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'

const PRIORITY_CATEGORIES = [
  'hotel',
  'holiday_home',
  'yacht_charter',
  'ferry',
  'transfer',
] as const

export default function ListingContentAiPanel() {
  const vitrinPath = useVitrinHref()
  const [token] = useState(() => getStoredAuthToken())
  const [categories, setCategories] = useState<{ code: string; name_key: string }[]>([])
  const [categoryCode, setCategoryCode] = useState('hotel')
  const [onlyIncomplete, setOnlyIncomplete] = useState(true)
  const [overwrite, setOverwrite] = useState(false)
  const [batchLimit, setBatchLimit] = useState(10)
  const [stats, setStats] = useState<ListingContentStats | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [runErr, setRunErr] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const stopRef = useRef(false)

  const appendLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 80))
  }, [])

  const loadStats = useCallback(async () => {
    if (!token) {
      setLoadErr('Oturum bulunamadı.')
      setLoading(false)
      return
    }
    setLoadErr(null)
    try {
      const s = await getListingContentStats(token, categoryCode)
      setStats(s)
    } catch (e) {
      setLoadErr(formatManageApiCatch(e, 'listing_content_stats_failed'))
    } finally {
      setLoading(false)
    }
  }, [token, categoryCode])

  useEffect(() => {
    void listProductCategories({ active_only: true })
      .then((r) => setCategories(r.categories))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    void loadStats()
  }, [loadStats])

  async function handleQueue() {
    if (!token) return
    setRunErr(null)
    setRunning(true)
    try {
      const r = await queueAllListingContent(token, {
        category_code: categoryCode,
        only_incomplete: onlyIncomplete,
        overwrite,
      })
      appendLog(
        `Kuyruk: ${r.queued}/${r.total_found} ilan (${CATEGORY_LABEL_TR[categoryCode] ?? categoryCode})`,
      )
      if (r.message === 'no_listings_need_content') {
        appendLog('Bu kategoride işlenecek ilan bulunamadı.')
      }
      await loadStats()
    } catch (e) {
      setRunErr(formatManageApiCatch(e, 'listing_content_queue_failed'))
    } finally {
      setRunning(false)
    }
  }

  async function handleProcessLoop() {
    if (!token) return
    stopRef.current = false
    setRunning(true)
    setRunErr(null)
    let processed = 0
    let failed = 0
    const limit = Math.max(0, batchLimit)
    try {
      while (!stopRef.current && (limit === 0 || processed < limit)) {
        const r = await processNextListingContent(token, { upstreamTimeoutMs: 0 })
        if (r.done) {
          appendLog('Kuyruk boş — işlem tamamlandı.')
          break
        }
        if (r.failed) {
          failed += 1
          appendLog(`Hata [${r.phase ?? '?'}]: ${r.error ?? 'bilinmeyen'}`)
          if (r.listing_id) appendLog(`İlan: ${r.listing_id} (atlandı, devam)`)
          continue
        }
        processed += 1
        appendLog(
          `✓ ${r.listing_id?.slice(0, 8) ?? '…'} — ${r.phase ?? '?'} → ${r.next_phase ?? '?'}`,
        )
        await loadStats()
      }
      if (limit > 0 && processed >= limit) {
        appendLog(`${processed} adım işlendi (limit).`)
      }
      if (failed > 0) {
        appendLog(`${failed} ilan hata ile atlandı — yeniden «Kuyruğa al» ile deneyebilirsiniz.`)
      }
    } catch (e) {
      setRunErr(formatManageApiCatch(e, 'listing_content_process_failed'))
    } finally {
      setRunning(false)
      await loadStats()
    }
  }

  async function handleResetStuck() {
    if (!token) return
    setRunning(true)
    setRunErr(null)
    try {
      const r = await resetStuckListingContent(token)
      appendLog(`Takılı iş sıfırlandı: ${r.reset}`)
      await loadStats()
    } catch (e) {
      setRunErr(formatManageApiCatch(e, 'listing_content_reset_failed'))
    } finally {
      setRunning(false)
    }
  }

  const pendingTotal =
    (stats?.batches.pending ?? 0) + (stats?.batches.running ?? 0)
  const phasePending = stats?.pending_phases ?? {}

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-white p-5 dark:border-violet-900/60 dark:from-violet-950/30 dark:to-neutral-900">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              İlan içerik & SEO (kategori toplu)
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Seçilen kategorideki ilanlar için sırayla: Türkçe açıklama (yazım + SEO) → en, de, ru, zh, fr
              çevirisi → her dilde ayrı SEO meta başlık/açıklama.
            </p>
            <p className="mt-2 text-xs text-violet-800 dark:text-violet-300">
              DeepSeek aktif olmalı (
              <Link href={vitrinPath('/manage/admin/settings?tab=ai')} className="underline">
                Yapay zeka ayarları
              </Link>
              ).
            </p>
          </div>
        </div>
      </div>

      {loadErr && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {loadErr}
        </p>
      )}
      {runErr && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {runErr}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Kategori & seçenekler</h2>
          <div className="mt-4 space-y-4">
            <Field>
              <Label>Ürün kategorisi</Label>
              <select
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              >
                {categories.length === 0 ? (
                  PRIORITY_CATEGORIES.map((code) => (
                    <option key={code} value={code}>
                      {CATEGORY_LABEL_TR[code] ?? code}
                    </option>
                  ))
                ) : (
                  categories
                    .slice()
                    .sort((a, b) => {
                      const ai = PRIORITY_CATEGORIES.indexOf(a.code as (typeof PRIORITY_CATEGORIES)[number])
                      const bi = PRIORITY_CATEGORIES.indexOf(b.code as (typeof PRIORITY_CATEGORIES)[number])
                      const ap = ai >= 0 ? ai : 99
                      const bp = bi >= 0 ? bi : 99
                      return ap - bp
                    })
                    .map((c) => (
                      <option key={c.code} value={c.code}>
                        {CATEGORY_LABEL_TR[c.code] ?? c.name_key ?? c.code}
                      </option>
                    ))
                )}
              </select>
            </Field>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyIncomplete}
                onChange={(e) => setOnlyIncomplete(e.target.checked)}
                className="rounded border-neutral-300"
              />
              Yalnızca eksik içerikli ilanları kuyruğa al
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="rounded border-neutral-300"
              />
              Mevcut açıklama/çeviri/SEO üzerine yaz (dikkatli kullanın)
            </label>
            <Field>
              <Label>İşlem limiti (0 = sınırsız)</Label>
              <input
                type="number"
                min={0}
                max={200}
                value={batchLimit}
                onChange={(e) => setBatchLimit(Number.parseInt(e.target.value, 10) || 0)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonPrimary onClick={() => void handleQueue()} disabled={running} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Kuyruğa al
            </ButtonPrimary>
            <button
              type="button"
              onClick={() => void handleProcessLoop()}
              disabled={running}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              İşle (sıradaki)
            </button>
            <button
              type="button"
              onClick={() => {
                stopRef.current = true
              }}
              disabled={!running}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-neutral-600"
            >
              Durdur
            </button>
            <button
              type="button"
              onClick={() => void handleResetStuck()}
              disabled={running}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Takılı sıfırla
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Durum</h2>
            <button
              type="button"
              onClick={() => void loadStats()}
              className="text-xs text-violet-600 hover:underline dark:text-violet-400"
            >
              Yenile
            </button>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-neutral-500">Yükleniyor…</p>
          ) : stats ? (
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-neutral-500">Kategori ilanları</dt>
                <dd className="font-semibold">{stats.total_listings}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Eksik içerik</dt>
                <dd className="font-semibold text-amber-700 dark:text-amber-300">{stats.listings_need_work}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Kuyruk (bekleyen)</dt>
                <dd className="font-semibold">{pendingTotal}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Tamamlanan</dt>
                <dd className="font-semibold text-emerald-700 dark:text-emerald-300">{stats.batches.done ?? 0}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-neutral-500">Aşama dağılımı</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {Object.entries(phasePending).map(([phase, n]) => (
                    <span
                      key={phase}
                      className={clsx(
                        'rounded-full px-2 py-0.5 text-xs',
                        phase === 'tr_description' && 'bg-sky-100 text-sky-800',
                        phase === 'translations' && 'bg-indigo-100 text-indigo-800',
                        phase === 'seo' && 'bg-violet-100 text-violet-800',
                      )}
                    >
                      {phase}: {n}
                    </span>
                  ))}
                  {Object.keys(phasePending).length === 0 && (
                    <span className="text-xs text-neutral-400">Bekleyen aşama yok</span>
                  )}
                </dd>
              </div>
            </dl>
          ) : null}
          {stats && pendingTotal > 0 && (stats.batches.done ?? 0) === 0 && !running ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              <strong>{pendingTotal} ilan kuyrukta.</strong> Kuyruğa alma tamamlandı; üretim henüz
              başlamadı. Devam etmek için <strong>İşle (sıradaki)</strong> düğmesine tıklayın.
              Her adım tek bir AI çağrısıdır (süre sınırı yok); tam bir ilan TR + 5 çeviri + 6 SEO
              adımı ister. Hatalı ilanlar atlanır, kuyruk devam eder.
            </p>
          ) : null}
          {stats && (stats.batches.running ?? 0) > 0 ? (
            <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200">
              {(stats.batches.running ?? 0)} iş şu an çalışıyor. Uzun sürerse DeepSeek yanıtını
              bekliyor olabilir; takılı kaldıysa <strong>Takılı sıfırla</strong> deneyin.
            </p>
          ) : null}
          <p className="mt-4 text-xs text-neutral-500">
            Her &quot;İşle&quot; tek AI isteği çalıştırır (tarayıcı zaman aşımı kapalı). Çeviri ve SEO
            dilleri sırayla işlenir; tamamlanan yalnızca bir ilanın tüm aşamaları bitince artar.
          </p>
        </div>
      </div>

      {log.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">İşlem günlüğü</h3>
          <ul className="mt-2 max-h-48 space-y-1 overflow-auto font-mono text-xs text-neutral-700 dark:text-neutral-300">
            {log.map((line, i) => (
              <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
