'use client'

import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { listSiteSettings, upsertSiteSetting } from '@/lib/travel-api'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import clsx from 'clsx'
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
  UploadCloud,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type MerchantConfigStatus = {
  service_account: boolean
  merchant_account_id: boolean
  data_source_id: boolean
  ready: boolean
}

type MerchantSettings = {
  merchant_account_id: string
  data_source_id: string
  content_language: string
  feed_label: string
  enabled_category_codes: string[]
}

const CATEGORY_OPTIONS = [
  { code: 'hotel', label: 'Otel' },
  { code: 'holiday_home', label: 'Tatil evi' },
  { code: 'yacht_charter', label: 'Yat' },
  { code: 'tour', label: 'Tur' },
  { code: 'activity', label: 'Aktivite' },
  { code: 'cruise', label: 'Kruvaziyer' },
  { code: 'car_rental', label: 'Araç kiralama' },
  { code: 'transfer', label: 'Transfer' },
  { code: 'ferry', label: 'Feribot' },
]

const DEFAULT_SETTINGS: MerchantSettings = {
  merchant_account_id: '',
  data_source_id: '',
  content_language: 'tr',
  feed_label: 'TR',
  enabled_category_codes: [],
}

export default function SeoMerchantClient() {
  const vitrinPath = useVitrinHref()
  const [settings, setSettings] = useState<MerchantSettings>(DEFAULT_SETTINGS)
  const [status, setStatus] = useState<MerchantConfigStatus | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [syncErr, setSyncErr] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncLimit, setSyncLimit] = useState('50')

  const loadConfig = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setLoadErr('Oturum gerekli')
      setLoading(false)
      return
    }
    setLoadErr(null)
    setLoading(true)
    try {
      const [cfgRes, siteRes] = await Promise.all([
        fetch('/api/google/merchant/config', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }),
        listSiteSettings(token, { key: 'google_merchant' }),
      ])

      if (cfgRes.ok) {
        const cfg = (await cfgRes.json()) as {
          status: MerchantConfigStatus
          settings: MerchantSettings
        }
        setStatus(cfg.status)
        setSettings({ ...DEFAULT_SETTINGS, ...cfg.settings })
      }

      const row = siteRes.settings.find((s) => s.key === 'google_merchant')
      if (row?.value_json) {
        try {
          const parsed = JSON.parse(row.value_json) as Partial<MerchantSettings>
          setSettings((prev) => ({ ...prev, ...parsed }))
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      setLoadErr(formatManageApiCatch(e, 'merchant_config_load_failed'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    setSaving(true)
    setSaveErr(null)
    try {
      await upsertSiteSetting(token, {
        key: 'google_merchant',
        value_json: JSON.stringify({
          merchant_account_id: settings.merchant_account_id.trim(),
          data_source_id: settings.data_source_id.trim(),
          content_language: settings.content_language.trim() || 'tr',
          feed_label: settings.feed_label.trim() || 'TR',
          enabled_category_codes: settings.enabled_category_codes,
        }),
      })
      await loadConfig()
    } catch (err) {
      setSaveErr(formatManageApiCatch(err, 'merchant_settings_save_failed'))
    } finally {
      setSaving(false)
    }
  }

  async function onSync() {
    const token = getStoredAuthToken()
    if (!token) return
    setSyncing(true)
    setSyncErr(null)
    setSyncResult(null)
    try {
      const limit = Math.min(Math.max(Number.parseInt(syncLimit, 10) || 50, 1), 200)
      const res = await fetch('/api/google/merchant/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit }),
      })
      const data = (await res.json()) as {
        error?: string
        hint?: string
        pushed?: number
        failed?: number
        scanned?: number
        results?: { listing_id: string; ok: boolean; error?: string }[]
      }
      if (!res.ok) {
        throw new Error(data.hint ?? data.error ?? `sync_${res.status}`)
      }
      const failedSamples = (data.results ?? [])
        .filter((r) => !r.ok)
        .slice(0, 5)
        .map((r) => `${r.listing_id.slice(0, 8)}…: ${r.error ?? '?'}`)
        .join('; ')
      setSyncResult(
        `${data.pushed ?? 0} ilan gönderildi, ${data.failed ?? 0} başarısız (taranan: ${data.scanned ?? 0})` +
          (failedSamples ? ` — örnek hatalar: ${failedSamples}` : ''),
      )
      await loadConfig()
    } catch (err) {
      setSyncErr(formatManageApiCatch(err, 'merchant_sync_failed'))
    } finally {
      setSyncing(false)
    }
  }

  function toggleCategory(code: string) {
    setSettings((prev) => {
      const set = new Set(prev.enabled_category_codes)
      if (set.has(code)) set.delete(code)
      else set.add(code)
      return { ...prev, enabled_category_codes: [...set] }
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Google Merchant Center (API)</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-500">
          İlanlarınızı Merchant Center&apos;a <strong>API ile ürün ekleme</strong> yöntemiyle gönderin. Feed/XML
          gerekmez; Google Merchant API Product Input kullanılır.
        </p>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </p>
      ) : null}

      {loadErr ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {loadErr}
        </p>
      ) : null}

      {/* Durum kartı */}
      {status ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Bağlantı durumu</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <StatusRow ok={status.merchant_account_id} label="Merchant Account ID" />
            <StatusRow ok={status.data_source_id} label="Data Source ID (API kaynağı)" />
            <StatusRow
              ok={status.service_account}
              label="Servis hesabı (GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON)"
            />
          </ul>
          {status.ready ? (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> API gönderimi için hazır
            </p>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-4 w-4" /> Eksik ayarları tamamlayın (aşağıdaki form + sunucu env)
            </p>
          )}
        </div>
      ) : null}

      {/* Ayarlar */}
      <form
        onSubmit={(e) => void onSave(e)}
        className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900/40"
      >
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Merchant API ayarları</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Merchant Center → <em>Ürünler → Veri kaynakları → API</em> ile oluşturduğunuz kaynağın ID&apos;sini girin.
          Hesap ID örneği: <code className="font-mono text-xs">5816537038</code>.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="gm-account-id">Merchant Account ID</Label>
            <Input
              id="gm-account-id"
              className="mt-1.5 font-mono text-sm"
              value={settings.merchant_account_id}
              onChange={(e) => setSettings((s) => ({ ...s, merchant_account_id: e.target.value }))}
              placeholder="5816537038"
            />
          </Field>
          <Field>
            <Label htmlFor="gm-datasource-id">Data Source ID</Label>
            <Input
              id="gm-datasource-id"
              className="mt-1.5 font-mono text-sm"
              value={settings.data_source_id}
              onChange={(e) => setSettings((s) => ({ ...s, data_source_id: e.target.value }))}
              placeholder="API veri kaynağı numarası"
            />
          </Field>
          <Field>
            <Label htmlFor="gm-lang">İçerik dili</Label>
            <Input
              id="gm-lang"
              className="mt-1.5"
              value={settings.content_language}
              onChange={(e) => setSettings((s) => ({ ...s, content_language: e.target.value }))}
              placeholder="tr"
            />
          </Field>
          <Field>
            <Label htmlFor="gm-feed">Feed etiketi (ülke)</Label>
            <Input
              id="gm-feed"
              className="mt-1.5"
              value={settings.feed_label}
              onChange={(e) => setSettings((s) => ({ ...s, feed_label: e.target.value }))}
              placeholder="TR"
            />
          </Field>
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Senkron kategorileri</p>
          <p className="mt-1 text-xs text-neutral-500">Hiçbiri seçilmezse tüm yayınlanmış kategoriler dahil edilir.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((c) => {
              const on = settings.enabled_category_codes.includes(c.code)
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => toggleCategory(c.code)}
                  className={clsx(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    on
                      ? 'border-[color:var(--manage-primary)] bg-[color:var(--manage-primary-soft)] text-[color:var(--manage-primary)]'
                      : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-400',
                  )}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {saveErr ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{saveErr}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonPrimary type="submit" disabled={saving} className="inline-flex items-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Ayarları kaydet
          </ButtonPrimary>
          <button
            type="button"
            onClick={() => void loadConfig()}
            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-300 px-4 py-2.5 text-sm font-medium dark:border-neutral-600"
          >
            <RefreshCw className="h-4 w-4" /> Yenile
          </button>
        </div>
      </form>

      {/* Senkron */}
      <section className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
        <h2 className="font-semibold text-neutral-900 dark:text-white">Toplu API gönderimi</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Yayınlanmış ilanları (fiyat + HTTPS görseli olanlar) Google Merchant API&apos;ye gönderir. İlan başına{' '}
          <code className="font-mono text-xs">offerId = listing UUID</code> kullanılır.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field className="w-32">
            <Label htmlFor="sync-limit">Batch boyutu</Label>
            <Input
              id="sync-limit"
              type="number"
              min={1}
              max={200}
              className="mt-1.5"
              value={syncLimit}
              onChange={(e) => setSyncLimit(e.target.value)}
            />
          </Field>
          <ButtonPrimary
            type="button"
            disabled={syncing || !status?.ready}
            onClick={() => void onSync()}
            className="inline-flex items-center gap-2"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {syncing ? 'Gönderiliyor…' : 'Yayınlanmış ilanları gönder'}
          </ButtonPrimary>
        </div>

        {syncErr ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{syncErr}</p> : null}
        {syncResult ? (
          <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{syncResult}</p>
        ) : null}
      </section>

      {/* Kurulum rehberi */}
      <div className="rounded-2xl border border-dashed border-neutral-300 p-5 text-sm dark:border-neutral-600">
        <h2 className="font-semibold text-neutral-900 dark:text-white">Sunucu kurulumu (bir kez)</h2>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-neutral-600 dark:text-neutral-400">
          <li>
            Google Cloud Console → servis hesabı oluşturun, Content API / Merchant API erişimi verin, JSON anahtar indirin.
          </li>
          <li>
            Merchant Center → Ayarlar → Kullanıcılar → servis hesabı e-postasını <strong>Admin</strong> olarak ekleyin.
          </li>
          <li>
            Merchant Center → Ürünler → Veri kaynakları → <strong>API ile ürün ekleyin</strong> kaynağı oluşturun; Data
            Source ID&apos;yi yukarıya yazın.
          </li>
          <li>
            Sunucu <code className="font-mono text-xs">/etc/rezervasyonyap/frontend.env</code> dosyasına ekleyin:
            <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100">
{`GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
# İsteğe bağlı — panel yerine env ile de tanımlanabilir:
GOOGLE_MERCHANT_ACCOUNT_ID=5816537038
GOOGLE_MERCHANT_DATA_SOURCE_ID=123456789`}
            </pre>
          </li>
          <li>
            İlanları güncel tutun:{' '}
            <Link href={vitrinPath('/manage/catalog')} className="text-primary-600 underline dark:text-primary-400">
              Katalog
            </Link>
            . Fiyatsız veya görselsiz ilanlar atlanır.
          </li>
        </ol>
        <p className="mt-4 text-xs text-neutral-500">
          Dokümantasyon:{' '}
          <a
            href="https://developers.google.com/merchant/api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary-600 underline dark:text-primary-400"
          >
            Google Merchant API <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>
    </div>
  )
}

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
      )}
      <span className={ok ? 'text-neutral-700 dark:text-neutral-300' : 'text-amber-800 dark:text-amber-300'}>
        {label}
      </span>
    </li>
  )
}
