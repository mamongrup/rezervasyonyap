'use client'

/**
 * Öznitelik Grupları & Tanımları Yönetim Sayfası
 * Sol: Grup listesi (ekle / sil)
 * Sağ: Seçili grubun öznitelikleri (ekle / sil)
 */

import { getStoredAuthToken } from '@/lib/auth-storage'
import { categoryLabelTr } from '@/lib/catalog-category-ui'
import { useManageT } from '@/lib/manage-i18n-context'
import { aiErrorMessage, translateOneToMany } from '@/lib/manage-content-ai'
import { ManageAiMagicTextButton } from '@/components/manage/ManageAiMagicTextButton'
import { slugifyMediaSegment } from '@/lib/upload-media-paths'
import {
  type AttributeDef,
  type AttributeGroup,
  createAttributeDef,
  createAttributeGroup,
  deleteAttributeDef,
  deleteAttributeGroup,
  getAuthMe,
  listAttributeDefs,
  listAttributeGroups,
  putAttributeDefTranslations,
  putAttributeGroupTranslations,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Field, Label } from '@/shared/fieldset'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const ORG_STORAGE_KEY = 'catalog_manage_organization_id'

/** Grup / öznitelik kodu: Türkçe → ascii, tire → alt çizgi */
function slugifyAttributeCode(raw: string): string {
  return slugifyMediaSegment(raw).replace(/-/g, '_').replace(/_{2,}/g, '_')
}

const ATTR_PREVIEW_LOCALES = [
  { code: 'tr', label: 'TR' },
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'ru', label: 'RU' },
  { code: 'zh', label: 'ZH' },
  { code: 'fr', label: 'FR' },
] as const

function allPreviewLocalesFilled(labels: Record<string, string>): boolean {
  return ATTR_PREVIEW_LOCALES.every((l) => (labels[l.code] ?? '').trim().length > 0)
}

const FIELD_TYPES = [
  { value: 'text', label: 'Metin' },
  { value: 'number', label: 'Sayı' },
  { value: 'boolean', label: 'Evet / Hayır' },
  { value: 'select', label: 'Tekli Seçim' },
  { value: 'multiselect', label: 'Çoklu Seçim' },
]

function Badge({ children, color = 'neutral' }: { children: React.ReactNode; color?: 'neutral' | 'blue' | 'green' }) {
  const cls = {
    neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  }[color]
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  )
}

function StatusMsg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return (
    <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${
      msg.ok
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
        : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300'
    }`}>
      {msg.text}
    </p>
  )
}

// ─── Grup Paneli ──────────────────────────────────────────────────────────────
function GroupPanel({
  code: categoryCode,
  selectedGroup,
  onSelect,
  previewLocale,
  scopeReady,
  needOrg,
  manageOrgId,
  orgReloadNonce,
}: {
  code: string
  selectedGroup: AttributeGroup | null
  onSelect: (g: AttributeGroup) => void
  previewLocale: string
  scopeReady: boolean
  needOrg: boolean
  /** Yönetici: API `organization_id`; boşsa istek gönderilmez */
  manageOrgId: string
  orgReloadNonce: number
}) {
  const [groups, setGroups] = useState<AttributeGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [form, setForm] = useState({ code: '', name: '', sort_order: '0' })
  const [transGroupId, setTransGroupId] = useState<string | null>(null)
  const [transGroupNames, setTransGroupNames] = useState<Record<string, string>>({})
  /** Kod alanı elle değiştiyse başlık yazarken ezme */
  const codeTouchedRef = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleAiTranslateGroup(overwrite: boolean) {
    const trText = (transGroupNames.tr ?? '').trim()
    if (!trText) {
      setMsg({ ok: false, text: 'Önce TR alanını doldurun.' })
      return
    }
    setAiBusy(true)
    setMsg(null)
    try {
      const targets = ATTR_PREVIEW_LOCALES.filter((l) => l.code !== 'tr').map((l) => l.code)
      const out = await translateOneToMany({
        text: trText,
        context: 'short_label',
        sourceLocale: 'tr',
        targetLocales: targets,
      })
      setTransGroupNames((prev) => {
        const next: Record<string, string> = { ...prev, tr: trText }
        for (const lc of targets) {
          const existing = (prev[lc] ?? '').trim()
          const fresh = out.ok[lc] ?? ''
          if (fresh && (overwrite || existing.length === 0)) {
            next[lc] = fresh
          }
        }
        return next
      })
      const filled = Object.keys(out.ok).length
      const failedLocales = out.failed.map((f) => f.locale.toUpperCase()).join(', ')
      const firstFailReason = out.failed[0] ? aiErrorMessage(new Error(out.failed[0].error)) : ''
      const failTail = failedLocales
        ? ` Başarısız: ${failedLocales}${firstFailReason ? ` (${firstFailReason})` : ''}.`
        : ''
      setMsg({
        ok: filled > 0,
        text:
          filled > 0
            ? `${filled} dile AI çevirisi geldi. Kontrol edip "Kaydet"e basın.` + failTail
            : `AI çeviri sonucu boş döndü.${firstFailReason ? ' Sebep: ' + firstFailReason : ' Ayarlar → Yapay Zeka anahtarını kontrol edin.'}`,
      })
    } catch (e) {
      setMsg({ ok: false, text: aiErrorMessage(e) })
    } finally {
      setAiBusy(false)
    }
  }

  const orgParam = needOrg && manageOrgId.trim() ? manageOrgId.trim() : undefined
  const groupListParams = useMemo(
    () => ({ ...(orgParam ? { organizationId: orgParam } : {}) }),
    [orgParam],
  )

  const load = useCallback(() => {
    const token = getStoredAuthToken()
    if (!token) return
    if (!scopeReady) return
    if (needOrg && !manageOrgId.trim()) {
      setGroups([])
      setLoading(false)
      return
    }
    setLoading(true)
    void listAttributeGroups(token, {
      categoryCode,
      locale: previewLocale,
      ...(orgParam ? { organizationId: orgParam } : {}),
    })
      .then((r) => setGroups(r.groups))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }, [
    categoryCode,
    previewLocale,
    scopeReady,
    needOrg,
    manageOrgId,
    orgReloadNonce,
  ])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!transGroupId) {
      setTransGroupNames({})
      return
    }
    const token = getStoredAuthToken()
    if (!token) return
    if (needOrg && !manageOrgId.trim()) return
    let cancelled = false
    void Promise.all(
      ATTR_PREVIEW_LOCALES.map((l) =>
        listAttributeGroups(token, {
          categoryCode,
          locale: l.code,
          ...groupListParams,
        }).then((r) => {
          const row = r.groups.find((x) => x.id === transGroupId)
          return [l.code, row?.name ?? ''] as const
        }),
      ),
    ).then((pairs) => {
      if (!cancelled) setTransGroupNames(Object.fromEntries(pairs))
    })
    return () => {
      cancelled = true
    }
  }, [transGroupId, categoryCode, groupListParams, needOrg, manageOrgId])

  async function saveGroupTranslations() {
    if (!transGroupId) return
    const token = getStoredAuthToken()
    if (!token) return
    if (!allPreviewLocalesFilled(transGroupNames)) {
      setMsg({ ok: false, text: 'Tüm dillerde (TR, EN, DE, RU, ZH, FR) grup başlığı girin.' })
      return
    }
    setBusy(true)
    try {
      const entries = ATTR_PREVIEW_LOCALES.map((l) => ({
        locale_code: l.code,
        name: (transGroupNames[l.code] ?? '').trim(),
      }))
      await putAttributeGroupTranslations(token, transGroupId, { entries }, orgParam)
      setMsg({ ok: true, text: 'Grup başlığı çevirileri kaydedildi.' })
      setTransGroupId(null)
      load()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
    } finally {
      setBusy(false)
    }
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setMsg(null)
    try {
      if (needOrg && !manageOrgId.trim()) {
        setMsg({ ok: false, text: 'Önce kurum UUID girin.' })
        return
      }
      const createdName = form.name.trim()
      const res = await createAttributeGroup(
        token,
        {
          code: form.code.trim(),
          name: createdName,
          category_codes: categoryCode,
          sort_order: form.sort_order.trim() || '0',
        },
        orgParam,
      )
      codeTouchedRef.current = false
      setForm({ code: '', name: '', sort_order: '0' })
      const init: Record<string, string> = {}
      for (const l of ATTR_PREVIEW_LOCALES) {
        init[l.code] = l.code === previewLocale ? createdName : ''
      }
      setTransGroupNames(init)
      setTransGroupId(res.id)
      setMsg({
        ok: true,
        text: 'Grup oluşturuldu. Aşağıda tüm dillerde başlığı tamamlayıp kaydedin.',
      })
      load()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'create_failed' })
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(g: AttributeGroup) {
    if (!confirm(`"${g.name}" grubunu ve tüm özniteliklerini sil?`)) return
    const token = getStoredAuthToken()
    if (!token) return
    try {
      await deleteAttributeGroup(token, g.id, orgParam)
      if (transGroupId === g.id) setTransGroupId(null)
      load()
      if (selectedGroup?.id === g.id) onSelect(groups[0] ?? g)
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'delete_failed' })
    }
  }

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
      {/* Başlık */}
      <div className="border-b border-neutral-100 px-5 py-4 dark:border-neutral-700">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          Öznitelik Grupları
        </h2>
        <p className="mt-0.5 text-xs text-neutral-400">
          {categoryLabelTr(categoryCode)} kategorisi
        </p>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-5 text-sm text-neutral-400">Yükleniyor…</p>
        ) : groups.length === 0 ? (
          <p className="p-5 text-sm text-neutral-400">Henüz grup yok.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {groups.map((g) => (
              <li key={g.id} className="group/row flex items-stretch">
                <button
                  type="button"
                  onClick={() => onSelect(g)}
                  className={`min-w-0 flex-1 px-4 py-3 text-left text-sm transition hover:bg-neutral-50 dark:hover:bg-neutral-700/50 ${
                    selectedGroup?.id === g.id
                      ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-950/20 dark:text-primary-300'
                      : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <p className="truncate font-medium">{g.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-neutral-400">{g.code}</p>
                </button>
                <div
                  className={`flex shrink-0 flex-col justify-center gap-1 pr-2 ${
                    transGroupId === g.id
                      ? 'opacity-100'
                      : 'opacity-0 transition group-hover/row:opacity-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setTransGroupId(transGroupId === g.id ? null : g.id)}
                    className="whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-950/30"
                  >
                    Diller
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(g)}
                    className="rounded p-1 text-neutral-300 hover:bg-red-50 hover:text-red-600 dark:text-neutral-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    title="Grubu sil"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {transGroupId ? (
        <div className="border-t border-primary-200 bg-primary-50/40 px-4 py-4 dark:border-primary-900/30 dark:bg-primary-950/15">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
              Grup başlığı — tüm diller
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <ManageAiMagicTextButton
                loading={aiBusy}
                disabled={busy}
                onClick={() => void handleAiTranslateGroup(false)}
                title="TR alanından boş olan diğer 5 dili AI ile doldur"
              >
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden>✨</span>
                  Boşları AI ile doldur
                </span>
              </ManageAiMagicTextButton>
              <button
                type="button"
                disabled={aiBusy || busy}
                onClick={() => void handleAiTranslateGroup(true)}
                className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-700 dark:bg-neutral-900 dark:text-amber-300 dark:hover:bg-amber-950/30"
                title="TR'den 5 dili yeniden çevir (mevcut çevirilerin üzerine yazar)"
              >
                Hepsini yeniden çevir
              </button>
            </div>
          </div>
          <StatusMsg msg={msg} />
          <div className="mt-2 grid max-h-[min(40vh,18rem)] gap-2 overflow-y-auto">
            {ATTR_PREVIEW_LOCALES.map((l) => (
              <Field key={l.code} className="block">
                <Label className="text-[11px]">
                  {l.label}
                  {l.code === 'tr' ? <span className="ml-1 text-neutral-400">(kaynak)</span> : null}
                </Label>
                <Input
                  value={transGroupNames[l.code] ?? ''}
                  onChange={(e) => setTransGroupNames((p) => ({ ...p, [l.code]: e.target.value }))}
                  className="mt-0.5 text-sm"
                />
              </Field>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonPrimary type="button" disabled={busy || aiBusy} className="text-xs" onClick={() => void saveGroupTranslations()}>
              {busy ? '…' : 'Kaydet'}
            </ButtonPrimary>
            <button type="button" className="text-xs text-neutral-500 underline" onClick={() => setTransGroupId(null)}>
              Kapat
            </button>
          </div>
        </div>
      ) : null}

      {/* Yeni Grup Formu */}
      <div className="border-t border-neutral-100 p-5 dark:border-neutral-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Yeni Grup
        </p>
        <form ref={formRef} onSubmit={(e) => void onAdd(e)} className="space-y-3">
          <Field className="block">
            <Label>Grup Adı <span className="text-red-500">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value
                setForm((p) => ({
                  ...p,
                  name,
                  code: codeTouchedRef.current ? p.code : slugifyAttributeCode(name),
                }))
              }}
              placeholder="ör: Donanım Özellikleri"
              className="mt-1 text-sm"
              required
            />
          </Field>
          <Field className="block">
            <Label>Kod <span className="text-red-500">*</span></Label>
            <Input
              value={form.code}
              onChange={(e) => {
                codeTouchedRef.current = true
                setForm((p) => ({ ...p, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))
              }}
              placeholder="ör: donanim"
              className="mt-1 font-mono text-xs"
              required
            />
          </Field>
          {!transGroupId ? <StatusMsg msg={msg} /> : null}
          <ButtonPrimary type="submit" disabled={busy} className="w-full justify-center text-sm">
            {busy ? '…' : '+ Grup Ekle'}
          </ButtonPrimary>
        </form>
      </div>
    </div>
  )
}

// ─── Öznitelik Paneli ─────────────────────────────────────────────────────────
function DefsPanel({
  group,
  previewLocale,
  needOrg,
  manageOrgId,
}: {
  group: AttributeGroup
  previewLocale: string
  needOrg: boolean
  manageOrgId: string
}) {
  const [defs, setDefs] = useState<AttributeDef[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [form, setForm] = useState({
    code: '',
    label: '',
    field_type: 'text',
    options_json: '',
    sort_order: '0',
  })
  const [transDefId, setTransDefId] = useState<string | null>(null)
  const [transLabels, setTransLabels] = useState<Record<string, string>>({})
  const defCodeTouchedRef = useRef(false)

  const orgParam = needOrg && manageOrgId.trim() ? manageOrgId.trim() : undefined
  const defListParams = useMemo(
    () => ({ locale: previewLocale, ...(orgParam ? { organizationId: orgParam } : {}) }),
    [previewLocale, orgParam],
  )

  const load = () => {
    const token = getStoredAuthToken()
    if (!token) return
    if (needOrg && !manageOrgId.trim()) {
      setDefs([])
      setLoading(false)
      return
    }
    setLoading(true)
    void listAttributeDefs(token, group.id, defListParams)
      .then((r) => setDefs(r.defs))
      .catch(() => setDefs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [group.id, defListParams, needOrg, manageOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!transDefId) {
      setTransLabels({})
      return
    }
    const token = getStoredAuthToken()
    if (!token) return
    let cancelled = false
    void Promise.all(
      ATTR_PREVIEW_LOCALES.map((l) =>
        listAttributeDefs(token, group.id, { ...defListParams, locale: l.code }).then((r) => {
          const row = r.defs.find((x) => x.id === transDefId)
          return [l.code, row?.label ?? ''] as const
        }),
      ),
    ).then((pairs) => {
      if (!cancelled) setTransLabels(Object.fromEntries(pairs))
    })
    return () => {
      cancelled = true
    }
  }, [transDefId, group.id, defListParams, needOrg, manageOrgId])

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setMsg(null)
    try {
      const createdLabel = form.label.trim()
      const res = await createAttributeDef(
        token,
        group.id,
        {
          code: form.code.trim(),
          label: createdLabel,
          field_type: form.field_type,
          options_json: form.options_json.trim() || undefined,
          sort_order: form.sort_order.trim() || '0',
        },
        orgParam,
      )
      defCodeTouchedRef.current = false
      setForm({ code: '', label: '', field_type: 'text', options_json: '', sort_order: '0' })
      const defInit: Record<string, string> = {}
      for (const l of ATTR_PREVIEW_LOCALES) {
        defInit[l.code] = l.code === previewLocale ? createdLabel : ''
      }
      setTransLabels(defInit)
      setTransDefId(res.id)
      setMsg({
        ok: true,
        text: 'Öznitelik eklendi. Aşağıda tüm dillerde etiketi tamamlayıp kaydedin.',
      })
      load()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'create_failed' })
    } finally {
      setBusy(false)
    }
  }

  async function handleAiTranslateDef(overwrite: boolean) {
    const trText = (transLabels.tr ?? '').trim()
    if (!trText) {
      setMsg({ ok: false, text: 'Önce TR alanını doldurun.' })
      return
    }
    setAiBusy(true)
    setMsg(null)
    try {
      const targets = ATTR_PREVIEW_LOCALES.filter((l) => l.code !== 'tr').map((l) => l.code)
      const out = await translateOneToMany({
        text: trText,
        context: 'short_label',
        sourceLocale: 'tr',
        targetLocales: targets,
      })
      setTransLabels((prev) => {
        const next: Record<string, string> = { ...prev, tr: trText }
        for (const lc of targets) {
          const existing = (prev[lc] ?? '').trim()
          const fresh = out.ok[lc] ?? ''
          if (fresh && (overwrite || existing.length === 0)) {
            next[lc] = fresh
          }
        }
        return next
      })
      const filled = Object.keys(out.ok).length
      const failedLocales = out.failed.map((f) => f.locale.toUpperCase()).join(', ')
      const firstFailReason = out.failed[0] ? aiErrorMessage(new Error(out.failed[0].error)) : ''
      const failTail = failedLocales
        ? ` Başarısız: ${failedLocales}${firstFailReason ? ` (${firstFailReason})` : ''}.`
        : ''
      setMsg({
        ok: filled > 0,
        text:
          filled > 0
            ? `${filled} dile AI çevirisi geldi. Kontrol edip "Kaydet"e basın.` + failTail
            : `AI çeviri sonucu boş döndü.${firstFailReason ? ' Sebep: ' + firstFailReason : ' Ayarlar → Yapay Zeka anahtarını kontrol edin.'}`,
      })
    } catch (e) {
      setMsg({ ok: false, text: aiErrorMessage(e) })
    } finally {
      setAiBusy(false)
    }
  }

  async function saveDefTranslations() {
    if (!transDefId) return
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    try {
      if (!allPreviewLocalesFilled(transLabels)) {
        setMsg({ ok: false, text: 'Tüm dillerde (TR, EN, DE, RU, ZH, FR) etiket girin.' })
        return
      }
      const entries = ATTR_PREVIEW_LOCALES.map((l) => ({
        locale_code: l.code,
        label: (transLabels[l.code] ?? '').trim(),
      }))
      await putAttributeDefTranslations(token, transDefId, { entries }, orgParam)
      setMsg({ ok: true, text: 'Öznitelik çevirileri kaydedildi.' })
      setTransDefId(null)
      load()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(d: AttributeDef) {
    if (!confirm(`"${d.label}" özniteliğini sil?`)) return
    const token = getStoredAuthToken()
    if (!token) return
    try {
      await deleteAttributeDef(token, d.id, orgParam)
      if (transDefId === d.id) setTransDefId(null)
      load()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'delete_failed' })
    }
  }

  const needsOptions = form.field_type === 'select' || form.field_type === 'multiselect'

  const inputCls =
    'block w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100'

  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
      {/* Başlık */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-700">
        <div>
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {group.name}
          </h2>
          <p className="mt-0.5 font-mono text-xs text-neutral-400">{group.code}</p>
        </div>
        <div className="flex items-center gap-2">
          {group.category_codes.length > 0 && (
            <div className="flex gap-1">
              {group.category_codes.map((c) => (
                <Badge key={c} color="blue">{c}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Öznitelik listesi */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-sm text-neutral-400">Yükleniyor…</p>
        ) : defs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-neutral-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Bu grupta öznitelik yok
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Aşağıdaki formdan ilk özniteliği ekleyin.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Öznitelik</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Tür</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Seçenekler</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Zorunlu</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Çeviri</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {defs.map((d) => (
                  <tr key={d.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-800 dark:text-neutral-200">{d.label}</p>
                      <p className="mt-0.5 font-mono text-xs text-neutral-400">{d.code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={d.field_type === 'boolean' ? 'green' : d.field_type.includes('select') ? 'blue' : 'neutral'}>
                        {FIELD_TYPES.find((f) => f.value === d.field_type)?.label ?? d.field_type}
                      </Badge>
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 font-mono text-xs text-neutral-400">
                      {d.options_json ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {d.is_required ? (
                        <span className="text-xs font-medium text-red-600">Evet</span>
                      ) : (
                        <span className="text-xs text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setTransDefId(transDefId === d.id ? null : d.id)}
                        className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                      >
                        Diller
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void onDelete(d)}
                        className="rounded p-1 text-neutral-300 transition hover:bg-red-50 hover:text-red-600 dark:text-neutral-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                        title="Sil"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {transDefId ? (
          <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50/40 p-4 dark:border-primary-900/40 dark:bg-primary-950/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                Öznitelik etiketi — tüm diller ({defs.find((x) => x.id === transDefId)?.code ?? ''})
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <ManageAiMagicTextButton
                  loading={aiBusy}
                  disabled={busy}
                  onClick={() => void handleAiTranslateDef(false)}
                  title="TR alanından boş olan diğer 5 dili AI ile doldur"
                >
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden>✨</span>
                    Boşları AI ile doldur
                  </span>
                </ManageAiMagicTextButton>
                <button
                  type="button"
                  disabled={aiBusy || busy}
                  onClick={() => void handleAiTranslateDef(true)}
                  className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-700 dark:bg-neutral-900 dark:text-amber-300 dark:hover:bg-amber-950/30"
                  title="TR'den 5 dili yeniden çevir (mevcut çevirilerin üzerine yazar)"
                >
                  Hepsini yeniden çevir
                </button>
              </div>
            </div>
            <StatusMsg msg={msg} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ATTR_PREVIEW_LOCALES.map((l) => (
                <Field key={l.code} className="block">
                  <Label className="text-[11px]">
                    {l.label}
                    {l.code === 'tr' ? <span className="ml-1 text-neutral-400">(kaynak)</span> : null}
                  </Label>
                  <Input
                    value={transLabels[l.code] ?? ''}
                    onChange={(e) => setTransLabels((p) => ({ ...p, [l.code]: e.target.value }))}
                    className="mt-0.5 text-sm"
                  />
                </Field>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <ButtonPrimary type="button" disabled={busy || aiBusy} className="text-xs" onClick={() => void saveDefTranslations()}>
                {busy ? '…' : 'Kaydet'}
              </ButtonPrimary>
              <button type="button" className="text-xs text-neutral-500 underline" onClick={() => setTransDefId(null)}>
                Kapat
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Yeni Öznitelik Formu */}
      <div className="border-t border-neutral-100 bg-neutral-50/50 p-6 dark:border-neutral-700 dark:bg-neutral-800/30">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Yeni Öznitelik Ekle
        </p>
        <form onSubmit={(e) => void onAdd(e)}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field className="block">
              <Label>Etiket <span className="text-red-500">*</span></Label>
              <Input
                value={form.label}
                onChange={(e) => {
                  const label = e.target.value
                  setForm((p) => ({
                    ...p,
                    label,
                    code: defCodeTouchedRef.current ? p.code : slugifyAttributeCode(label),
                  }))
                }}
                placeholder="ör: Havuz Var mı?"
                className="mt-1 text-sm"
                required
              />
            </Field>
            <Field className="block">
              <Label>Kod <span className="text-red-500">*</span></Label>
              <Input
                value={form.code}
                onChange={(e) => {
                  const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                  defCodeTouchedRef.current = cleaned.length > 0
                  setForm((p) => ({ ...p, code: cleaned }))
                }}
                placeholder="havuz_var_mi"
                className="mt-1 font-mono text-xs"
                required
              />
              {!defCodeTouchedRef.current && form.code ? (
                <p className="mt-0.5 text-[10px] text-neutral-400">Etiketten otomatik üretildi.</p>
              ) : null}
            </Field>
            <Field className="block">
              <Label>Alan Türü</Label>
              <select
                value={form.field_type}
                onChange={(e) => setForm((p) => ({ ...p, field_type: e.target.value }))}
                className={`mt-1 ${inputCls}`}
              >
                {FIELD_TYPES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </Field>
            {needsOptions ? (
              <Field className="block">
                <Label>Seçenekler (JSON)</Label>
                <Input
                  value={form.options_json}
                  onChange={(e) => setForm((p) => ({ ...p, options_json: e.target.value }))}
                  placeholder='["Seçenek 1","Seçenek 2"]'
                  className="mt-1 font-mono text-xs"
                />
              </Field>
            ) : (
              <Field className="block">
                <Label>Sıra</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
                  className="mt-1"
                />
              </Field>
            )}
          </div>
          {!transDefId ? <StatusMsg msg={msg} /> : null}
          <div className="mt-4 flex items-center gap-3">
            <ButtonPrimary type="submit" disabled={busy}>
              {busy ? '…' : '+ Öznitelik Ekle'}
            </ButtonPrimary>
            <p className="text-xs text-neutral-400">
              Kayıt sonrası açılan çeviri alanında tüm dilleri doldurun. İlanda <strong>Öznitelikler</strong> sekmesinden değer girilir.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────
export default function CatalogCategoryAttributesClient({ code }: { code: string }) {
  const t = useManageT()
  const [selectedGroup, setSelectedGroup] = useState<AttributeGroup | null>(null)
  const [previewLocale, setPreviewLocale] = useState('tr')
  const [orgId, setOrgId] = useState('')
  const [needOrg, setNeedOrg] = useState(false)
  const [scopeReady, setScopeReady] = useState(false)
  const [orgReloadNonce, setOrgReloadNonce] = useState(0)

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setScopeReady(true)
      return
    }
    void getAuthMe(token)
      .then((me) => {
        const perms = Array.isArray(me.permissions) ? me.permissions : []
        const roles = Array.isArray(me.roles) ? me.roles : []
        const admin =
          roles.some((r) => r.role_code === 'admin') ||
          perms.some((p) => p === 'admin.users.read' || p.startsWith('admin.'))
        setNeedOrg(admin)
        if (admin && typeof window !== 'undefined') {
          const saved = window.localStorage.getItem(ORG_STORAGE_KEY) ?? ''
          if (saved) setOrgId(saved)
        }
      })
      .catch(() => setNeedOrg(false))
      .finally(() => setScopeReady(true))
  }, [])

  const saveOrg = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ORG_STORAGE_KEY, orgId.trim())
    }
    setOrgReloadNonce((n) => n + 1)
  }

  const manageOrgId = orgId

  return (
    <div className="flex h-full flex-col gap-6 pb-10">
      {/* Sayfa başlığı */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {categoryLabelTr(code)}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Öznitelik Yönetimi
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Grup başlığı ve her öznitelik etiketi için <strong>Diller</strong> ile TR, EN, DE, RU, ZH, FR alanlarını
          doldurun; kayıtta tüm diller zorunludur. İlan tarafında bu özniteliklere değer girilir.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">Liste / önizleme dili</span>
          <select
            value={previewLocale}
            onChange={(e) => setPreviewLocale(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          >
            {ATTR_PREVIEW_LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {needOrg ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <Field className="block max-w-xl">
            <Label>{t('catalog.org_uuid_label')}</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              <Input
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="a0000000-0000-4000-8000-000000000001"
                className="min-w-[280px] flex-1 font-mono text-sm"
              />
              <ButtonPrimary type="button" onClick={() => saveOrg()}>
                {t('catalog.save_load')}
              </ButtonPrimary>
            </div>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{t('catalog.org_uuid_hint')}</p>
          </Field>
        </div>
      ) : null}

      {/* İki panel yan yana */}
      <div className="flex items-start gap-5">
        <GroupPanel
          code={code}
          selectedGroup={selectedGroup}
          previewLocale={previewLocale}
          onSelect={(g) => setSelectedGroup(g)}
          scopeReady={scopeReady}
          needOrg={needOrg}
          manageOrgId={manageOrgId}
          orgReloadNonce={orgReloadNonce}
        />

        {selectedGroup ? (
          <DefsPanel
            group={selectedGroup}
            previewLocale={previewLocale}
            needOrg={needOrg}
            manageOrgId={manageOrgId}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 py-24 text-center dark:border-neutral-700 dark:bg-neutral-900/20">
            <div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7 text-neutral-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-neutral-600 dark:text-neutral-300">
                Bir grup seçin
              </p>
              <p className="mt-1 text-sm text-neutral-400">
                Soldan bir grup seçerek özniteliklerini yönetin,<br />ya da yeni bir grup oluşturun.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
