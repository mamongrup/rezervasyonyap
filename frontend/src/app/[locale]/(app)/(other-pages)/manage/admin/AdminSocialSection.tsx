'use client'
import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import {
  listSocialJobs,
  postListingToFacebook,
  type SocialShareJob,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle, ExternalLink, Facebook, Loader2, RefreshCw, XCircle } from 'lucide-react'

// ─── Hızlı Facebook Paylaşım Paneli ──────────────────────────────────────────

interface FbResult {
  ok: boolean
  post_url?: string
  listing_url?: string
  message_preview?: string
  error?: string
  hint?: string
}

function FacebookQuickPost() {
  const [listingId, setListingId] = useState('')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<FbResult | null>(null)

  async function onPost() {
    const token = getStoredAuthToken()
    if (!token || !listingId.trim()) return
    setBusy(true)
    setResult(null)
    try {
      const r = await postListingToFacebook(token, listingId.trim(), caption.trim() || undefined)
      setResult(r)
    } catch (e) {
      setResult({ ok: false, error: formatManageApiCatch(e, 'facebook_post_failed') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1877F2]">
          <Facebook className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Facebook&apos;ta Paylaş</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">İlan UUID&apos;sini girin, Facebook sayfanıza anında gönderin</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">İlan UUID *</label>
          <input
            type="text"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Özel açıklama <span className="text-neutral-400">(opsiyonel — boş bırakılırsa ilan başlığı kullanılır)</span>
          </label>
          <textarea
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Harika bir tatil fırsatı! 🌊 Bu ilanı keşfedin…"
            className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
          />
        </div>

        <button
          type="button"
          onClick={() => void onPost()}
          disabled={busy || !listingId.trim()}
          className="flex items-center gap-2 rounded-xl bg-[#1877F2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#166FE5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
          {busy ? 'Paylaşılıyor…' : 'Facebook\'ta Paylaş'}
        </button>

        {/* Sonuç */}
        {result && (
          <div className={`mt-2 rounded-xl border p-4 ${result.ok ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20' : 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20'}`}>
            <div className="flex items-start gap-2">
              {result.ok
                ? <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              }
              <div className="min-w-0 flex-1">
                {result.ok ? (
                  <>
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Paylaşım başarılı!</p>
                    {result.post_url && (
                      <a href={result.post_url} target="_blank" rel="noopener noreferrer"
                        className="mt-1 flex items-center gap-1 text-xs text-emerald-700 underline dark:text-emerald-300"
                      >
                        Gönderiyi göster <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {result.message_preview && (
                      <p className="mt-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-neutral-600 dark:border-emerald-800 dark:bg-neutral-900 dark:text-neutral-400">
                        &ldquo;{result.message_preview}&hellip;&rdquo;
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-200">Paylaşım başarısız</p>
                    <p className="mt-1 text-xs text-red-700 dark:text-red-300">{result.error}</p>
                    {result.hint && (
                      <p className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-neutral-700 dark:border-red-800 dark:bg-neutral-900 dark:text-neutral-300">
                        💡 {result.hint}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Kuyruk görünümü ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  posted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
}

function JobRow({ j }: { j: SocialShareJob }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/40">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[j.status] ?? 'bg-neutral-100 text-neutral-600'}`}>
        {j.status}
      </span>
      <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300">{j.entity_type}</span>
      <span className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400" title={j.entity_id}>
        {j.entity_id.slice(0, 8)}…
      </span>
      {j.caption_ai_generated && (
        <span className="max-w-xs truncate text-xs text-neutral-600 dark:text-neutral-400" title={j.caption_ai_generated}>
          &ldquo;{j.caption_ai_generated.slice(0, 60)}&rdquo;
        </span>
      )}
      <span className="ml-auto text-[10px] text-neutral-400">{j.created_at ? new Date(j.created_at).toLocaleDateString('tr') : ''}</span>
    </div>
  )
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export default function AdminSocialSection() {
  const [jobs, setJobs] = useState<SocialShareJob[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'posted' | 'failed'>('all')
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const statusFilterRef = useRef(statusFilter)
  statusFilterRef.current = statusFilter

  const refresh = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    setLoadErr(null)
    setLoading(true)
    const st = statusFilterRef.current
    try {
      const j = await listSocialJobs(token, {
        ...(st !== 'all' ? { status: st } : {}),
        limit: 100,
      })
      setJobs(j.jobs)
    } catch (e) {
      setLoadErr(formatManageApiCatch(e, 'social_load_failed'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const counts = {
    all: jobs.length,
    pending: jobs.filter((j) => j.status === 'pending').length,
    posted: jobs.filter((j) => j.status === 'posted').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
  }

  const visibleJobs = statusFilter === 'all' ? jobs : jobs.filter((j) => j.status === statusFilter)

  return (
    <div className="space-y-6">
      {/* Hızlı paylaşım */}
      <FacebookQuickPost />

      {/* Paylaşım kuyruğu */}
      <div className="rounded-2xl border border-[color:var(--manage-card-border)] bg-[color:var(--manage-card-bg)] p-6 backdrop-blur-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[color:var(--manage-text)]">Paylaşım Geçmişi</h3>
            <p className="mt-0.5 text-xs text-[color:var(--manage-text-muted)]">Facebook&apos;a gönderilen paylaşım kayıtları</p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-[color:var(--manage-card-border)] px-3 py-2 text-sm text-[color:var(--manage-text-muted)] hover:bg-[color:var(--manage-hover-bg)] disabled:opacity-50"
          >
            <RefreshCw className={['h-3.5 w-3.5', loading ? 'animate-spin' : ''].join(' ')} />
            Yenile
          </button>
        </div>

        {/* Durum filtreleri */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(['all', 'pending', 'posted', 'failed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={[
                'rounded-full border px-3 py-1 text-xs font-medium transition',
                statusFilter === s
                  ? 'border-primary-500 bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400',
              ].join(' ')}
            >
              {s === 'all' ? 'Tümü' : s === 'pending' ? 'Bekleyen' : s === 'posted' ? 'Paylaşıldı' : 'Başarısız'}
              {' '}
              <span className="ml-0.5 text-[10px] opacity-70">({counts[s]})</span>
            </button>
          ))}
        </div>

        {loadErr && (
          <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {loadErr}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
          </div>
        ) : visibleJobs.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">Kayıt yok.</p>
        ) : (
          <div className="space-y-2">
            {visibleJobs.map((j) => <JobRow key={j.id} j={j} />)}
          </div>
        )}
      </div>
    </div>
  )
}
