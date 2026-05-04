'use client'

import { AI_PROFILE_MODULES } from '@/lib/ai-upstream-timeouts'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { listAiFeatureProfiles, listAiProviders } from '@/lib/travel-api'
import clsx from 'clsx'
import { ArrowRight, Bot, Cpu, ExternalLink, Layers, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

export default function AiManageHub() {
  const vitrinPath = useVitrinHref()
  const adminAiHref = vitrinPath('/manage/admin/marketing/ai')
  const aiSettingsHref = `${vitrinPath('/manage/admin/settings')}?tab=ai`

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [providers, setProviders] = useState<{ code: string; display_name: string; is_active: boolean }[]>([])
  const [profiles, setProfiles] = useState<{ code: string; temperature: string }[]>([])

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
      const [p, f] = await Promise.all([listAiProviders(token), listAiFeatureProfiles(token)])
      setProviders(p.providers.map((x) => ({ code: x.code, display_name: x.display_name, is_active: x.is_active })))
      setProfiles(f.profiles.map((x) => ({ code: x.code, temperature: x.temperature })))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-violet-50/90 to-white p-6 dark:border-neutral-800 dark:from-violet-950/25 dark:to-neutral-900/80">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md">
            <Bot className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Yapay zeka merkezi</h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Her alt sayfada <strong>sistem talimatını</strong> (model davranışı) kaydeder ve <strong>JSON komutları</strong> ile iş
              kuyruğuna görev gönderirsiniz. Gerçek model eğitimi yerine, kayıtlı talimatlar ve örnek girdiler kullanılır.
            </p>
            <Link
              href={adminAiHref}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              <ExternalLink className="h-4 w-4" />
              Sağlayıcılar & iş kuyruğu (yönetim görünümü)
            </Link>
          </div>
        </div>
      </header>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </div>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <Layers className="h-4 w-4" />
          Modül sayfaları
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          <strong>DeepSeek anahtarı, model, API URL ve upstream süreleri</strong> tek yerde:{' '}
          <Link href={aiSettingsHref} className="font-medium text-violet-600 underline dark:text-violet-400">
            Ayarlar → Yapay zeka
          </Link>
          . Aşağıdaki kartlar ilgili çalışma sayfalarına gider.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {AI_PROFILE_MODULES.map((m) => (
            <Link
              key={m.profileCode}
              href={vitrinPath(m.path)}
              className="group flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-950/40"
            >
              <span className="font-medium text-neutral-900 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-400">
                {m.label}
              </span>
              <span className="mt-1 text-xs font-normal text-neutral-500">{m.desc}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400">
                Aç <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Kayıtlar yükleniyor…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/40">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              <Cpu className="h-4 w-4" />
              Sağlayıcılar
            </h3>
            <ul className="space-y-2">
              {providers.map((p) => (
                <li
                  key={p.code}
                  className="rounded-lg border border-neutral-100 px-3 py-2 text-sm dark:border-neutral-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-white">{p.code}</span>
                    <span
                      className={clsx(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                        p.is_active
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
                      )}
                    >
                      {p.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-neutral-500" title={p.display_name}>
                    {p.display_name}
                  </p>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/40">
            <h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Özellik profilleri</h3>
            <ul className="max-h-64 space-y-1 overflow-y-auto font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
              {profiles.map((p) => (
                <li key={p.code} className="flex justify-between gap-2 rounded-md bg-neutral-50 px-2 py-1 dark:bg-neutral-950/50">
                  <span className="text-violet-700 dark:text-violet-400">{p.code}</span>
                  <span className="text-neutral-400">T={p.temperature}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
