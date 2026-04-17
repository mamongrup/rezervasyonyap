'use client'

import ReferenceLocalePanel from './ReferenceLocalePanel'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { mergeLocaleRowsWithCatalog } from '@/lib/i18n-catalog-locales'
import {
  createLocale,
  createTranslationNamespace,
  getTranslationBundle,
  listLocales,
  listTranslationNamespaces,
  upsertTranslation,
  type LocaleRow,
  type TranslationNamespaceRow,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { useCallback, useEffect, useMemo, useState } from 'react'

type Status = { kind: 'idle' | 'ok' | 'err'; text?: string }

function normalizeBundle(raw: Record<string, Record<string, unknown>>): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {}
  for (const [ns, pairs] of Object.entries(raw)) {
    out[ns] = {}
    if (!pairs || typeof pairs !== 'object') continue
    for (const [k, v] of Object.entries(pairs)) {
      out[ns][k] = typeof v === 'string' ? v : String(v)
    }
  }
  return out
}

export default function I18nManageClient() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [loading, setLoading] = useState(true)
  const [locales, setLocales] = useState<LocaleRow[]>([])
  const [namespaces, setNamespaces] = useState<TranslationNamespaceRow[]>([])

  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newRtl, setNewRtl] = useState(false)
  const [newActive, setNewActive] = useState(true)

  const [locale, setLocale] = useState('tr')
  const [ns, setNs] = useState('ui')
  const [bundle, setBundle] = useState<Record<string, Record<string, string>>>({})
  const [filter, setFilter] = useState('')
  const [edits, setEdits] = useState<Record<string, string>>({})

  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')

  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [newNsCode, setNewNsCode] = useState('')

  const loadBundle = useCallback(async (loc: string) => {
    const b = await getTranslationBundle(loc)
    setBundle(normalizeBundle(b.namespaces as Record<string, Record<string, unknown>>))
    setEdits({})
  }, [])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setStatus({ kind: 'idle' })
      try {
        const [loc, nsRes] = await Promise.all([listLocales(), listTranslationNamespaces()])
        const mergedLocales = mergeLocaleRowsWithCatalog(loc.locales)
        setLocales(mergedLocales)
        setNamespaces(nsRes.namespaces)
        if (mergedLocales.length > 0) {
          setLocale(mergedLocales[0].code)
        }
        if (nsRes.namespaces.length > 0) {
          setNs(nsRes.namespaces[0].code)
        }
      } catch (e) {
        setStatus({
          kind: 'err',
          text: e instanceof Error ? e.message : 'Meta verisi yüklenemedi',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!locale) return
    void (async () => {
      try {
        await loadBundle(locale)
      } catch (e) {
        setStatus({
          kind: 'err',
          text: e instanceof Error ? e.message : 'Çeviri paketi yüklenemedi',
        })
      }
    })()
  }, [locale, loadBundle])

  const keysInNs = useMemo(() => {
    const m = bundle[ns] || {}
    const keys = Object.keys(m).sort()
    const f = filter.trim().toLowerCase()
    if (!f) return keys
    return keys.filter((k) => k.toLowerCase().includes(f))
  }, [bundle, ns, filter])

  /** Aktif olanlar önce, sonra kod sırası — panelde hangi dillerin açık olduğu görülsün. */
  const sortedLocales = useMemo(() => {
    return [...locales].sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
      return a.code.localeCompare(b.code)
    })
  }, [locales])

  const activeLocaleCount = useMemo(
    () => locales.filter((l) => l.is_active).length,
    [locales],
  )

  async function saveLocale() {
    const token = getStoredAuthToken()
    if (!token) {
      setStatus({ kind: 'err', text: 'Dil eklemek için yönetici olarak giriş yapın.' })
      return
    }
    setStatus({ kind: 'idle' })
    try {
      const row = await createLocale(token, {
        code: newCode,
        name: newName,
        is_rtl: newRtl,
        is_active: newActive,
      })
      setStatus({ kind: 'ok', text: `Dil kaydedildi: ${row.code}` })
      setNewCode('')
      setNewName('')
      const loc = await listLocales()
      setLocales(mergeLocaleRowsWithCatalog(loc.locales))
      setLocale(row.code)
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Kayıt başarısız',
      })
    }
  }

  function draftFor(key: string) {
    return edits[key] !== undefined ? edits[key] : (bundle[ns]?.[key] ?? '')
  }

  function setDraft(key: string, v: string) {
    setEdits((prev) => ({ ...prev, [key]: v }))
  }

  async function saveKey(key: string) {
    const token = getStoredAuthToken()
    if (!token) {
      setStatus({ kind: 'err', text: 'Çeviri kaydetmek için yönetici olarak giriş yapın.' })
      return
    }
    const value = draftFor(key)
    setStatus({ kind: 'idle' })
    try {
      await upsertTranslation(token, { namespace: ns, key, locale, value })
      setStatus({ kind: 'ok', text: `Kaydedildi: ${ns}.${key}` })
      setEdits((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      await loadBundle(locale)
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Kayıt başarısız',
      })
    }
  }

  async function saveNewKey() {
    if (!newKey.trim()) return
    const token = getStoredAuthToken()
    if (!token) {
      setStatus({ kind: 'err', text: 'Çeviri kaydetmek için yönetici olarak giriş yapın.' })
      return
    }
    setStatus({ kind: 'idle' })
    try {
      await upsertTranslation(token, {
        namespace: ns,
        key: newKey.trim(),
        locale,
        value: newVal,
      })
      setStatus({ kind: 'ok', text: `Yeni anahtar: ${ns}.${newKey.trim()}` })
      setNewKey('')
      setNewVal('')
      await loadBundle(locale)
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Kayıt başarısız',
      })
    }
  }

  function exportJson() {
    const data = { locale, namespaces: bundle }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `i18n-${locale}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setStatus({ kind: 'ok', text: 'Dosya indirildi.' })
  }

  async function runImport() {
    const token = getStoredAuthToken()
    if (!token) {
      setStatus({ kind: 'err', text: 'İçe aktarmak için yönetici olarak giriş yapın.' })
      return
    }
    setImporting(true)
    setStatus({ kind: 'idle' })
    try {
      const data = JSON.parse(importText) as {
        locale?: string
        namespaces?: Record<string, Record<string, string>>
      }
      const loc = (data.locale ?? '').trim().toLowerCase()
      if (!loc) throw new Error('JSON içinde "locale" alanı gerekli')
      if (!data.namespaces || typeof data.namespaces !== 'object') throw new Error('"namespaces" nesnesi gerekli')

      const allowed = new Set(locales.map((l) => l.code))
      if (!allowed.has(loc)) throw new Error(`Bilinmeyen dil: "${loc}" — önce dili ekleyin`)

      let n = 0
      for (const [namespace, pairs] of Object.entries(data.namespaces)) {
        if (!pairs || typeof pairs !== 'object') continue
        for (const [key, value] of Object.entries(pairs)) {
          await upsertTranslation(token, {
            namespace,
            key,
            locale: loc,
            value: typeof value === 'string' ? value : String(value),
          })
          n++
        }
      }
      setStatus({ kind: 'ok', text: `${n} çeviri yazıldı (${loc}).` })
      setImportText('')
      if (loc === locale) await loadBundle(locale)
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'İçe aktarma başarısız',
      })
    } finally {
      setImporting(false)
    }
  }

  async function saveNewNamespace() {
    const token = getStoredAuthToken()
    if (!token) {
      setStatus({ kind: 'err', text: 'Namespace eklemek için yönetici olarak giriş yapın.' })
      return
    }
    const code = newNsCode.trim().toLowerCase()
    if (!code) return
    setStatus({ kind: 'idle' })
    try {
      const row = await createTranslationNamespace(token, { code })
      setStatus({ kind: 'ok', text: `Namespace eklendi: ${row.code}` })
      setNewNsCode('')
      const nsRes = await listTranslationNamespaces()
      setNamespaces(nsRes.namespaces)
      setNs(row.code)
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Namespace kaydı başarısız',
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <p className="text-neutral-500">Yükleniyor…</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 pb-24">
      <h1 className="text-3xl font-semibold tracking-tight">Diller &amp; çeviriler</h1>
      <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-400">
        Dil ekleme, yeni namespace oluşturma, anahtar başına çeviri, JSON dışa/içe aktarma. Yazma işlemleri yönetici
        oturumu ve <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">admin.users.read</code> gerektirir.
        Şablon arayüz metinleri hâlen <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">public/locales/en.ts</code>{' '}
        üzerinden yüklenir; veritabanı çevirileri API ve ileride bağlanacak sözlük katmanı için kullanılır.
      </p>

      {status.kind !== 'idle' && status.text && (
        <div
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
            status.kind === 'ok'
              ? 'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100'
              : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100'
          }`}
        >
          {status.text}
        </div>
      )}

      <section className="mt-10 border-t border-neutral-200 pt-10 dark:border-neutral-700">
        <h2 className="text-xl font-semibold">Kayıtlı diller</h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Veritabanındaki dil kayıtları. Ön yüz ve dil seçicide yalnızca <span className="font-medium">aktif</span> olanlar
          listelenir; pasif diller yine çeviri düzenleme ve içe aktarma için kullanılabilir.
        </p>
        {sortedLocales.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">Henüz dil tanımlı değil — aşağıdan yeni dil ekleyin.</p>
        ) : (
          <>
            <p className="mt-3 text-sm text-neutral-500">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{activeLocaleCount}</span> aktif,{' '}
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {sortedLocales.length - activeLocaleCount}
              </span>{' '}
              pasif
            </p>
            <ul className="mt-4 divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
              {sortedLocales.map((l) => {
                const selected = l.code === locale
                return (
                  <li
                    key={l.id}
                    className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm ${
                      selected ? 'bg-primary-50/80 dark:bg-primary-950/25' : ''
                    }`}
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="font-mono font-medium text-neutral-900 dark:text-white">{l.code}</span>
                      <span className="text-neutral-600 dark:text-neutral-400">{l.name}</span>
                      {l.is_rtl ? (
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                          RTL
                        </span>
                      ) : null}
                      {selected ? (
                        <span className="rounded bg-primary-100 px-1.5 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/50 dark:text-primary-200">
                          Seçili (düzenleme)
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        l.is_active
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
                          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}
                    >
                      {l.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-xs text-neutral-500">
              Çalışma dilini değiştirmek için aşağıdaki <strong>Çeviri düzenle</strong> bölümündeki &quot;Dil&quot; listesini
              kullanın; dışa aktarma o anda seçili dile göre dosya üretir.
            </p>
          </>
        )}
      </section>

      <ReferenceLocalePanel locales={sortedLocales} />

      <section className="mt-10 border-t border-neutral-200 pt-10 dark:border-neutral-700">
        <h2 className="text-xl font-semibold">Yeni dil</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field className="block">
            <Label>Kod (ör. de)</Label>
            <Input className="mt-1 font-mono" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
          </Field>
          <Field className="block">
            <Label>Görünen ad</Label>
            <Input className="mt-1" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={newRtl} onChange={(e) => setNewRtl(e.target.checked)} />
            Sağdan sola (RTL)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={newActive} onChange={(e) => setNewActive(e.target.checked)} />
            Aktif
          </label>
          <ButtonPrimary type="button" onClick={() => void saveLocale()}>
            Dili kaydet
          </ButtonPrimary>
        </div>
      </section>

      <section className="mt-10 border-t border-neutral-200 pt-10 dark:border-neutral-700">
        <h2 className="text-xl font-semibold">Yeni çeviri namespace</h2>
        <p className="mt-1 text-sm text-neutral-500">Örn. mobile, checkout, legal — küçük harf ve alt çizgi önerilir.</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field className="min-w-[12rem]">
            <Label>Kod</Label>
            <Input className="mt-1 font-mono" value={newNsCode} onChange={(e) => setNewNsCode(e.target.value)} />
          </Field>
          <ButtonPrimary type="button" onClick={() => void saveNewNamespace()}>
            Namespace ekle
          </ButtonPrimary>
        </div>
      </section>

      <section className="mt-10 border-t border-neutral-200 pt-10 dark:border-neutral-700">
        <h2 className="text-xl font-semibold">Çeviri düzenle</h2>
        <div className="mt-4 flex flex-wrap gap-4">
          <Field className="block min-w-[140px]">
            <Label>Dil</Label>
            <select
              className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
            >
              {sortedLocales.map((l) => (
                <option key={l.id} value={l.code}>
                  {l.name} ({l.code}){l.is_active ? '' : ' — pasif'}
                </option>
              ))}
            </select>
          </Field>
          <Field className="block min-w-[140px]">
            <Label>Namespace</Label>
            <select
              className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              value={ns}
              onChange={(e) => setNs(e.target.value)}
            >
              {namespaces.map((n) => (
                <option key={n.id} value={n.code}>
                  {n.code}
                </option>
              ))}
            </select>
          </Field>
          <Field className="block min-w-[200px] flex-1">
            <Label>Anahtar filtre</Label>
            <Input
              className="mt-1"
              placeholder="içerir…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-6 space-y-6">
          {keysInNs.map((key) => (
            <div key={key} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
              <div className="font-mono text-xs text-neutral-500">{ns}.{key}</div>
              <Textarea
                className="mt-2 font-mono text-sm"
                rows={2}
                value={draftFor(key)}
                onChange={(e) => setDraft(key, e.target.value)}
              />
              <ButtonPrimary className="mt-2" type="button" onClick={() => void saveKey(key)}>
                Bu anahtarı kaydet
              </ButtonPrimary>
            </div>
          ))}
          {keysInNs.length === 0 && (
            <p className="text-sm text-neutral-500">Bu namespace için anahtar yok — aşağıdan ekleyin veya içe aktarın.</p>
          )}
        </div>

        <div className="mt-10 rounded-lg border border-dashed border-neutral-300 p-4 dark:border-neutral-600">
          <h3 className="font-medium">Yeni anahtar</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field className="block">
              <Label>Anahtar</Label>
              <Input className="mt-1 font-mono" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
            </Field>
            <Field className="block sm:col-span-2">
              <Label>Metin</Label>
              <Textarea className="mt-1" rows={3} value={newVal} onChange={(e) => setNewVal(e.target.value)} />
            </Field>
          </div>
          <ButtonPrimary className="mt-3" type="button" onClick={() => void saveNewKey()}>
            Anahtarı oluştur / güncelle
          </ButtonPrimary>
        </div>
      </section>

      <section className="mt-10 border-t border-neutral-200 pt-10 dark:border-neutral-700">
        <h2 className="text-xl font-semibold">Dışa aktar (JSON)</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Seçili dil için tüm namespace’ler tek dosyada. Şu an seçili:{' '}
          <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{locale}</span>
          {locales.find((l) => l.code === locale)?.is_active === false ? (
            <span className="text-amber-700 dark:text-amber-400"> (pasif dil)</span>
          ) : null}
          .
        </p>
        <ButtonPrimary className="mt-4" type="button" onClick={exportJson}>
          İndir: i18n-{locale}.json
        </ButtonPrimary>
      </section>

      <section className="mt-10 border-t border-neutral-200 pt-10 dark:border-neutral-700">
        <h2 className="text-xl font-semibold">İçe aktar (JSON)</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Format: <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">{`{ "locale": "de", "namespaces": { "ui": { "x": "y" } } }`}</code>
        </p>
        <Field className="mt-4 block">
          <Label>JSON yapıştır</Label>
          <Textarea
            className="mt-1 font-mono text-sm"
            rows={12}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
        </Field>
        <ButtonPrimary type="button" disabled={importing} onClick={() => void runImport()}>
          {importing ? 'Yazılıyor…' : 'İçe aktar'}
        </ButtonPrimary>
      </section>
    </div>
  )
}
