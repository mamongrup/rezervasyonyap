'use client'

import { categoryLabelTr } from '@/lib/catalog-category-ui'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { useManageT } from '@/lib/manage-i18n-context'
import {
  getAuthMe,
  getManageListingTranslations,
  getSeoMetadata,
  putManageListingTranslations,
  upsertSeoMetadata,
  type ManageListingTranslationRow,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Field, Label } from '@/shared/fieldset'
import RichEditor from '@/components/editor/RichEditor'
import { ManageAiMagicTextButton } from '@/components/manage/ManageAiMagicTextButton'
import { ManageAiTranslateToolbar } from '@/components/manage/ManageAiTranslateToolbar'
import { useManageAiLocaleRows } from '@/hooks/use-manage-ai-locales'
import { callAiTranslate } from '@/lib/manage-content-ai'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

const ORG_STORAGE_KEY = 'catalog_manage_organization_id'

type SeoDraftRow = {
  title: string
  description: string
  keywords: string
  canonical_path: string
  og_image_storage_key: string
  robots: string
}

function emptySeoDraft(): SeoDraftRow {
  return {
    title: '',
    description: '',
    keywords: '',
    canonical_path: '',
    og_image_storage_key: '',
    robots: '',
  }
}

export default function CatalogListingTranslationsClient({
  categoryCode,
  listingId,
}: {
  categoryCode: string
  listingId: string
}) {
  const t = useManageT()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const { allLocales, translateTargets, primaryLocale } = useManageAiLocaleRows()
  const [rows, setRows] = useState<ManageListingTranslationRow[]>([])
  const [draft, setDraft] = useState<Record<string, { title: string; description: string }>>({})
  const [seoDraft, setSeoDraft] = useState<Record<string, SeoDraftRow>>({})
  const [orgId, setOrgId] = useState('')
  const [needOrg, setNeedOrg] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiTargetLocale, setAiTargetLocale] = useState(
    () => translateTargets[0]?.code ?? 'en',
  )
  const [aiTranslating, setAiTranslating] = useState(false)
  const [aiPolish, setAiPolish] = useState<string | null>(null)

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) return
    void getAuthMe(token)
      .then((me) => {
        const perms = Array.isArray(me.permissions) ? me.permissions : []
        const roles = Array.isArray(me.roles) ? me.roles : []
        const admin =
          roles.some((r) => r.role_code === 'admin') ||
          perms.some((p) => p === 'admin.users.read' || p.startsWith('admin.'))
        setNeedOrg(admin)
        if (admin && typeof window !== 'undefined') {
          setOrgId(window.localStorage.getItem(ORG_STORAGE_KEY) ?? '')
        }
      })
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setErr(t('catalog.session_missing'))
      setRows([])
      setLoading(false)
      return
    }
    if (needOrg && !orgId.trim()) {
      setErr(t('catalog.org_uuid_admin_error'))
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    setOk(null)
    try {
      const r = await getManageListingTranslations(token, listingId, {
        organizationId: needOrg ? orgId.trim() : undefined,
      })
      setRows(r.translations)
      const d: Record<string, { title: string; description: string }> = {}
      for (const x of r.translations) {
        d[x.locale_code] = { title: x.title, description: x.description ?? '' }
      }
      setDraft(d)
      const seo: Record<string, SeoDraftRow> = {}
      await Promise.all(
        r.translations.map(async (row) => {
          try {
            const { metadata } = await getSeoMetadata({
              entity_type: 'listing',
              entity_id: listingId,
              locale: row.locale_code,
            })
            if (metadata) {
              seo[row.locale_code] = {
                title: metadata.title ?? '',
                description: metadata.description ?? '',
                keywords: metadata.keywords ?? '',
                canonical_path: metadata.canonical_path ?? '',
                og_image_storage_key: metadata.og_image_storage_key ?? '',
                robots: metadata.robots ?? '',
              }
            } else {
              seo[row.locale_code] = emptySeoDraft()
            }
          } catch {
            seo[row.locale_code] = emptySeoDraft()
          }
        }),
      )
      setSeoDraft(seo)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('catalog.translations_load_error'))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [listingId, needOrg, orgId, t])

  useEffect(() => {
    void load()
  }, [load])

  async function onSave() {
    const token = getStoredAuthToken()
    if (!token) {
      setErr(t('catalog.session_missing'))
      return
    }
    if (needOrg && !orgId.trim()) {
      setErr(t('catalog.org_uuid_admin_error'))
      return
    }
    setSaving(true)
    setErr(null)
    setOk(null)
    try {
      const entries = rows.map((r) => {
        const lc = r.locale_code
        const row = draft[lc] ?? { title: '', description: '' }
        return {
          locale_code: lc,
          title: row.title.trim(),
          description: row.description.trim(),
        }
      })
      await putManageListingTranslations(token, listingId, { entries }, {
        organizationId: needOrg ? orgId.trim() : undefined,
      })
      await Promise.all(
        entries.map((e) => {
          const s = seoDraft[e.locale_code] ?? emptySeoDraft()
          return upsertSeoMetadata(
            {
              entity_type: 'listing',
              entity_id: listingId,
              locale: e.locale_code,
              title: s.title.trim(),
              description: s.description.trim(),
              keywords: s.keywords.trim(),
              canonical_path: s.canonical_path.trim(),
              og_image_storage_key: s.og_image_storage_key.trim(),
              robots: s.robots.trim(),
            },
            token,
          )
        }),
      )
      setOk(t('catalog.translations_saved'))
      void load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('catalog.create_error'))
    } finally {
      setSaving(false)
    }
  }

  const localeToolbarOptions = useMemo(
    () =>
      rows
        .filter((r) => r.locale_code !== primaryLocale)
        .map((r) => {
          const meta = allLocales.find((l) => l.code === r.locale_code)
          return {
            code: r.locale_code,
            label: meta?.label ?? r.locale_code.toUpperCase(),
            flag: meta?.flag ?? '🌐',
          }
        }),
    [rows, primaryLocale, allLocales],
  )

  const nonPrimaryRowCodesKey = useMemo(
    () => rows.filter((r) => r.locale_code !== primaryLocale).map((r) => r.locale_code).join(','),
    [rows, primaryLocale],
  )

  useEffect(() => {
    const opts = rows.filter((r) => r.locale_code !== primaryLocale).map((r) => r.locale_code)
    setAiTargetLocale((cur) => {
      if (opts.includes(cur)) return cur
      return opts[0] ?? 'en'
    })
  }, [nonPrimaryRowCodesKey, primaryLocale, rows])

  const handleAiTranslateTrToTarget = async () => {
    if (aiTargetLocale === primaryLocale) {
      setErr(`Hedef dil, birincil kaynak dilden (${primaryLocale.toUpperCase()}) farklı olmalı.`)
      return
    }
    const src = draft[primaryLocale] ?? { title: '', description: '' }
    const name = src.title.trim()
    const desc = src.description.trim()
    if (!name && !desc) {
      const plabel = allLocales.find((l) => l.code === primaryLocale)?.label ?? primaryLocale
      setErr(`Önce ${plabel} başlık veya açıklama girin.`)
      return
    }
    const srcSeo = seoDraft[primaryLocale] ?? emptySeoDraft()
    setAiTranslating(true)
    setErr(null)
    setOk(null)
    try {
      const listingPath = `listing/${listingId.slice(0, 8)}`
      const [tTitle, tDesc, st, sd] = await Promise.all([
        name
          ? callAiTranslate({
              text: name,
              context: 'title',
              sourceLocale: primaryLocale,
              targetLocale: aiTargetLocale,
            })
          : Promise.resolve(''),
        desc
          ? callAiTranslate({
              text: desc,
              context: 'body',
              sourceLocale: primaryLocale,
              targetLocale: aiTargetLocale,
              pageSlug: listingPath,
            })
          : Promise.resolve(''),
        (srcSeo.title || '').trim()
          ? callAiTranslate({
              text: srcSeo.title.trim(),
              context: 'seo',
              sourceLocale: primaryLocale,
              targetLocale: aiTargetLocale,
            })
          : Promise.resolve(''),
        (srcSeo.description || '').trim()
          ? callAiTranslate({
              text: srcSeo.description.trim(),
              context: 'seo',
              sourceLocale: primaryLocale,
              targetLocale: aiTargetLocale,
            })
          : Promise.resolve(''),
      ])
      setDraft((prev) => ({
        ...prev,
        [aiTargetLocale]: {
          title: tTitle || prev[aiTargetLocale]?.title || '',
          description: tDesc || prev[aiTargetLocale]?.description || '',
        },
      }))
      setSeoDraft((prev) => ({
        ...prev,
        [aiTargetLocale]: {
          ...(prev[aiTargetLocale] ?? emptySeoDraft()),
          title: st || prev[aiTargetLocale]?.title || '',
          description: sd || prev[aiTargetLocale]?.description || '',
        },
      }))
      setOk(`${aiTargetLocale.toUpperCase()} çevirisi güncellendi — kaydedin.`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Çeviri başarısız')
    } finally {
      setAiTranslating(false)
    }
  }

  const polishField = async (
    key: string,
    fn: () => Promise<void>,
  ) => {
    setAiPolish(key)
    setErr(null)
    try {
      await fn()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'AI hatası')
    } finally {
      setAiPolish(null)
    }
  }

  const listHref = vitrinPath(`/manage/catalog/${encodeURIComponent(categoryCode)}/listings`)

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        {t('catalog.translations_page_title')} — {categoryLabelTr(categoryCode)}
      </h1>
      <p className="mt-1 font-mono text-xs text-neutral-500">{listingId}</p>

      {!loading && rows.length > 0 && localeToolbarOptions.length > 0 ? (
        <div className="mt-4">
          <ManageAiTranslateToolbar
            locales={localeToolbarOptions}
            targetLocale={aiTargetLocale}
            onTargetLocaleChange={setAiTargetLocale}
            onTranslate={() => void handleAiTranslateTrToTarget()}
            translating={aiTranslating}
          />
          <p className="mt-1 text-xs text-neutral-500">
            Türkçe başlık, açıklama ve SEO alanlarını seçilen dile çevirir (taslak; kaydet gerekir).
          </p>
        </div>
      ) : null}

      {needOrg ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <Field className="block max-w-xl">
            <Label>{t('catalog.org_uuid_label')}</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              <Input
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="min-w-[280px] flex-1 font-mono text-sm"
              />
              <ButtonPrimary type="button" onClick={() => void load()}>
                {t('catalog.save_load')}
              </ButtonPrimary>
            </div>
          </Field>
        </div>
      ) : null}

      {err ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{err}</p> : null}
      {ok ? <p className="mt-4 text-sm text-green-700 dark:text-green-400">{ok}</p> : null}

      <div className="mt-6 space-y-6">
        {loading ? (
          <p className="text-sm text-neutral-500">…</p>
        ) : (
          rows.map((r) => {
            const lc = r.locale_code
            const cur = draft[lc] ?? { title: '', description: '' }
            const seo = seoDraft[lc] ?? emptySeoDraft()
            const patchSeo = (partial: Partial<SeoDraftRow>) =>
              setSeoDraft((prev) => ({
                ...prev,
                [lc]: { ...seo, ...partial },
              }))
            return (
              <div
                key={lc}
                className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700"
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">{lc}</p>
                <Field className="block">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>{t('catalog.title_field')}</Label>
                    <ManageAiMagicTextButton
                      loading={aiPolish === `title-${lc}`}
                      onClick={() =>
                        void polishField(`title-${lc}`, async () => {
                          if (!cur.title.trim()) {
                            setErr('Önce başlık girin.')
                            return
                          }
                          const out = await callAiTranslate({
                            text: cur.title,
                            context: 'title',
                            sourceLocale: lc,
                            targetLocale: lc,
                          })
                          if (out) {
                            setDraft((prev) => ({
                              ...prev,
                              [lc]: { ...cur, title: out.slice(0, 300) },
                            }))
                            setOk('Başlık iyileştirildi.')
                          }
                        })
                      }
                    />
                  </div>
                  <Input
                    value={cur.title}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        [lc]: { ...cur, title: e.target.value },
                      }))
                    }
                    className="mt-1"
                  />
                </Field>
                <Field className="mt-3 block">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>{t('catalog.description_field')}</Label>
                    <ManageAiMagicTextButton
                      loading={aiPolish === `body-${lc}`}
                      onClick={() =>
                        void polishField(`body-${lc}`, async () => {
                          if (!cur.description.trim()) {
                            setErr('Önce açıklama girin.')
                            return
                          }
                          const out = await callAiTranslate({
                            text: cur.description,
                            context: 'body',
                            sourceLocale: lc,
                            targetLocale: lc,
                            pageSlug: `listing/${listingId.slice(0, 8)}`,
                          })
                          if (out) {
                            setDraft((prev) => ({
                              ...prev,
                              [lc]: { ...cur, description: out },
                            }))
                            setOk('Açıklama iyileştirildi.')
                          }
                        })
                      }
                    />
                  </div>
                  <RichEditor
                    value={cur.description}
                    onChange={(html) =>
                      setDraft((prev) => ({
                        ...prev,
                        [lc]: { ...cur, description: html },
                      }))
                    }
                    placeholder="İlan açıklaması…"
                    minHeight={160}
                    className="mt-1"
                  />
                </Field>
                <details className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-600 dark:bg-neutral-900/40">
                  <summary className="cursor-pointer text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {t('catalog.seo_section')}
                  </summary>
                  <div className="mt-3 space-y-3 border-t border-neutral-200 pt-3 dark:border-neutral-600">
                    <Field className="block">
                      <Label>{t('catalog.seo_search_title')}</Label>
                      <Input
                        value={seo.title}
                        onChange={(e) => patchSeo({ title: e.target.value })}
                        className="mt-1"
                      />
                    </Field>
                    <Field className="block">
                      <Label>{t('catalog.seo_search_description')}</Label>
                      <textarea
                        value={seo.description}
                        onChange={(e) => patchSeo({ description: e.target.value })}
                        className="mt-1 min-h-[72px] w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                      />
                    </Field>
                    <Field className="block">
                      <Label>{t('catalog.seo_keywords')}</Label>
                      <Input
                        value={seo.keywords}
                        onChange={(e) => patchSeo({ keywords: e.target.value })}
                        className="mt-1 font-mono text-xs"
                      />
                    </Field>
                    <Field className="block">
                      <Label>{t('catalog.seo_canonical')}</Label>
                      <Input
                        value={seo.canonical_path}
                        onChange={(e) => patchSeo({ canonical_path: e.target.value })}
                        className="mt-1 font-mono text-xs"
                      />
                    </Field>
                    <Field className="block">
                      <Label>{t('catalog.seo_og_image')}</Label>
                      <Input
                        value={seo.og_image_storage_key}
                        onChange={(e) => patchSeo({ og_image_storage_key: e.target.value })}
                        className="mt-1 font-mono text-xs"
                      />
                    </Field>
                    <Field className="block">
                      <Label>{t('catalog.seo_robots')}</Label>
                      <Input
                        value={seo.robots}
                        onChange={(e) => patchSeo({ robots: e.target.value })}
                        className="mt-1 font-mono text-xs"
                        placeholder="index,follow"
                      />
                    </Field>
                    <button
                      type="button"
                      disabled={aiPolish === `seometa-${lc}`}
                      onClick={() =>
                        void polishField(`seometa-${lc}`, async () => {
                          const st = seo.title.trim()
                          const sd = seo.description.trim()
                          if (!st && !sd) {
                            setErr('Önce SEO başlık veya açıklama girin.')
                            return
                          }
                          const [t1, t2] = await Promise.all([
                            st
                              ? callAiTranslate({
                                  text: st,
                                  context: 'seo',
                                  sourceLocale: lc,
                                  targetLocale: lc,
                                })
                              : Promise.resolve(''),
                            sd
                              ? callAiTranslate({
                                  text: sd,
                                  context: 'seo',
                                  sourceLocale: lc,
                                  targetLocale: lc,
                                })
                              : Promise.resolve(''),
                          ])
                          setSeoDraft((prev) => {
                            const curSeo = prev[lc] ?? emptySeoDraft()
                            return {
                              ...prev,
                              [lc]: {
                                ...curSeo,
                                title: t1 ? t1.slice(0, 70) : curSeo.title,
                                description: t2 ? t2.slice(0, 160) : curSeo.description,
                              },
                            }
                          })
                          setOk('SEO meta iyileştirildi.')
                        })
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200"
                    >
                      {aiPolish === `seometa-${lc}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      AI ile SEO meta iyileştir
                    </button>
                  </div>
                </details>
              </div>
            )
          })
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonPrimary type="button" disabled={saving || loading} onClick={() => void onSave()}>
          {saving ? '…' : t('catalog.translations_save')}
        </ButtonPrimary>
        <Link href={listHref} className="self-center text-sm text-primary-600 underline dark:text-primary-400">
          {t('catalog.back_hub')}
        </Link>
      </div>
    </div>
  )
}
