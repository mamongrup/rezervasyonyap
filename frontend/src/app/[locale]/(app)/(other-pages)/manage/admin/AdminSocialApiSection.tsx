'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { listSiteSettings, upsertSiteSetting } from '@/lib/travel-api'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Save,
  RefreshCw,
} from 'lucide-react'

// ─── Tip tanımları ────────────────────────────────────────────────────────────

interface MetaSettings {
  app_id: string
  app_secret: string
  page_id: string
  page_access_token: string
  instagram_account_id: string
  auto_post: boolean
}

interface TwitterSettings {
  api_key: string
  api_secret: string
  bearer_token: string
  access_token: string
  access_token_secret: string
  auto_post: boolean
}

interface PinterestSettings {
  app_id: string
  app_secret: string
  access_token: string
  board_id: string
  auto_post: boolean
}

interface TikTokSettings {
  client_key: string
  client_secret: string
  access_token: string
  auto_post: boolean
}

interface YouTubeSettings {
  api_key: string
  channel_id: string
  auto_post: boolean
}

interface LinkedInSettings {
  client_id: string
  client_secret: string
  access_token: string
  organization_id: string
  auto_post: boolean
}

interface SocialApiSettings {
  meta: MetaSettings
  twitter: TwitterSettings
  pinterest: PinterestSettings
  tiktok: TikTokSettings
  youtube: YouTubeSettings
  linkedin: LinkedInSettings
}

const EMPTY: SocialApiSettings = {
  meta: { app_id: '', app_secret: '', page_id: '', page_access_token: '', instagram_account_id: '', auto_post: true },
  twitter: { api_key: '', api_secret: '', bearer_token: '', access_token: '', access_token_secret: '', auto_post: true },
  pinterest: { app_id: '', app_secret: '', access_token: '', board_id: '', auto_post: false },
  tiktok: { client_key: '', client_secret: '', access_token: '', auto_post: false },
  youtube: { api_key: '', channel_id: '', auto_post: false },
  linkedin: { client_id: '', client_secret: '', access_token: '', organization_id: '', auto_post: false },
}

type PlatformId = keyof SocialApiSettings

// ─── Platform tanımları ───────────────────────────────────────────────────────

const PLATFORMS: {
  id: PlatformId
  label: string
  icon: string
  color: string
  docsUrl: string
  description: string
}[] = [
  {
    id: 'meta',
    label: 'Instagram & Facebook (Meta)',
    icon: '📘',
    color: '#1877F2',
    docsUrl: 'https://developers.facebook.com/apps/',
    description: 'Meta Business API — ilan paylaşımları Instagram ve Facebook sayfanıza otomatik gönderilir.',
  },
  {
    id: 'twitter',
    label: 'Twitter / X',
    icon: '🐦',
    color: '#000000',
    docsUrl: 'https://developer.twitter.com/en/portal/dashboard',
    description: 'Twitter API v2 — yeni ilanlar ve kampanyalar otomatik tweet atılır.',
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    icon: '📌',
    color: '#E60023',
    docsUrl: 'https://developers.pinterest.com/',
    description: 'Pinterest Business API — ilan görselleri belirtilen board\'a pin olarak eklenir.',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: '🎵',
    color: '#010101',
    docsUrl: 'https://developers.tiktok.com/',
    description: 'TikTok Content Posting API — video içerikler TikTok\'a otomatik yüklenir.',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: '▶️',
    color: '#FF0000',
    docsUrl: 'https://console.cloud.google.com/',
    description: 'YouTube Data API v3 — video içerikler ve playlist yönetimi.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    docsUrl: 'https://www.linkedin.com/developers/',
    description: 'LinkedIn Marketing API — şirket sayfanıza otomatik içerik paylaşımı.',
  },
]

// ─── SecretField helper ───────────────────────────────────────────────────────

function SecretField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[color:var(--manage-card-border)] bg-[color:var(--manage-input-bg)] px-3 py-2 pr-9 font-mono text-sm text-[color:var(--manage-text)] placeholder:text-neutral-400 focus:border-[color:var(--manage-primary)] focus:outline-none focus:ring-1 focus:ring-[color:var(--manage-primary)]"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {hint && <p className="mt-1 text-[11px] text-neutral-400">{hint}</p>}
    </div>
  )
}

function PlainField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  mono = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  mono?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={[
          'w-full rounded-xl border border-[color:var(--manage-card-border)] bg-[color:var(--manage-input-bg)] px-3 py-2 text-sm text-[color:var(--manage-text)] placeholder:text-neutral-400 focus:border-[color:var(--manage-primary)] focus:outline-none focus:ring-1 focus:ring-[color:var(--manage-primary)]',
          mono ? 'font-mono' : '',
        ].join(' ')}
      />
      {hint && <p className="mt-1 text-[11px] text-neutral-400">{hint}</p>}
    </div>
  )
}

function ToggleField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  hint?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[color:var(--manage-card-border)] p-3 hover:bg-[color:var(--manage-hover-bg)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[color:var(--manage-primary)]"
      />
      <div>
        <p className="text-sm font-medium text-[color:var(--manage-text)]">{label}</p>
        {hint && <p className="text-[11px] text-neutral-400">{hint}</p>}
      </div>
    </label>
  )
}

// ─── Platform form alanları ───────────────────────────────────────────────────

function MetaForm({
  s,
  onChange,
}: {
  s: MetaSettings
  onChange: (k: keyof MetaSettings, v: string | boolean) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <PlainField label="App ID" value={s.app_id} onChange={(v) => onChange('app_id', v)} placeholder="123456789012345" mono />
        <SecretField label="App Secret" value={s.app_secret} onChange={(v) => onChange('app_secret', v)} placeholder="••••••••••••••••••••••••••••••••" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <PlainField label="Facebook Sayfa ID" value={s.page_id} onChange={(v) => onChange('page_id', v)} placeholder="12345678901234" mono />
        <PlainField label="Instagram Business Account ID" value={s.instagram_account_id} onChange={(v) => onChange('instagram_account_id', v)} placeholder="12345678901234" mono />
      </div>
      <SecretField
        label="Page Access Token (uzun ömürlü)"
        value={s.page_access_token}
        onChange={(v) => onChange('page_access_token', v)}
        placeholder="EAAxxxxx..."
        hint="Meta Business Suite → Araçlar → Graph API Explorer → Uzun Ömürlü Token Üret"
      />
      <ToggleField label="Yeni ilanlarda otomatik paylaş" checked={s.auto_post} onChange={(v) => onChange('auto_post', v)} hint="Ilan yayınlandığında Instagram ve Facebook sayfasına otomatik gönderi paylaşılır." />
    </div>
  )
}

function TwitterForm({
  s,
  onChange,
}: {
  s: TwitterSettings
  onChange: (k: keyof TwitterSettings, v: string | boolean) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SecretField label="API Anahtarı (Consumer Key)" value={s.api_key} onChange={(v) => onChange('api_key', v)} />
        <SecretField label="API Secret (Consumer Secret)" value={s.api_secret} onChange={(v) => onChange('api_secret', v)} />
      </div>
      <SecretField label="Bearer Token" value={s.bearer_token} onChange={(v) => onChange('bearer_token', v)} hint="Yalnızca okuma işlemleri için kullanılır." />
      <div className="grid gap-4 sm:grid-cols-2">
        <SecretField label="Access Token" value={s.access_token} onChange={(v) => onChange('access_token', v)} />
        <SecretField label="Access Token Secret" value={s.access_token_secret} onChange={(v) => onChange('access_token_secret', v)} />
      </div>
      <ToggleField label="Yeni ilanlarda otomatik tweet at" checked={s.auto_post} onChange={(v) => onChange('auto_post', v)} />
    </div>
  )
}

function PinterestForm({
  s,
  onChange,
}: {
  s: PinterestSettings
  onChange: (k: keyof PinterestSettings, v: string | boolean) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SecretField label="App ID" value={s.app_id} onChange={(v) => onChange('app_id', v)} />
        <SecretField label="App Secret" value={s.app_secret} onChange={(v) => onChange('app_secret', v)} />
      </div>
      <SecretField label="Access Token" value={s.access_token} onChange={(v) => onChange('access_token', v)} hint="OAuth 2.0 ile alınan kullanıcı erişim token'ı." />
      <PlainField label="Board ID" value={s.board_id} onChange={(v) => onChange('board_id', v)} placeholder="username/board-name" mono hint="Pin'lerin ekleneceği board." />
      <ToggleField label="Yeni ilanlarda otomatik pin ekle" checked={s.auto_post} onChange={(v) => onChange('auto_post', v)} />
    </div>
  )
}

function TikTokForm({
  s,
  onChange,
}: {
  s: TikTokSettings
  onChange: (k: keyof TikTokSettings, v: string | boolean) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SecretField label="Client Key" value={s.client_key} onChange={(v) => onChange('client_key', v)} />
        <SecretField label="İstemci Gizli Anahtarı" value={s.client_secret} onChange={(v) => onChange('client_secret', v)} />
      </div>
      <SecretField label="Access Token" value={s.access_token} onChange={(v) => onChange('access_token', v)} hint="TikTok for Developers → My Apps → API Token" />
      <ToggleField label="Video içerikler otomatik yüklensin" checked={s.auto_post} onChange={(v) => onChange('auto_post', v)} />
    </div>
  )
}

function YouTubeForm({
  s,
  onChange,
}: {
  s: YouTubeSettings
  onChange: (k: keyof YouTubeSettings, v: string | boolean) => void
}) {
  return (
    <div className="space-y-4">
      <SecretField label="YouTube Data API Anahtarı" value={s.api_key} onChange={(v) => onChange('api_key', v)} hint="Google Cloud Console → API ve Hizmetler → YouTube Data API v3" />
      <PlainField label="Channel ID" value={s.channel_id} onChange={(v) => onChange('channel_id', v)} placeholder="UCxxxxxxxxxxxxxxxxxxxxxxxx" mono hint="YouTube Studio → Kanalınız → Kanal Detayları" />
      <ToggleField label="Video paylaşımı etkin" checked={s.auto_post} onChange={(v) => onChange('auto_post', v)} />
    </div>
  )
}

function LinkedInForm({
  s,
  onChange,
}: {
  s: LinkedInSettings
  onChange: (k: keyof LinkedInSettings, v: string | boolean) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SecretField label="İstemci ID" value={s.client_id} onChange={(v) => onChange('client_id', v)} />
        <SecretField label="İstemci Gizli Anahtarı" value={s.client_secret} onChange={(v) => onChange('client_secret', v)} />
      </div>
      <SecretField label="Access Token" value={s.access_token} onChange={(v) => onChange('access_token', v)} hint="60 günde bir yenilenmesi gerekir. LinkedIn → Developers → Auth" />
      <PlainField label="Kurum ID (urn:li:organization:...)" value={s.organization_id} onChange={(v) => onChange('organization_id', v)} placeholder="12345678" mono hint="Şirket sayfanızın LinkedIn ID'si." />
      <ToggleField label="Şirket sayfasına otomatik paylaş" checked={s.auto_post} onChange={(v) => onChange('auto_post', v)} />
    </div>
  )
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export default function AdminSocialApiSection() {
  const [settings, setSettings] = useState<SocialApiSettings>(EMPTY)
  const [openPlatform, setOpenPlatform] = useState<PlatformId | null>('meta')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = getStoredAuthToken() ?? ''

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await listSiteSettings(token, { key: 'social_api' })
      const row = res.settings.find((s) => s.key === 'social_api')
      if (row) {
        const parsed = JSON.parse(row.value_json) as Partial<SocialApiSettings>
        setSettings({
          meta: { ...EMPTY.meta, ...(parsed.meta ?? {}) },
          twitter: { ...EMPTY.twitter, ...(parsed.twitter ?? {}) },
          pinterest: { ...EMPTY.pinterest, ...(parsed.pinterest ?? {}) },
          tiktok: { ...EMPTY.tiktok, ...(parsed.tiktok ?? {}) },
          youtube: { ...EMPTY.youtube, ...(parsed.youtube ?? {}) },
          linkedin: { ...EMPTY.linkedin, ...(parsed.linkedin ?? {}) },
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { void load() }, [load])

  async function save() {
    if (!token) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await upsertSiteSetting(token, {
        key: 'social_api',
        value_json: JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save_failed')
    } finally {
      setSaving(false)
    }
  }

  function updatePlatform<P extends PlatformId>(
    platform: P,
    key: keyof SocialApiSettings[P],
    value: string | boolean,
  ) {
    setSettings((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [key]: value },
    }))
  }

  const configuredCount = PLATFORMS.filter((p) => {
    const s = settings[p.id] as unknown as Record<string, string | boolean>
    return Object.entries(s).some(([k, v]) => k !== 'auto_post' && v !== '')
  }).length

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--manage-text)]">Sosyal Medya API Ayarları</h2>
          <p className="mt-1 text-sm text-[color:var(--manage-text-muted)]">
            Platform API anahtarlarınızı girin. Ayarlar şifreli olarak veritabanında saklanır ve paylaşım worker'ı tarafından kullanılır.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-[color:var(--manage-card-border)] px-3 py-2 text-sm text-[color:var(--manage-text-muted)] hover:bg-[color:var(--manage-hover-bg)] disabled:opacity-50"
          >
            <RefreshCw className={['h-3.5 w-3.5', loading ? 'animate-spin' : ''].join(' ')} />
            Yenile
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Kaydediliyor…' : saved ? 'Kaydedildi!' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* Durum + hata */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </div>
      )}
      {!loading && (
        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--manage-card-border)] bg-[color:var(--manage-card-bg)] px-4 py-3 text-sm backdrop-blur-sm">
          <span className="text-[color:var(--manage-text-muted)]">Yapılandırılmış platform:</span>
          <span className="font-semibold text-[color:var(--manage-primary)]">{configuredCount} / {PLATFORMS.length}</span>
          {configuredCount === 0 && (
            <span className="ml-2 text-neutral-400">— Aşağıdan platform genişletin ve API bilgilerini girin.</span>
          )}
        </div>
      )}

      {/* Platform listesi (accordion) */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[color:var(--manage-primary)]" />
          <span className="ml-3 text-sm text-[color:var(--manage-text-muted)]">Ayarlar yükleniyor…</span>
        </div>
      ) : (
        <div className="space-y-3">
          {PLATFORMS.map((platform) => {
            const isOpen = openPlatform === platform.id
            const platformSettings = settings[platform.id] as unknown as Record<string, string | boolean>
            const isConfigured = Object.entries(platformSettings).some(([k, v]) => k !== 'auto_post' && v !== '')

            return (
              <div
                key={platform.id}
                className="rounded-2xl border border-[color:var(--manage-card-border)] bg-[color:var(--manage-card-bg)] backdrop-blur-sm transition-all"
              >
                {/* Platform başlığı */}
                <button
                  type="button"
                  onClick={() => setOpenPlatform(isOpen ? null : platform.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                    style={{ backgroundColor: `${platform.color}18` }}
                  >
                    {platform.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[color:var(--manage-text)]">{platform.label}</span>
                      {isConfigured && (
                        <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400">
                          <Check className="h-2.5 w-2.5" /> Yapılandırıldı
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[color:var(--manage-text-muted)] line-clamp-1">{platform.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={platform.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 rounded-lg border border-[color:var(--manage-card-border)] px-2.5 py-1.5 text-[11px] text-[color:var(--manage-text-muted)] hover:bg-[color:var(--manage-hover-bg)] hover:text-[color:var(--manage-text)]"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Geliştirici Konsolu
                    </a>
                    {isOpen
                      ? <ChevronDown className="h-4 w-4 text-[color:var(--manage-text-muted)]" />
                      : <ChevronRight className="h-4 w-4 text-[color:var(--manage-text-muted)]" />}
                  </div>
                </button>

                {/* Platform form alanları */}
                {isOpen && (
                  <div className="border-t border-[color:var(--manage-card-border)] px-5 pb-6 pt-5">
                    <p className="mb-4 text-xs text-[color:var(--manage-text-muted)]">{platform.description}</p>
                    {platform.id === 'meta' && (
                      <MetaForm
                        s={settings.meta}
                        onChange={(k, v) => updatePlatform('meta', k, v)}
                      />
                    )}
                    {platform.id === 'twitter' && (
                      <TwitterForm
                        s={settings.twitter}
                        onChange={(k, v) => updatePlatform('twitter', k, v)}
                      />
                    )}
                    {platform.id === 'pinterest' && (
                      <PinterestForm
                        s={settings.pinterest}
                        onChange={(k, v) => updatePlatform('pinterest', k, v)}
                      />
                    )}
                    {platform.id === 'tiktok' && (
                      <TikTokForm
                        s={settings.tiktok}
                        onChange={(k, v) => updatePlatform('tiktok', k, v)}
                      />
                    )}
                    {platform.id === 'youtube' && (
                      <YouTubeForm
                        s={settings.youtube}
                        onChange={(k, v) => updatePlatform('youtube', k, v)}
                      />
                    )}
                    {platform.id === 'linkedin' && (
                      <LinkedInForm
                        s={settings.linkedin}
                        onChange={(k, v) => updatePlatform('linkedin', k, v)}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Bilgi notu */}
      <div className="rounded-2xl border border-blue-200/60 bg-blue-50/50 p-5 dark:border-blue-900/30 dark:bg-blue-950/10">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">Nasıl Çalışır?</h3>
        <ul className="space-y-1.5 text-xs text-blue-700 dark:text-blue-300">
          <li>• API anahtarları <code className="rounded bg-blue-100 px-1 dark:bg-blue-950/50">site_settings</code> tablosuna JSON olarak kaydedilir.</li>
          <li>• Sosyal medya worker&apos;ı her platform için ayrı kuyrukları işler ve <strong>auto_post</strong> aktifse yeni ilanları otomatik paylaşır.</li>
          <li>• <strong>Meta (Instagram/Facebook)</strong>: Graph API v17+ gerekir; sayfa token&apos;ı 60 günde bir uzun ömürlüye çevrilmeli.</li>
          <li>• <strong>Twitter/X</strong>: v2 API &quot;Free&quot; planında ayda 500 tweet yazma hakkı var.</li>
          <li>• Herhangi bir platform için token süresi dolduğunda paylaşım kuyruğu &quot;failed&quot; durumuna geçer, admin panelinden takip edebilirsiniz.</li>
        </ul>
      </div>
    </div>
  )
}
