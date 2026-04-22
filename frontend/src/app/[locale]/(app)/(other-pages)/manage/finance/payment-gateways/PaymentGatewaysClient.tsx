'use client'

import clsx from 'clsx'
import {
  AlertCircle,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Save,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { listSiteSettings, setActivePaymentProvider, upsertSiteSetting } from '@/lib/travel-api'

type GatewayId = 'paytr' | 'paratika'

interface GatewayConfig {
  enabled: boolean
  merchant_id: string
  merchant_key: string
  merchant_salt: string
  mode: 'sandbox' | 'production'
}

const INITIAL: Record<GatewayId, GatewayConfig> = {
  paytr: { enabled: false, merchant_id: '', merchant_key: '', merchant_salt: '', mode: 'sandbox' },
  paratika: { enabled: false, merchant_id: '', merchant_key: '', merchant_salt: '', mode: 'sandbox' },
}

const GATEWAY_INFO: Record<GatewayId, { name: string; logo: string; desc: string; docsUrl: string }> = {
  paytr: {
    name: 'PayTR',
    logo: '💳',
    desc: 'Türkiye\'nin önde gelen sanal POS sağlayıcılarından biri. Tüm Türk bankaları desteklenir.',
    docsUrl: 'https://dev.paytr.com',
  },
  paratika: {
    name: 'Paratika',
    logo: '💳',
    desc: 'Asseco tarafından desteklenen ödeme altyapısı. 3D Secure ve taksit desteği.',
    docsUrl: 'https://developer.paratika.com.tr',
  },
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={clsx(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
        enabled ? 'bg-[color:var(--manage-primary)]' : 'bg-neutral-200 dark:bg-neutral-700',
      )}
    >
      <span className={clsx('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', enabled ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  )
}

export default function PaymentGatewaysClient() {
  const [configs, setConfigs] = useState<Record<GatewayId, GatewayConfig>>(INITIAL)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) { setLoading(false); return }
    listSiteSettings(token, { key: 'payment_gateways' })
      .then((res) => {
        const row = res.settings.find((s) => s.key === 'payment_gateways')
        if (row?.value_json) {
          try {
            const parsed = JSON.parse(row.value_json) as Partial<Record<GatewayId, GatewayConfig>>
            setConfigs((prev) => ({
              paytr: { ...prev.paytr, ...(parsed.paytr ?? {}) },
              paratika: { ...prev.paratika, ...(parsed.paratika ?? {}) },
            }))
          } catch { /* ignore */ }
        }
      })
      .catch(() => { /* ignore load errors */ })
      .finally(() => setLoading(false))
  }, [])

  const update = (gw: GatewayId, field: keyof GatewayConfig, value: string | boolean) =>
    setConfigs((prev) => ({ ...prev, [gw]: { ...prev[gw], [field]: value } }))

  const handleSave = async () => {
    const token = getStoredAuthToken()
    if (!token) { setError('Oturum açık değil.'); return }
    setSaving(true)
    setError(null)
    try {
      await upsertSiteSetting(token, {
        key: 'payment_gateways',
        value_json: JSON.stringify(configs),
      })
      const enabled = (Object.entries(configs) as [GatewayId, GatewayConfig][]).find(([, cfg]) => cfg.enabled)
      if (enabled) {
        await setActivePaymentProvider(enabled[0], token)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydetme hatası')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
          <CreditCard className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Sanal POS / Ödeme Geçidi</h1>
          <p className="mt-1 text-sm text-neutral-500">
            PayTR ve Paratika ödeme entegrasyonlarını yönetin. Yalnızca biri aktif olabilir.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="space-y-6">
        {(['paytr', 'paratika'] as GatewayId[]).map((gw) => {
          const info = GATEWAY_INFO[gw]
          const cfg = configs[gw]
          return (
            <section
              key={gw}
              className={clsx(
                'rounded-2xl border bg-white p-6 shadow-sm dark:bg-neutral-900',
                cfg.enabled
                  ? 'border-[color:var(--manage-primary)]'
                  : 'border-neutral-100 dark:border-neutral-700',
              )}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{info.logo}</span>
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                      {info.name}
                    </h2>
                    {cfg.enabled ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Aktif
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500 dark:bg-neutral-800">
                        Pasif
                      </span>
                    )}
                  </div>
                  <p className="mt-1 max-w-lg text-xs text-neutral-500">{info.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={info.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[color:var(--manage-primary)] underline"
                  >
                    Dökümanlar
                  </a>
                  <ToggleSwitch enabled={cfg.enabled} onChange={(v) => update(gw, 'enabled', v)} />
                </div>
              </div>

              {cfg.enabled ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-neutral-500">Mod</label>
                    <div className="flex gap-3">
                      {(['sandbox', 'production'] as const).map((m) => (
                        <label key={m} className={clsx(
                          'flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors',
                          cfg.mode === m
                            ? 'border-[color:var(--manage-primary)] bg-[color:var(--manage-primary-soft)] text-[color:var(--manage-primary)]'
                            : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700',
                        )}>
                          <input type="radio" name={`${gw}-mode`} value={m} checked={cfg.mode === m} onChange={() => update(gw, 'mode', m)} className="sr-only" />
                          {m === 'sandbox' ? '🧪 Test (Sandbox)' : '🚀 Canlı (Production)'}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-500">Merchant ID</label>
                      <input
                        type="text"
                        value={cfg.merchant_id}
                        onChange={(e) => update(gw, 'merchant_id', e.target.value)}
                        placeholder="12345"
                        className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-500">Merchant Key</label>
                      <SecretInput
                        value={cfg.merchant_key}
                        onChange={(v) => update(gw, 'merchant_key', v)}
                        placeholder="gizli anahtar..."
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-500">Merchant Salt</label>
                      <SecretInput
                        value={cfg.merchant_salt}
                        onChange={(v) => update(gw, 'merchant_salt', v)}
                        placeholder="güvenlik tuzu..."
                      />
                    </div>
                  </div>

                  {cfg.mode === 'production' ? (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
                      <span className="text-base">⚠️</span>
                      <p>Canlı mod aktif. Gerçek ödemeler işlenecektir. Ayarları dikkatlice kontrol edin.</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">Etkinleştirmek için yukarıdaki anahtarı açın.</p>
              )}
            </section>
          )
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className={clsx(
            'flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60',
            saved ? 'bg-emerald-600' : 'bg-[color:var(--manage-primary)] hover:opacity-90',
          )}
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Kaydediliyor…</>
            : saved ? <><Check className="h-4 w-4" />Kaydedildi</>
            : <><Save className="h-4 w-4" />Kaydet</>}
        </button>
      </div>
    </div>
  )
}
