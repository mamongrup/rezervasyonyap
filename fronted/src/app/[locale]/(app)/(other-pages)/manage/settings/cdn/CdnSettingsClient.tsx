'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import { getActiveCdn, setActiveCdn, type CdnActiveRes } from '@/lib/travel-api'
import { CheckCircle2, Cloud, Globe2, Loader2, RefreshCw, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

function isActiveCdn(
  d: CdnActiveRes | null,
): d is { active: string; pull_zone_url: string | null; is_active: boolean } {
  return d != null && 'active' in d && d.active != null && d.active !== ''
}

const PROVIDERS = [
  {
    code: 'bunny' as const,
    name: 'Bunny.net',
    blurb: 'Pull zone ile görsel ve statik dosya dağıtımı; düşük gecikme ve basit fiyatlandırma.',
  },
  {
    code: 'cloudflare' as const,
    name: 'Cloudflare',
    blurb: 'R2 / özel hostname ile uyumlu; mevcut Cloudflare alanınız varsa uygun olabilir.',
  },
]

export default function CdnSettingsClient() {
  const [data, setData] = useState<CdnActiveRes | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [setting, setSetting] = useState<'bunny' | 'cloudflare' | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const r = await getActiveCdn()
      setData(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function activate(code: 'bunny' | 'cloudflare') {
    setSetting(code)
    setError(null)
    try {
      await setActiveCdn(code)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt başarısız')
    } finally {
      setSetting(null)
    }
  }

  const active = isActiveCdn(data) ? data.active : null
  const pullUrl = isActiveCdn(data) ? data.pull_zone_url : null

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Başlık */}
      <header className="border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
          Ayarlar · Medya
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
          CDN ayarları
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          Görseller ve medya URL’leri için hangi sağlayıcının <strong>pull zone</strong> kaydının kullanılacağını
          seçin. Kayıtlar veritabanında <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[13px] dark:bg-neutral-800">cdn_connections</code> tablosunda tutulur; Next.js uzak görseller için{' '}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[13px] dark:bg-neutral-800">NEXT_PUBLIC_IMAGE_REMOTE_HOST</code> kullanır.
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 py-20 dark:border-neutral-700">
          <Loader2 className="h-9 w-9 animate-spin text-primary-500" aria-hidden />
          <p className="text-sm text-neutral-500">CDN durumu yükleniyor…</p>
        </div>
      ) : (
        <>
          {/* Mevcut durum */}
          <section
            aria-labelledby="cdn-status-heading"
            className={`overflow-hidden rounded-2xl border shadow-sm ${
              active
                ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-neutral-900/60'
                : 'border-neutral-200 bg-neutral-50/80 dark:border-neutral-700 dark:bg-neutral-900/40'
            }`}
          >
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div className="flex gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {active ? <CheckCircle2 className="h-6 w-6" aria-hidden /> : <Globe2 className="h-6 w-6" aria-hidden />}
                </div>
                <div>
                  <h2 id="cdn-status-heading" className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Aktif sağlayıcı
                  </h2>
                  {active ? (
                    <>
                      <p className="mt-1 text-lg font-medium capitalize text-neutral-800 dark:text-neutral-100">
                        {active === 'bunny' ? 'Bunny.net' : active === 'cloudflare' ? 'Cloudflare' : active}
                      </p>
                      {pullUrl ? (
                        <p className="mt-2 font-mono text-xs text-neutral-600 break-all dark:text-neutral-400">
                          {pullUrl}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-neutral-500">Pull zone URL henüz bağlı değil veya boş.</p>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                      Henüz aktif bir CDN seçilmedi. Aşağıdan bir sağlayıcıyı etkinleştirin.
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                Yenile
              </button>
            </div>
          </section>

          {/* Sağlayıcı kartları */}
          <section aria-labelledby="cdn-providers-heading">
            <h2 id="cdn-providers-heading" className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
              Sağlayıcıyı seçin
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {PROVIDERS.map((p) => {
                const isCurrent = active === p.code
                const busy = setting === p.code
                return (
                  <div
                    key={p.code}
                    className={`relative flex flex-col rounded-2xl border p-5 transition-colors ${
                      isCurrent
                        ? 'border-primary-400/60 bg-primary-50/50 ring-1 ring-primary-500/20 dark:border-primary-600/50 dark:bg-primary-950/20'
                        : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900/50'
                    }`}
                  >
                    {isCurrent ? (
                      <span className="absolute end-3 top-3 rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-800 dark:bg-primary-900/60 dark:text-primary-200">
                        Aktif
                      </span>
                    ) : null}
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                      <Cloud className="h-5 w-5 text-neutral-600 dark:text-neutral-400" aria-hidden />
                    </div>
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{p.name}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{p.blurb}</p>
                    <div className="mt-5">
                      <ButtonPrimary
                        type="button"
                        className="w-full sm:w-auto"
                        disabled={setting !== null}
                        onClick={() => void activate(p.code)}
                      >
                        {busy ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Kaydediliyor…
                          </span>
                        ) : isCurrent ? (
                          'Yeniden uygula'
                        ) : (
                          `${p.name} kullan`
                        )}
                      </ButtonPrimary>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}

      <aside className="flex gap-3 rounded-xl border border-blue-200/80 bg-blue-50/60 p-4 text-sm text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/25 dark:text-blue-100">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 opacity-80" aria-hidden />
        <div>
          <p className="font-medium">Güvenlik</p>
          <p className="mt-1 leading-relaxed text-blue-900/90 dark:text-blue-200/90">
            Bu işlem için panel oturumu yeterlidir; API uçları üretimde yalnızca yönetim ağından erişilebilir olmalıdır.
            Gerekirse ters vekil veya firewall ile kısıtlayın.
          </p>
        </div>
      </aside>
    </div>
  )
}
