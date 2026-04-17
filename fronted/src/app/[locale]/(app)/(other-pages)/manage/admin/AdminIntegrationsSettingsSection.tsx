'use client'

/**
 * Entegrasyon API Ayarları
 *
 * NetGSM, Resend e-posta, WhatsApp ve site temel ayarlarını
 * site_settings tablosuna kaydeder (key = "integrations").
 * Backend bildirim modülü bu değerleri DB'den okur, env fallback olarak kullanır.
 */

import React from 'react'
import { getStoredAuthToken } from '@/lib/auth-storage'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

interface IntegrationSettings {
  netgsm_usercode: string
  netgsm_password: string
  netgsm_msgheader: string
  resend_api_key: string
  supplier_notify_from: string
  invoice_notify_from: string
  whatsapp_api_key: string
  whatsapp_phone_id: string
  whatsapp_template_new_reservation: string
  site_url: string
}

const EMPTY: IntegrationSettings = {
  netgsm_usercode: '',
  netgsm_password: '',
  netgsm_msgheader: 'REZERVASYON',
  resend_api_key: '',
  supplier_notify_from: '',
  invoice_notify_from: '',
  whatsapp_api_key: '',
  whatsapp_phone_id: '',
  whatsapp_template_new_reservation: 'yeni_rezervasyon',
  site_url: '',
}

type Tab = 'sms' | 'email' | 'whatsapp' | 'general'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'sms', label: 'SMS — NetGSM', icon: '📱' },
  { id: 'email', label: 'E-posta — Resend', icon: '✉️' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'general', label: 'Genel', icon: '🔗' },
]

function Field({
  label,
  hint,
  name,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}: {
  label: string
  hint?: string
  name: keyof IntegrationSettings
  value: string
  onChange: (k: keyof IntegrationSettings, v: string) => void
  type?: string
  placeholder?: string
}) {
  const [show, setShow] = React.useState(false)
  const isSecret = type === 'password'
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      <div className="relative">
        <input
          type={isSecret && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          autoComplete="off"
          spellCheck={false}
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            {show ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
    </div>
  )
}

function SectionCard({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/50">
      <div className="mb-4">
        <h3 className="font-semibold text-neutral-800 dark:text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

export default function AdminIntegrationsSettingsSection() {
  const [settings, setSettings] = React.useState<IntegrationSettings>(EMPTY)
  const [activeTab, setActiveTab] = React.useState<Tab>('sms')
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [testPhone, setTestPhone] = React.useState('')
  const [testMsg, setTestMsg] = React.useState('Test SMS — RezervasyonYap')
  const [testResult, setTestResult] = React.useState<string | null>(null)
  const [testLoading, setTestLoading] = React.useState(false)

  const token = getStoredAuthToken()

  // Mevcut ayarları yükle
  React.useEffect(() => {
    if (!token) return
    fetch(`${API_BASE}/api/v1/site/settings?key=integrations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) return
        const data = await r.json()
        const row = Array.isArray(data.settings)
          ? data.settings.find((s: { key: string }) => s.key === 'integrations')
          : null
        if (row?.value_json) {
          const v = typeof row.value_json === 'string' ? JSON.parse(row.value_json) : row.value_json
          setSettings((prev) => ({ ...prev, ...v }))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const change = (k: keyof IntegrationSettings, v: string) => {
    setSettings((prev) => ({ ...prev, [k]: v }))
    setMsg(null)
  }

  const save = async () => {
    if (!token) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/site/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: 'integrations', value_json: JSON.stringify(settings) }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setMsg({ type: 'ok', text: 'Ayarlar kaydedildi.' })
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Kayıt başarısız.' })
    } finally {
      setSaving(false)
    }
  }

  const sendTestSms = async () => {
    if (!token || !testPhone.trim()) return
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/integrations/netgsm/sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gsm: testPhone.trim(), message: testMsg }),
      })
      const data = await res.json()
      setTestResult(res.ok ? `✅ Gönderildi: ${JSON.stringify(data)}` : `❌ Hata: ${JSON.stringify(data)}`)
    } catch (e) {
      setTestResult(`❌ ${e instanceof Error ? e.message : 'Bağlantı hatası'}`)
    } finally {
      setTestLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-white">Entegrasyon Ayarları</h2>
          <p className="mt-1 text-sm text-neutral-500">
            SMS, e-posta ve WhatsApp bildirim servislerinin API anahtarları.
            Burada girilen değerler veritabanına kaydedilir ve ortam değişkenlerini geçersiz kılar.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
        >
          {saving ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>

      {msg && (
        <div
          className={[
            'rounded-xl p-3 text-sm',
            msg.type === 'ok'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
          ].join(' ')}
        >
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-800/50">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={[
              'flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              activeTab === t.id
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200',
            ].join(' ')}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* SMS */}
      {activeTab === 'sms' && (
        <div className="space-y-4">
          <SectionCard
            title="NetGSM SMS Ayarları"
            subtitle="netgsm.com.tr API kimlik bilgileri"
          >
            <Field
              label="Kullanıcı Kodu (Usercode)"
              name="netgsm_usercode"
              value={settings.netgsm_usercode}
              onChange={change}
              placeholder="85xxxxxxx"
            />
            <Field
              label="Şifre"
              name="netgsm_password"
              value={settings.netgsm_password}
              onChange={change}
              type="password"
              placeholder="NetGSM şifreniz"
            />
            <Field
              label="SMS Başlığı (Msgheader)"
              name="netgsm_msgheader"
              value={settings.netgsm_msgheader}
              onChange={change}
              placeholder="REZERVASYON"
              hint="Alıcıda gösterilecek gönderen başlığı. NetGSM panelinden onaylı başlık olmalı."
            />
          </SectionCard>

          {/* Test SMS */}
          <SectionCard title="Test SMS Gönder" subtitle="Ayarlarınızın çalıştığını doğrulayın">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Alıcı Telefon
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+905xxxxxxxxx"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Mesaj
                </label>
                <textarea
                  value={testMsg}
                  onChange={(e) => setTestMsg(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
              <button
                onClick={sendTestSms}
                disabled={testLoading || !testPhone.trim()}
                className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
              >
                {testLoading ? 'Gönderiliyor…' : '📤 Test SMS Gönder'}
              </button>
              {testResult && (
                <p className="rounded-xl bg-neutral-100 p-2.5 font-mono text-xs dark:bg-neutral-700">{testResult}</p>
              )}
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Test SMS göndermeden önce yukarıdaki ayarları kaydetmeyi unutmayın.
              </p>
            </div>
          </SectionCard>
        </div>
      )}

      {/* E-posta */}
      {activeTab === 'email' && (
        <div className="space-y-4">
          <SectionCard
            title="Resend E-posta Ayarları"
            subtitle="resend.com — ücretsiz plan: 3.000 e-posta/ay"
          >
            <Field
              label="API Anahtarı"
              name="resend_api_key"
              value={settings.resend_api_key}
              onChange={change}
              type="password"
              placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              hint="resend.com → API Keys sayfasından alın."
            />
            <Field
              label="Tedarikçi Bildirimleri Gönderen Adresi"
              name="supplier_notify_from"
              value={settings.supplier_notify_from}
              onChange={change}
              placeholder="rezervasyon@siteniz.com.tr"
              hint="Resend'de doğrulanmış domain'e ait adres olmalı. (ör: rezervasyon@siteniz.com.tr)"
            />
            <Field
              label="Fatura Bildirimleri Gönderen Adresi"
              name="invoice_notify_from"
              value={settings.invoice_notify_from}
              onChange={change}
              placeholder="fatura@siteniz.com.tr"
            />
          </SectionCard>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/10 dark:text-blue-400">
            <strong>Domain Doğrulama:</strong> Resend ile kendi domain'inizden e-posta göndermek için{' '}
            <a
              href="https://resend.com/domains"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              resend.com/domains
            </a>{' '}
            sayfasından domain doğrulaması yapın. Ücretsiz plan 3.000 e-posta/ay, 100 e-posta/günlük limit içerir.
          </div>
        </div>
      )}

      {/* WhatsApp */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-4">
          <SectionCard
            title="WhatsApp Business API"
            subtitle="Meta WhatsApp Business API — Gelecek entegrasyon"
          >
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              WhatsApp mesajları şu an <strong>bildirim kuyruğuna</strong> alınmaktadır.
              Aşağıdaki alanları doldurduğunuzda Meta Business API üzerinden otomatik gönderim aktif hale gelecektir.
            </div>
            <Field
              label="WhatsApp Business API Anahtarı (Bearer Token)"
              name="whatsapp_api_key"
              value={settings.whatsapp_api_key}
              onChange={change}
              type="password"
              placeholder="EAAxxxxxxxxx..."
              hint="Meta for Developers → WhatsApp → API Setup sayfasından alın."
            />
            <Field
              label="Phone Number ID"
              name="whatsapp_phone_id"
              value={settings.whatsapp_phone_id}
              onChange={change}
              placeholder="1234567890123456"
              hint="Meta Business Manager'dan WhatsApp numaranıza ait Phone Number ID."
            />
            <Field
              label="Yeni Rezervasyon Şablon Adı"
              name="whatsapp_template_new_reservation"
              value={settings.whatsapp_template_new_reservation}
              onChange={change}
              placeholder="yeni_rezervasyon"
              hint="Meta'da onaylı mesaj şablon adı. Onaylanmamış şablonlar gönderilemez."
            />
          </SectionCard>

          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
            <h4 className="mb-2 font-semibold text-neutral-800 dark:text-white">NetGSM WhatsApp (Alternatif)</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              NetGSM aynı zamanda WhatsApp Business API hizmeti de sunmaktadır.
              Eğer Meta entegrasyonu kurmak istemiyorsanız NetGSM üzerinden WhatsApp aktivasyonu yaparak
              mevcut NetGSM API bilgilerinizle WhatsApp gönderimi yapabilirsiniz.
              <a
                href="https://www.netgsm.com.tr/whatsapp/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-primary-500 underline"
              >
                NetGSM WhatsApp →
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Genel */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          <SectionCard
            title="Site URL"
            subtitle="Bildirim e-postalarındaki tedarikçi onay linkini oluşturmak için kullanılır"
          >
            <Field
              label="Site URL"
              name="site_url"
              value={settings.site_url}
              onChange={change}
              placeholder="https://rezervasyonyap.com.tr"
              hint="Trailing slash olmadan girin. Tedarikçi onay linki: {site_url}/provizyon/{token}"
            />
          </SectionCard>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
            <h4 className="mb-3 font-semibold text-neutral-800 dark:text-white">Öncelik Sırası</h4>
            <ol className="space-y-1.5 text-sm text-neutral-600 dark:text-neutral-400">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">1</span>
                <span><strong>Veritabanı (bu sayfa)</strong> — Burada girilen değerler her zaman önce kullanılır.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-400 text-xs font-bold text-white">2</span>
                <span><strong>Ortam Değişkenleri (.env)</strong> — DB'de değer yoksa env'e bakılır.</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
