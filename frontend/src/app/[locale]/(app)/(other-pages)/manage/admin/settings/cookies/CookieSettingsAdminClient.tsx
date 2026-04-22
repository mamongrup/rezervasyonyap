'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { getSitePublicConfig, upsertSiteSetting } from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Textarea from '@/shared/Textarea'
import { Cookie, Info, Loader2, Save } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type CookieConsentAdmin = {
  /** `false` ise vitrin çerez şeridi gösterilmez */
  banner_enabled: boolean
  /** Yönetici notları — vitrinde doğrudan kullanılmaz; ileride API ile bağlanabilir */
  categories: {
    essential: { label: string; description: string }
    functional: { label: string; description: string; default_on: boolean }
    analytics: { label: string; description: string; default_on: boolean }
    marketing: { label: string; description: string; default_on: boolean }
  }
}

const DEFAULTS: CookieConsentAdmin = {
  banner_enabled: true,
  categories: {
    essential: {
      label: 'Zorunlu çerezler',
      description: 'Oturum, güvenlik ve dil tercihi gibi sitenin çalışması için gerekli çerezler.',
    },
    functional: {
      label: 'İşlevsel çerezler',
      description: 'Tercihleri hatırlama, form taslakları vb.',
      default_on: true,
    },
    analytics: {
      label: 'Analitik',
      description: 'Ziyaret istatistikleri (ör. GA4) — anonim veya pseudonymous olabilir.',
      default_on: false,
    },
    marketing: {
      label: 'Pazarlama',
      description: 'Kişiselleştirilmiş reklam ve yeniden pazarlama pikselleri.',
      default_on: false,
    },
  },
}

function mergeCookieConsent(raw: unknown): CookieConsentAdmin {
  if (!raw || typeof raw !== 'object') return { ...DEFAULTS }
  const o = raw as Record<string, unknown>
  const banner_enabled = o.banner_enabled === false ? false : true
  const c = o.categories
  if (!c || typeof c !== 'object') return { ...DEFAULTS, banner_enabled }
  const cat = c as Record<string, unknown>
  const pick = (key: keyof CookieConsentAdmin['categories'], def: CookieConsentAdmin['categories'][typeof key]) => {
    const x = cat[key]
    if (!x || typeof x !== 'object') return { ...def }
    const r = x as Record<string, unknown>
    return {
      label: typeof r.label === 'string' ? r.label : def.label,
      description: typeof r.description === 'string' ? r.description : def.description,
      ...('default_on' in def
        ? { default_on: r.default_on === true }
        : {}),
    }
  }
  return {
    banner_enabled,
    categories: {
      essential: pick('essential', DEFAULTS.categories.essential),
      functional: pick('functional', DEFAULTS.categories.functional) as CookieConsentAdmin['categories']['functional'],
      analytics: pick('analytics', DEFAULTS.categories.analytics) as CookieConsentAdmin['categories']['analytics'],
      marketing: pick('marketing', DEFAULTS.categories.marketing) as CookieConsentAdmin['categories']['marketing'],
    },
  }
}

export default function CookieSettingsAdminClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [uiRest, setUiRest] = useState<Record<string, unknown>>({})
  const [config, setConfig] = useState<CookieConsentAdmin>(() => ({ ...DEFAULTS }))

  const load = useCallback(async () => {
    setLoading(true)
    setMsg(null)
    try {
      const pub = await getSitePublicConfig()
      const ui = (pub.ui ?? {}) as Record<string, unknown>
      setUiRest(ui)
      setConfig(mergeCookieConsent(ui.cookie_consent))
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setMsg('Oturum gerekli.')
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const nextUi = {
        ...uiRest,
        cookie_consent: config,
      }
      await upsertSiteSetting(token, { key: 'ui', value_json: JSON.stringify(nextUi) })
      setMsg('Çerez ayarları kaydedildi. Vitrin birkaç dakika içinde güncellenir.')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  const setCat = <K extends keyof CookieConsentAdmin['categories']>(
    key: K,
    patch: Partial<CookieConsentAdmin['categories'][K]>,
  ) => {
    setConfig((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [key]: { ...prev.categories[key], ...patch },
      },
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-neutral-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Yükleniyor…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start gap-4 border-b border-neutral-200 pb-6 dark:border-neutral-700">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          <Cookie className="h-7 w-7" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Çerez politikası ve tercihler</h1>
          <p className="mt-1 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">
            Vitrinde alttaki çerez şeridinin gösterilmesi ve kategorilerin tanımları. İleride bu alanları analitik / pazarlama
            scriptlerinin koşullu yüklenmesiyle bağlayabilirsiniz.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100">
        <Info className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          <strong>Not:</strong> Ziyaretçi tercihi tarayıcıda saklanır (`localStorage`). Buradaki metinler ve varsayılanlar
          yönetim kaydıdır; hukuki metinleri çerez sayfası ve gizlilik politikasıyla uyumlu tutun.
        </p>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/40">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="banner_enabled"
            checked={config.banner_enabled}
            onChange={(e) => setConfig((c) => ({ ...c, banner_enabled: e.target.checked }))}
            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Vitrinde çerez bildirim şeridini göster</span>
        </label>
        <p className="mt-2 pl-7 text-xs text-neutral-500">Kapalıysa önyüzde çubuk çıkmaz (mevcut localStorage tercihleri etkilenmez).</p>
      </section>

      <section className="space-y-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Kategori açıklamaları</h2>

        {(
          [
            ['essential', 'Zorunlu'] as const,
            ['functional', 'İşlevsel'] as const,
            ['analytics', 'Analitik'] as const,
            ['marketing', 'Pazarlama'] as const,
          ] as const
        ).map(([key, title]) => {
          const cat = config.categories[key]
          const showToggle = key !== 'essential'
          return (
            <div
              key={key}
              className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-5 dark:border-neutral-700 dark:bg-neutral-900/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Field className="min-w-0 flex-1">
                  <Label>Başlık — {title}</Label>
                  <input
                    value={cat.label}
                    onChange={(e) => setCat(key, { label: e.target.value } as never)}
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                  />
                </Field>
                {showToggle && 'default_on' in cat && (
                  <label className="flex shrink-0 items-center gap-2 pt-6 text-sm">
                    <input
                      type="checkbox"
                      checked={cat.default_on}
                      onChange={(e) => setCat(key, { default_on: e.target.checked } as never)}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600"
                    />
                    Varsayılan açık
                  </label>
                )}
              </div>
              <Field className="mt-3">
                <Label>Açıklama</Label>
                <Textarea
                  rows={3}
                  value={cat.description}
                  onChange={(e) => setCat(key, { description: e.target.value } as never)}
                  className="mt-1"
                />
              </Field>
            </div>
          )
        })}
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-700">
        <ButtonPrimary type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Kaydet
        </ButtonPrimary>
        {msg ? <p className="text-sm text-neutral-600 dark:text-neutral-400">{msg}</p> : null}
      </div>
    </div>
  )
}
