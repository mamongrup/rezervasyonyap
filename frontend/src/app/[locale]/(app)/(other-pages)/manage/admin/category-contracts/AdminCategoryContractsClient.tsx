'use client'

import { ORDERED_PRODUCT_CATEGORY_CODES, categoryLabelTr } from '@/lib/catalog-category-ui'
import {
  createManageCategoryContract,
  listManageCategoryContracts,
  type ManageCategoryContractRow,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

const ORG_KEY = 'catalog_manage_organization_id'

type ScopeTab = 'general' | 'sales' | 'category'

export default function AdminCategoryContractsClient() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const [tab, setTab] = useState<ScopeTab>('category')
  const [categoryCode, setCategoryCode] = useState('holiday_home')
  const [code, setCode] = useState('')
  const [orgId, setOrgId] = useState('')
  const [title, setTitle] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [rows, setRows] = useState<ManageCategoryContractRow[]>([])
  const [listBusy, setListBusy] = useState(false)

  const loadList = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setRows([])
      return
    }
    setListBusy(true)
    try {
      const r = await listManageCategoryContracts(token, {
        contractScope: tab,
        ...(tab === 'category' ? { categoryCode } : {}),
        ...(orgId.trim() ? { organizationId: orgId.trim() } : {}),
      })
      setRows(r.contracts)
    } catch {
      setRows([])
    } finally {
      setListBusy(false)
    }
  }, [tab, categoryCode, orgId])

  useEffect(() => {
    void loadList()
  }, [loadList])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) {
      setMsg('Oturum yok')
      return
    }
    if (!code.trim() || !title.trim() || !bodyText.trim()) {
      setMsg('Kod, başlık ve metin zorunlu.')
      return
    }
    if (tab === 'category' && !categoryCode.trim()) {
      setMsg('Kategori seçin.')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const r = await createManageCategoryContract(token, {
        contract_scope: tab,
        ...(tab === 'category' ? { category_code: categoryCode } : {}),
        code: code.trim(),
        title: title.trim(),
        body_text: bodyText.trim(),
        locale_code: locale,
        ...(orgId.trim() ? { organization_id: orgId.trim() } : {}),
      })
      setMsg(`Kaydedildi. Şablon id: ${r.id}`)
      setCode('')
      setTitle('')
      setBodyText('')
      void loadList()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setBusy(false)
    }
  }

  const tabLabel =
    tab === 'general' ? 'Genel sözleşme' : tab === 'sales' ? 'Satış sözleşmesi' : 'Kategori havuzu'

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Link
        href={vitrinPath('/manage/admin')}
        className="text-sm font-medium text-primary-600 underline dark:text-primary-400"
      >
        ← Admin
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-neutral-900 dark:text-white">Sözleşme yönetimi</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        <strong>Genel</strong> ve <strong>satış</strong> şablonları checkout’ta (ilanın kurumuna göre, önce kurum
        özeti sonra platform) gösterilir. <strong>Kategori</strong> şablonları ilan oluştururken seçilir ve ilana
        bağlanır. Platform geneli için organizasyon UUID&apos;sini boş bırakın.
      </p>
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100">
        <p className="font-semibold">Veritabanında emsal şablonlar (232 modülü)</p>
        <p className="mt-1 text-amber-900/90 dark:text-amber-200/95">
          Kurulumda örnek metinler eklenir; <strong>hukuki danışmanlık değildir</strong>. Kodlar:{' '}
          <span className="font-mono text-xs">platform_emsal_genel_v1</span>,{' '}
          <span className="font-mono text-xs">platform_emsal_satis_v1</span>, kategori başına{' '}
          <span className="font-mono text-xs">emsal_airbnb_tarzi_v1</span> (villa),{' '}
          <span className="font-mono text-xs">emsal_vira_tarzi_v1</span> (yat),{' '}
          <span className="font-mono text-xs">emsal_ota_otel_v1</span> (otel / OTA yapısı),{' '}
          <span className="font-mono text-xs">emsal_gezinomi_tarzi_v1</span> (tur),{' '}
          <span className="font-mono text-xs">emsal_ucus_bilet_v1</span> (uçuş/otobüs),{' '}
          <span className="font-mono text-xs">emsal_genel_hizmet_v1</span> (diğer kategoriler).
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-neutral-200 pb-3 dark:border-neutral-700">
        {(
          [
            ['general', 'Genel'],
            ['sales', 'Satış'],
            ['category', 'Kategori'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={
              tab === k
                ? 'rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white'
                : 'rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 dark:border-neutral-600 dark:text-neutral-200'
            }
          >
            {label}
          </button>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Mevcut şablonlar — {tabLabel}</h2>
        {listBusy ? (
          <p className="mt-2 text-sm text-neutral-500">Liste yükleniyor…</p>
        ) : rows.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Kayıt yok veya liste yüklenemedi.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900/40"
              >
                <span className="font-mono text-xs text-neutral-500">{r.id}</span>
                <div className="font-medium">
                  {r.code} · v{r.version} · {r.is_active === 'true' || r.is_active === 't' ? 'aktif' : 'pasif'}
                </div>
                <div className="text-xs text-neutral-500">Kapsam: {r.contract_scope}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        {tab === 'category' ? (
          <Field>
            <Label>Kategori</Label>
            <select
              className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
            >
              {ORDERED_PRODUCT_CATEGORY_CODES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabelTr(c)}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Bu sekmede <strong>kategori kodu gerekmez</strong>; şablon doğrudan genel veya satış kapsamına eklenir.
          </p>
        )}
        <Field>
          <Label>Organizasyon UUID (isteğe bağlı — boş = platform)</Label>
          <Input
            className="mt-1 font-mono text-sm"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
          />
          <p className="mt-1 text-xs text-neutral-500">
            İlan yönetiminde kullandığınız kurum kimliği (
            <span className="font-mono">{ORG_KEY}</span> ile aynı olabilir).
          </p>
        </Field>
        <Field>
          <Label>Şablon kodu (benzersiz, örn. default_2026)</Label>
          <Input className="mt-1 font-mono text-sm" value={code} onChange={(e) => setCode(e.target.value)} required />
        </Field>
        <Field>
          <Label>Başlık</Label>
          <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field>
          <Label>Metin</Label>
          <Textarea
            className="mt-1 min-h-[200px] font-mono text-sm"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            required
          />
        </Field>
        {msg ? <p className="text-sm text-neutral-700 dark:text-neutral-300">{msg}</p> : null}
        <ButtonPrimary type="submit" disabled={busy}>
          {busy ? '…' : 'Havuza ekle'}
        </ButtonPrimary>
      </form>
    </div>
  )
}
