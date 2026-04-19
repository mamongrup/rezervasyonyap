'use client'

import { DEFAULT_FOOTER_SITE_CONFIG } from '@/lib/footer-site-defaults'
import type { FooterSiteColumn, FooterSiteConfig, FooterSiteLink, FooterTrustBadge } from '@/types/footer-site-config'
import I18nFieldEditor from '@/components/manage/i18n/I18nFieldEditor'
import { compactI18nField, pickI18nWithLegacy, type I18nFieldMap } from '@/lib/i18n-field'
import clsx from 'clsx'
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

/**
 * Eski (TR/EN) ve yeni (`_i18n` map) alanları birleştirir; UI tarafı yalnızca
 * yeni map ile çalışır, kaydederken legacy alanları da TR/EN değerleriyle senkronlayarak
 * geriye dönük uyumluluğu korur (eski client'lar yeni alana bakmasa bile metin görür).
 */
function mergeLegacyToI18n(legacy: { tr?: string; en?: string }, i18n: I18nFieldMap | undefined): I18nFieldMap {
  const merged: I18nFieldMap = { ...(i18n ?? {}) }
  if (!merged.tr && legacy.tr) merged.tr = legacy.tr
  if (!merged.en && legacy.en) merged.en = legacy.en
  return merged
}

function syncLegacyFromI18n(map: I18nFieldMap): { tr: string; en: string } {
  return { tr: map.tr ?? '', en: map.en ?? '' }
}

const emptyLink = (): FooterSiteLink => ({
  nameTr: '',
  nameEn: '',
  name_i18n: {},
  href: '/',
})

function LinkRowEditor({
  link,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canUp,
  canDown,
}: {
  link: FooterSiteLink
  onChange: (next: FooterSiteLink) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canUp: boolean
  canDown: boolean
}) {
  const nameMap = mergeLegacyToI18n({ tr: link.nameTr, en: link.nameEn }, link.name_i18n)
  const handleNameChange = (next: I18nFieldMap) => {
    const compact = compactI18nField(next)
    const legacy = syncLegacyFromI18n(compact)
    onChange({
      ...link,
      nameTr: legacy.tr,
      nameEn: legacy.en,
      name_i18n: compact,
    })
  }
  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-neutral-200/80 bg-white/80 p-3 shadow-sm transition hover:border-[color:var(--manage-primary)]/30 dark:border-neutral-700 dark:bg-neutral-900/50">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <div className="min-w-0 flex-1">
          <I18nFieldEditor
            label="Etiket"
            value={nameMap}
            onChange={handleNameChange}
            placeholder="Bağlantı adı"
          />
        </div>
        <div className="min-w-0 sm:max-w-xs sm:flex-1">
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">URL</label>
          <input
            value={link.href}
            onChange={(e) => onChange({ ...link, href: e.target.value })}
            placeholder="/yol"
            className="block w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 font-mono text-xs focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-600 dark:bg-neutral-800"
          />
          <div className="mt-2 flex items-center justify-end gap-0.5">
            <button type="button" disabled={!canUp} onClick={onMoveUp} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30 dark:hover:bg-neutral-800">
              <ArrowUp className="h-4 w-4" />
            </button>
            <button type="button" disabled={!canDown} onClick={onMoveDown} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30 dark:hover:bg-neutral-800">
              <ArrowDown className="h-4 w-4" />
            </button>
            <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40">
              <span className="sr-only">Sil</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TrustBadgeEditor({
  badge,
  index,
  onChange,
}: {
  badge: FooterTrustBadge
  index: number
  onChange: (b: FooterTrustBadge) => void
}) {
  const variants: FooterTrustBadge['variant'][] = ['green', 'blue', 'amber']
  const titleMap = mergeLegacyToI18n({ tr: badge.titleTr, en: badge.titleEn }, badge.title_i18n)
  const subtitleMap = mergeLegacyToI18n({ tr: badge.subtitleTr, en: badge.subtitleEn }, badge.subtitle_i18n)
  return (
    <div className="rounded-2xl border border-neutral-200/90 bg-gradient-to-br from-white to-neutral-50/80 p-4 shadow-sm dark:border-neutral-700 dark:from-neutral-900 dark:to-neutral-950/80">
      <div className="mb-3 flex items-center gap-2">
        <Shield className="h-4 w-4 text-[color:var(--manage-primary)]" />
        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Rozet {index + 1}</span>
        <select
          value={badge.variant}
          onChange={(e) => onChange({ ...badge, variant: e.target.value as FooterTrustBadge['variant'] })}
          className="ms-auto rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] dark:border-neutral-600 dark:bg-neutral-800"
        >
          {variants.map((v) => (
            <option key={v} value={v}>
              {v === 'green' ? 'Yeşil (güven)' : v === 'blue' ? 'Mavi (ödeme)' : 'Turuncu (TÜRSAB)'}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-3">
        <I18nFieldEditor
          label="Başlık"
          value={titleMap}
          onChange={(next) => {
            const compact = compactI18nField(next)
            const legacy = syncLegacyFromI18n(compact)
            onChange({ ...badge, titleTr: legacy.tr, titleEn: legacy.en, title_i18n: compact })
          }}
          placeholder="Rozet başlığı"
        />
        <I18nFieldEditor
          label="Alt metin"
          value={subtitleMap}
          onChange={(next) => {
            const compact = compactI18nField(next)
            const legacy = syncLegacyFromI18n(compact)
            onChange({ ...badge, subtitleTr: legacy.tr, subtitleEn: legacy.en, subtitle_i18n: compact })
          }}
          placeholder="Rozet alt metni"
          rows={2}
        />
      </div>
    </div>
  )
}

export default function HeaderFooterManageClient() {
  const [cfg, setCfg] = useState<FooterSiteConfig>(() => JSON.parse(JSON.stringify(DEFAULT_FOOTER_SITE_CONFIG)))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [openCols, setOpenCols] = useState<Record<number, boolean>>(() =>
    Object.fromEntries([0, 1, 2, 3, 4].map((i) => [i, true])),
  )

  const load = useCallback(async () => {
    setLoading(true)
    setLoadErr(null)
    try {
      const res = await fetch('/api/site-footer', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(res.status === 401 ? 'Oturum gerekli' : 'Yüklenemedi')
      const data = (await res.json()) as { ok?: boolean; config?: FooterSiteConfig }
      if (data.config) setCfg(data.config)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Hata')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const updateBadge = (i: number, b: FooterTrustBadge) => {
    setCfg((c) => {
      const next = [...c.trustBadges] as [FooterTrustBadge, FooterTrustBadge, FooterTrustBadge]
      next[i] = b
      return { ...c, trustBadges: next }
    })
  }

  const updateColumn = (ci: number, col: FooterSiteColumn) => {
    setCfg((c) => {
      const cols = [...c.columns]
      cols[ci] = col
      return { ...c, columns: cols }
    })
  }

  const moveColumn = (ci: number, dir: -1 | 1) => {
    setCfg((c) => {
      const j = ci + dir
      if (j < 0 || j >= c.columns.length) return c
      const cols = [...c.columns]
      ;[cols[ci], cols[j]] = [cols[j], cols[ci]]
      return { ...c, columns: cols }
    })
  }

  const addColumn = () => {
    setCfg((c) => ({
      ...c,
      columns: [
        ...c.columns,
        {
          titleTr: 'Yeni sütun',
          titleEn: 'New column',
          title_i18n: { tr: 'Yeni sütun', en: 'New column' },
          links: [emptyLink()],
        },
      ],
    }))
  }

  const removeColumn = (ci: number) => {
    if (cfg.columns.length <= 1) return
    setCfg((c) => ({ ...c, columns: c.columns.filter((_, i) => i !== ci) }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/site-footer', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      if (!res.ok) throw new Error('Kayıt başarısız')
      setSaved(true)
      setTimeout(() => setSaved(false), 2800)
    } catch {
      setLoadErr('Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const handleResetFile = async () => {
    if (!confirm('Dosyayı silip varsayılan footer’a dönmek istiyor musunuz?')) return
    await fetch('/api/site-footer', { method: 'DELETE', credentials: 'same-origin' })
    setCfg(JSON.parse(JSON.stringify(DEFAULT_FOOTER_SITE_CONFIG)))
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[color:var(--manage-primary)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50/90 to-neutral-100/50 pb-24 dark:from-neutral-950 dark:to-neutral-900">
      <div className="border-b border-neutral-200/80 bg-white/70 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/70">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[color:var(--manage-primary-soft)] px-3 py-1 text-xs font-medium text-[color:var(--manage-primary)]">
                <Sparkles className="h-3.5 w-3.5" />
                Site alt bilgi
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Footer yönetimi</h1>
              <p className="mt-1 max-w-xl text-sm text-neutral-500 dark:text-neutral-400">
                Sol blok (tagline, güven rozetleri) ve beş sütunlu bağlantı alanlarını buradan düzenleyin. Kayıt{' '}
                <code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">public/site-data/footer.json</code> dosyasına yazılır.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCfg(JSON.parse(JSON.stringify(DEFAULT_FOOTER_SITE_CONFIG)))}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                <RotateCcw className="h-4 w-4" />
                Varsayılan içerik
              </button>
              <button
                type="button"
                onClick={() => void handleResetFile()}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-800 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              >
                Dosyayı sıfırla
              </button>
            </div>
          </div>
          {loadErr ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{loadErr}</p> : null}
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Tagline */}
        <section className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-lg shadow-neutral-200/40 dark:border-neutral-700 dark:bg-neutral-900 dark:shadow-none">
          <div className="border-b border-neutral-100 bg-gradient-to-r from-violet-500/10 via-transparent to-cyan-500/10 px-6 py-4 dark:border-neutral-800">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              <LayoutGrid className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              Marka metni (logo altı)
            </h2>
          </div>
          <div className="p-6">
            <I18nFieldEditor
              label="Marka açıklaması"
              description="Logonun altında görünür. 6 dilin tümü için ayrı metin girilebilir."
              value={mergeLegacyToI18n({ tr: cfg.taglineTr, en: cfg.taglineEn }, cfg.tagline_i18n)}
              onChange={(next) => {
                const compact = compactI18nField(next)
                const legacy = syncLegacyFromI18n(compact)
                setCfg((c) => ({ ...c, taglineTr: legacy.tr, taglineEn: legacy.en, tagline_i18n: compact }))
              }}
              rows={3}
              placeholder="Kısa marka tanımı"
            />
          </div>
        </section>

        {/* Trust badges */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-lg shadow-neutral-200/40 dark:border-neutral-700 dark:bg-neutral-900 dark:shadow-none">
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-100">Güven rozetleri (3 kart)</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {cfg.trustBadges.map((b, i) => (
              <TrustBadgeEditor key={i} index={i} badge={b} onChange={(nb) => updateBadge(i, nb)} />
            ))}
          </div>
        </section>

        {/* Columns */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Bağlantı sütunları</h2>
            <button
              type="button"
              onClick={addColumn}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[color:var(--manage-primary-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--manage-primary)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Sütun ekle
            </button>
          </div>

          {cfg.columns.map((col, ci) => (
            <div
              key={ci}
              className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-md shadow-neutral-200/30 dark:border-neutral-700 dark:bg-neutral-900 dark:shadow-none"
            >
              <div className="flex w-full items-stretch border-b border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setOpenCols((o) => ({ ...o, [ci]: !o[ci] }))}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                >
                  {openCols[ci] ? <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />}
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">{
                    pickI18nWithLegacy(
                      { tr: col.titleTr, en: col.titleEn },
                      col.title_i18n,
                      'tr',
                      `Sütun ${ci + 1}`,
                    )
                  }</span>
                  <span className="text-xs text-neutral-400">{col.links.length} bağlantı</span>
                </button>
                <div className="flex shrink-0 items-center gap-1 pe-4">
                  <button type="button" disabled={ci === 0} onClick={() => moveColumn(ci, -1)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={ci >= cfg.columns.length - 1} onClick={() => moveColumn(ci, 1)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => removeColumn(ci)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40">
                    Sil
                  </button>
                </div>
              </div>
              {openCols[ci] ? (
                <div className="space-y-4 p-4">
                  <I18nFieldEditor
                    label="Sütun başlığı"
                    value={mergeLegacyToI18n({ tr: col.titleTr, en: col.titleEn }, col.title_i18n)}
                    onChange={(next) => {
                      const compact = compactI18nField(next)
                      const legacy = syncLegacyFromI18n(compact)
                      updateColumn(ci, { ...col, titleTr: legacy.tr, titleEn: legacy.en, title_i18n: compact })
                    }}
                    placeholder="Sütun başlığı"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-neutral-500">Bağlantılar</span>
                      <button
                        type="button"
                        onClick={() => updateColumn(ci, { ...col, links: [...col.links, emptyLink()] })}
                        className="text-xs font-semibold text-[color:var(--manage-primary)]"
                      >
                        + Bağlantı ekle
                      </button>
                    </div>
                    {col.links.map((link, li) => (
                      <LinkRowEditor
                        key={li}
                        link={link}
                        onChange={(next) => {
                          const links = [...col.links]
                          links[li] = next
                          updateColumn(ci, { ...col, links })
                        }}
                        onRemove={() => updateColumn(ci, { ...col, links: col.links.filter((_, j) => j !== li) })}
                        onMoveUp={() => {
                          if (li === 0) return
                          const links = [...col.links]
                          ;[links[li - 1], links[li]] = [links[li], links[li - 1]]
                          updateColumn(ci, { ...col, links })
                        }}
                        onMoveDown={() => {
                          if (li >= col.links.length - 1) return
                          const links = [...col.links]
                          ;[links[li], links[li + 1]] = [links[li + 1], links[li]]
                          updateColumn(ci, { ...col, links })
                        }}
                        canUp={li > 0}
                        canDown={li < col.links.length - 1}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </section>

        {/* Legal */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-lg shadow-neutral-200/40 dark:border-neutral-700 dark:bg-neutral-900 dark:shadow-none">
          <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-100">Alt şerit — yasal linkler</h2>
          <div className="space-y-2">
            {cfg.legalLinks.map((link, li) => (
              <LinkRowEditor
                key={li}
                link={link}
                onChange={(next) => {
                  const legalLinks = [...cfg.legalLinks]
                  legalLinks[li] = next
                  setCfg((c) => ({ ...c, legalLinks }))
                }}
                onRemove={() => setCfg((c) => ({ ...c, legalLinks: c.legalLinks.filter((_, j) => j !== li) }))}
                onMoveUp={() => {
                  if (li === 0) return
                  const legalLinks = [...cfg.legalLinks]
                  ;[legalLinks[li - 1], legalLinks[li]] = [legalLinks[li], legalLinks[li - 1]]
                  setCfg((c) => ({ ...c, legalLinks }))
                }}
                onMoveDown={() => {
                  if (li >= cfg.legalLinks.length - 1) return
                  const legalLinks = [...cfg.legalLinks]
                  ;[legalLinks[li], legalLinks[li + 1]] = [legalLinks[li + 1], legalLinks[li]]
                  setCfg((c) => ({ ...c, legalLinks }))
                }}
                canUp={li > 0}
                canDown={li < cfg.legalLinks.length - 1}
              />
            ))}
            <button
              type="button"
              onClick={() => setCfg((c) => ({ ...c, legalLinks: [...c.legalLinks, emptyLink()] }))}
              className="w-full rounded-xl border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-500 hover:border-[color:var(--manage-primary)] hover:text-[color:var(--manage-primary)] dark:border-neutral-600"
            >
              + Yasal link ekle
            </button>
          </div>
        </section>
      </div>

      {/* Sticky save */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200/90 bg-white/95 py-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-3 px-4 sm:px-6 lg:px-8">
          <span className="text-xs text-neutral-500">Sosyal medya linkleri site genel ayarlarından (ortam değişkenleri) gelir.</span>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className={clsx(
              'inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold text-white shadow-lg transition disabled:opacity-60',
              saved ? 'bg-emerald-600 shadow-emerald-500/25' : 'bg-[color:var(--manage-primary)] shadow-[color:var(--manage-primary)]/25',
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Kaydedildi' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
