'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import {
  getAllCdnProviders,
  setActiveCdn,
  updateCdnConfig,
  deactivateCdn,
  type CdnProviderRecord,
} from '@/lib/travel-api'
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  ShieldAlert,
  WifiOff,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------
type FieldDef = {
  key: string
  label: string
  placeholder: string
  secret?: boolean
  isPullZone?: boolean
  required?: boolean
}

const BUNNY_FIELDS: FieldDef[] = [
  { key: 'storage_zone_name', label: 'Storage Zone Name', placeholder: 'my-travel-zone', required: true },
  { key: 'storage_api_key', label: 'Storage API Key (Password)', placeholder: 'xxxx-xxxx-xxxx', secret: true, required: true },
  { key: 'pull_zone_url', label: 'Pull Zone URL', placeholder: 'https://cdn.rezervasyonyap.tr', isPullZone: true, required: true },
  { key: 'storage_region', label: 'Storage Region', placeholder: 'de  (veya ny, la, sg, syd)', required: true },
]

const CF_FIELDS: FieldDef[] = [
  { key: 'account_id', label: 'Account ID', placeholder: 'abc123...', required: true },
  { key: 'access_key_id', label: 'R2 Access Key ID', placeholder: 'xxxx', required: true },
  { key: 'secret_access_key', label: 'R2 Secret Access Key', placeholder: '••••••••', secret: true, required: true },
  { key: 'bucket_name', label: 'Bucket Name', placeholder: 'travel-media', required: true },
  { key: 'pull_zone_url', label: 'Public URL / Custom Domain', placeholder: 'https://pub-xxxx.r2.dev', isPullZone: true, required: true },
]

const PROVIDERS = [
  {
    code: 'bunny' as const,
    name: 'Bunny.net',
    blurb: 'Pull zone ile görsel ve statik dosya dağıtımı; düşük gecikme ve basit fiyatlandırma.',
    docsUrl: 'https://dash.bunny.net',
    fields: BUNNY_FIELDS,
  },
  {
    code: 'cloudflare' as const,
    name: 'Cloudflare R2',
    blurb: 'R2 / özel hostname ile uyumlu; mevcut Cloudflare alanınız varsa uygun olabilir.',
    docsUrl: 'https://dash.cloudflare.com',
    fields: CF_FIELDS,
  },
]

function isComplete(code: 'bunny' | 'cloudflare', form: Record<string, string>) {
  const fields = code === 'bunny' ? BUNNY_FIELDS : CF_FIELDS
  return fields.filter((f) => f.required).every((f) => (form[f.key] ?? '').trim() !== '')
}

// ---------------------------------------------------------------------------
// Secret input
// ---------------------------------------------------------------------------
function SecretInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 pr-10 text-sm font-mono focus:border-primary-400 focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------
function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
              danger
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-primary-500 hover:bg-primary-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export default function CdnSettingsClient() {
  const [providers, setProviders] = useState<CdnProviderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activating, setActivating] = useState<'bunny' | 'cloudflare' | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [saving, setSaving] = useState<'bunny' | 'cloudflare' | null>(null)
  const [msgs, setMsgs] = useState<Record<string, { ok: boolean; text: string }>>({})
  const [forms, setForms] = useState<Record<string, Record<string, string>>>({ bunny: {}, cloudflare: {} })

  // confirm dialog state
  const [confirm, setConfirm] = useState<{
    open: boolean
    code?: 'bunny' | 'cloudflare'
    action: 'activate' | 'deactivate'
  }>({ open: false, action: 'activate' })

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const rows = await getAllCdnProviders()
      setProviders(rows)
      const next: Record<string, Record<string, string>> = { bunny: {}, cloudflare: {} }
      for (const row of rows) {
        next[row.code] = { ...row.config_json }
        if (row.pull_zone_url) next[row.code]['pull_zone_url'] = row.pull_zone_url
      }
      setForms(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function setField(code: string, key: string, value: string) {
    setForms((prev) => ({ ...prev, [code]: { ...prev[code], [key]: value } }))
  }

  async function doActivate(code: 'bunny' | 'cloudflare') {
    setActivating(code)
    setError(null)
    try {
      await setActiveCdn(code)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Etkinleştirme başarısız')
    } finally {
      setActivating(null)
    }
  }

  async function doDeactivate() {
    setDeactivating(true)
    setError(null)
    try {
      await deactivateCdn()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Devre dışı bırakma başarısız')
    } finally {
      setDeactivating(false)
    }
  }

  async function save(code: 'bunny' | 'cloudflare') {
    setSaving(code)
    setMsgs((prev) => ({ ...prev, [code]: undefined as never }))
    try {
      const form = forms[code] ?? {}
      const pullZoneUrl = form['pull_zone_url'] ?? ''
      const config: Record<string, string> = {}
      for (const [k, v] of Object.entries(form)) {
        if (k !== 'pull_zone_url') config[k] = v
      }
      await updateCdnConfig(code, pullZoneUrl, config)
      setMsgs((prev) => ({ ...prev, [code]: { ok: true, text: 'Ayarlar kaydedildi.' } }))
      await load()
    } catch (e) {
      setMsgs((prev) => ({
        ...prev,
        [code]: { ok: false, text: e instanceof Error ? e.message : 'Kayıt başarısız' },
      }))
    } finally {
      setSaving(null)
    }
  }

  function handleActivateClick(code: 'bunny' | 'cloudflare') {
    setConfirm({ open: true, code, action: 'activate' })
  }

  function handleDeactivateClick() {
    setConfirm({ open: true, action: 'deactivate' })
  }

  function handleConfirm() {
    setConfirm((c) => ({ ...c, open: false }))
    if (confirm.action === 'activate' && confirm.code) {
      void doActivate(confirm.code)
    } else if (confirm.action === 'deactivate') {
      void doDeactivate()
    }
  }

  const activeCode = providers.find((p) => p.is_active)?.code ?? null
  const anyBusy = activating !== null || deactivating || saving !== null

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Onay diyaloğu */}
      <ConfirmDialog
        open={confirm.open}
        title={
          confirm.action === 'activate'
            ? `${confirm.code === 'bunny' ? 'Bunny.net' : 'Cloudflare R2'}'i aktif et?`
            : 'CDN bağlantısını devre dışı bırak?'
        }
        description={
          confirm.action === 'activate'
            ? 'Bu sağlayıcı aktif CDN olarak ayarlanacak. Medya URL\'leri bu sağlayıcıdan sunulacak.'
            : 'Tüm CDN bağlantıları devre dışı bırakılacak. Medya dosyaları doğrudan sunucudan sunulacak.'
        }
        confirmLabel={confirm.action === 'activate' ? 'Aktif Et' : 'Devre Dışı Bırak'}
        danger={confirm.action === 'deactivate'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
      />

      {/* Başlık */}
      <header className="border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
          Ayarlar · Medya
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
          CDN Ayarları
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          Görsel ve medya dağıtımı için CDN sağlayıcısını yapılandırın. Önce ayarları kaydedin,
          ardından <strong>Aktif Yap</strong> butonuna basın.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Aktif durum banner */}
      {!loading && (
        <div
          className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${
            activeCode
              ? 'border-emerald-200/80 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
              : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/40'
          }`}
        >
          <div className="flex items-center gap-3">
            {activeCode ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <WifiOff className="h-5 w-5 text-neutral-400" />
            )}
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                {activeCode
                  ? `Aktif CDN: ${activeCode === 'bunny' ? 'Bunny.net' : 'Cloudflare R2'}`
                  : 'CDN aktif değil'}
              </p>
              {activeCode && providers.find((p) => p.is_active)?.pull_zone_url ? (
                <p className="mt-0.5 font-mono text-xs text-neutral-500 break-all">
                  {providers.find((p) => p.is_active)?.pull_zone_url}
                </p>
              ) : activeCode && !isComplete(activeCode, forms[activeCode] ?? {}) ? (
                <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                  ⚠ Konfigürasyon eksik — lütfen tüm alanları doldurun ve kaydedin.
                </p>
              ) : !activeCode ? (
                <p className="mt-0.5 text-xs text-neutral-500">
                  Bir sağlayıcı yapılandırıp aktif edin.
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Yenile
            </button>
            {activeCode && (
              <button
                type="button"
                onClick={handleDeactivateClick}
                disabled={anyBusy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-40 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
              >
                {deactivating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WifiOff className="h-3.5 w-3.5" />}
                Devre Dışı Bırak
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 py-20 dark:border-neutral-700">
          <Loader2 className="h-9 w-9 animate-spin text-primary-500" aria-hidden />
          <p className="text-sm text-neutral-500">CDN yapılandırması yükleniyor…</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {PROVIDERS.map((p) => {
            const isCurrent = activeCode === p.code
            const busy = activating === p.code
            const isSaving = saving === p.code
            const msg = msgs[p.code]
            const form = forms[p.code] ?? {}
            const complete = isComplete(p.code, form)
            const missingFields = p.fields
              .filter((f) => f.required && !(form[f.key] ?? '').trim())
              .map((f) => f.label)

            return (
              <div
                key={p.code}
                className={`relative flex flex-col rounded-2xl border p-5 ${
                  isCurrent
                    ? 'border-primary-400/60 bg-primary-50/50 ring-1 ring-primary-500/20 dark:border-primary-600/50 dark:bg-primary-950/20'
                    : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900/50'
                }`}
              >
                {/* Aktif rozet */}
                {isCurrent && (
                  <span className="absolute end-3 top-3 flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-800 dark:bg-primary-900/60 dark:text-primary-200">
                    <CheckCircle2 className="h-3 w-3" /> Aktif
                  </span>
                )}

                {/* Başlık */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <Cloud className="h-5 w-5 text-neutral-600 dark:text-neutral-400" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{p.name}</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{p.blurb}</p>
                  </div>
                </div>

                {/* Alanlar */}
                <div className="space-y-3">
                  {p.fields.map((f) => (
                    <div key={f.key}>
                      <label className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        {f.label}
                        {f.required && <span className="text-red-400">*</span>}
                      </label>
                      {f.secret ? (
                        <SecretInput
                          value={form[f.key] ?? ''}
                          onChange={(v) => setField(p.code, f.key, v)}
                          placeholder={f.placeholder}
                          disabled={isSaving}
                        />
                      ) : (
                        <input
                          type="text"
                          value={form[f.key] ?? ''}
                          onChange={(e) => setField(p.code, f.key, e.target.value)}
                          placeholder={f.placeholder}
                          disabled={isSaving}
                          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-mono focus:border-primary-400 focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Eksik alan uyarısı */}
                {!complete && missingFields.length > 0 && (
                  <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Eksik alanlar: {missingFields.join(', ')}. Aktif yapabilmek için tüm alanları doldurun.
                    </p>
                  </div>
                )}

                {/* Kaydet mesajı */}
                {msg && (
                  <p className={`mt-2 text-xs ${msg.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {msg.text}
                  </p>
                )}

                {/* Butonlar */}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <ButtonPrimary
                    type="button"
                    disabled={isSaving || anyBusy}
                    onClick={() => void save(p.code)}
                  >
                    {isSaving ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor…
                      </span>
                    ) : (
                      'Kaydet'
                    )}
                  </ButtonPrimary>

                  <button
                    type="button"
                    disabled={anyBusy || isCurrent || !complete}
                    title={!complete ? 'Önce tüm alanları doldurup kaydedin' : undefined}
                    onClick={() => handleActivateClick(p.code)}
                    className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    {busy ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />…
                      </span>
                    ) : isCurrent ? (
                      '✓ Aktif'
                    ) : (
                      'Aktif Yap'
                    )}
                  </button>

                  <a
                    href={p.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-500 underline"
                  >
                    Panel →
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Güvenlik notu */}
      <aside className="flex gap-3 rounded-xl border border-blue-200/80 bg-blue-50/60 p-4 text-sm text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/25 dark:text-blue-100">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 opacity-80" aria-hidden />
        <div>
          <p className="font-medium">Güvenlik</p>
          <p className="mt-1 leading-relaxed text-blue-900/90 dark:text-blue-200/90">
            API anahtarları veritabanında saklanır. Üretimde bu endpoint'leri yalnızca yönetim
            ağından erişilebilir kılın.
          </p>
        </div>
      </aside>
    </div>
  )
}
