'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  createAiJob,
  getAiJob,
  listAiFeatureProfiles,
  patchAiFeatureProfile,
  runAiJob,
} from '@/lib/travel-api'
import clsx from 'clsx'
import { BookOpen, ExternalLink, Loader2, Play, Save, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type ProfileRow = {
  id: string
  code: string
  provider_id: string
  system_prompt: string | null
  temperature: string
}

export type AiFeatureWorkbenchProps = {
  profileCode: string
  title: string
  subtitle: string
  /** İş kuyruğuna gönderilecek varsayılan JSON (worker bu profile göre yorumlar) */
  defaultInputJson: string
  /** Komut alanı için ipucu */
  inputHelp?: string
}

export default function AiFeatureWorkbench({
  profileCode,
  title,
  subtitle,
  defaultInputJson,
  inputHelp,
}: AiFeatureWorkbenchProps) {
  const vitrinPath = useVitrinHref()
  const queueHref = vitrinPath('/manage/admin/marketing/ai')

  const [token] = useState(() => getStoredAuthToken())
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [temperature, setTemperature] = useState('0.7')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [inputJson, setInputJson] = useState(defaultInputJson)
  const [running, setRunning] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<string | null>(null)
  const [jobOutput, setJobOutput] = useState<string | null>(null)
  const [jobError, setJobError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) {
      setLoadErr('Oturum bulunamadı.')
      setLoading(false)
      return
    }
    setLoadErr(null)
    setLoading(true)
    try {
      const r = await listAiFeatureProfiles(token)
      const p = r.profiles.find((x) => x.code === profileCode) ?? null
      setProfile(p)
      setSystemPrompt(p?.system_prompt ?? '')
      setTemperature(p?.temperature ?? '0.70')
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Profil yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [token, profileCode])

  useEffect(() => {
    void load()
  }, [load])

  async function saveInstructions() {
    if (!token) return
    setSaving(true)
    setLoadErr(null)
    try {
      await patchAiFeatureProfile(token, profileCode, {
        system_prompt: systemPrompt,
        temperature: temperature.trim() || '0.70',
      })
      await load()
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  async function runJob() {
    if (!token) return
    let ij = inputJson.trim()
    try {
      JSON.parse(ij)
    } catch {
      setLoadErr('Komut alanı geçerli JSON olmalıdır.')
      return
    }
    setRunning(true)
    setLoadErr(null)
    setJobId(null)
    setJobStatus(null)
    setJobOutput(null)
    setJobError(null)
    try {
      const { id } = await createAiJob(token, {
        profile_code: profileCode,
        input_json: ij,
        run: true,
      })
      setJobId(id)
      const j1 = await getAiJob(token, id)
      setJobStatus(j1.status)
      setJobOutput(j1.output_json)
      setJobError(j1.error)
      if (j1.status === 'queued') {
        await runAiJob(token, id)
        const j2 = await getAiJob(token, id)
        setJobStatus(j2.status)
        setJobOutput(j2.output_json)
        setJobError(j2.error)
      }
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'İş oluşturulamadı')
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    if (!token || !jobId) return
    let cancelled = false
    const tick = async () => {
      try {
        const j = await getAiJob(token, jobId)
        if (cancelled) return
        setJobStatus(j.status)
        setJobOutput(j.output_json)
        setJobError(j.error)
        if (j.status === 'succeeded' || j.status === 'failed') return
        if (j.status === 'queued' || j.status === 'running') {
          setTimeout(tick, 1500)
        }
      } catch {
        if (!cancelled) setJobError('İş okunamadı')
      }
    }
    void tick()
    return () => {
      cancelled = true
    }
  }, [token, jobId])

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-violet-50/80 to-white p-6 dark:border-neutral-800 dark:from-violet-950/20 dark:to-neutral-900/80">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
              Profil: <code className="font-mono">{profileCode}</code>
            </p>
            <h1 className="mt-1 text-xl font-semibold text-neutral-900 dark:text-white">{title}</h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p>
            <Link
              href={queueHref}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Tüm iş kuyruğunu yönetimde aç
            </Link>
          </div>
        </div>
      </header>

      {loadErr ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {loadErr}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Yükleniyor…
        </div>
      ) : !profile ? (
        <p className="text-sm text-neutral-500">Bu profil kodu veritabanında yok: {profileCode}</p>
      ) : (
        <>
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
            <div className="mb-4 flex items-start gap-3">
              <BookOpen className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Talimat & eğitim (sistem)</h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Bu metin ilgili AI profiline kaydedilir; worker bu profile ait her çağrıda öncelikli talimat olarak kullanır.
                  Gerçek model eğitimi değil; <strong>prompt / davranış kalıbı</strong> tanımlarsınız.
                </p>
              </div>
            </div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Sistem talimatı</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Sıcaklık (0–1)</label>
                <input
                  type="text"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="mt-1 w-full max-w-[140px] rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-950"
                />
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveInstructions()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-violet-600 dark:hover:bg-violet-500"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Talimatı kaydet
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Komut (iş girdisi)</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Aşağıdaki JSON iş kuyruğuna gider. Worker alanları profile göre işler; örnek şablonu ihtiyacınıza göre
              düzenleyin.
            </p>
            {inputHelp ? <p className="mt-2 text-xs text-neutral-400">{inputHelp}</p> : null}
            <textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              rows={12}
              spellCheck={false}
              className="mt-3 w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-xs leading-relaxed dark:border-neutral-700 dark:bg-neutral-950"
            />
            <button
              type="button"
              disabled={running}
              onClick={() => void runJob()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Kuyruğa gönder
            </button>
          </section>

          {jobId ? (
            <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-950/40">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Son iş</h2>
              <p className="mt-1 font-mono text-xs text-neutral-500">ID: {jobId}</p>
              <p className="mt-2 text-sm">
                Durum:{' '}
                <span
                  className={clsx(
                    'rounded-md px-2 py-0.5 font-medium',
                    jobStatus === 'succeeded' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
                    jobStatus === 'failed' && 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
                    jobStatus !== 'succeeded' && jobStatus !== 'failed' && 'bg-amber-100 text-amber-900 dark:bg-amber-950/40',
                  )}
                >
                  {jobStatus ?? '…'}
                </span>
              </p>
              {jobError ? (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">{jobError}</p>
              ) : null}
              {jobOutput ? (
                <pre className="mt-4 max-h-80 overflow-auto rounded-xl border border-neutral-200 bg-white p-4 text-xs dark:border-neutral-700 dark:bg-neutral-900">
                  {jobOutput}
                </pre>
              ) : jobStatus && jobStatus !== 'failed' && jobStatus !== 'succeeded' ? (
                <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Çıktı bekleniyor…
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
