'use client'

import {
  listAdminAgencyProfiles,
  patchAdminAgencyProfiles,
  type AdminAgencyProfileRow,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { useCallback, useState } from 'react'

const DOC_STATUSES = ['pending', 'approved', 'rejected'] as const

export default function AdminAgencyProfilesSection() {
  const [orgId, setOrgId] = useState('')
  const [profiles, setProfiles] = useState<AdminAgencyProfileRow[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [patchDoc, setPatchDoc] = useState('')
  const [patchDiscount, setPatchDiscount] = useState('')
  const [patchMsg, setPatchMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    const oid = orgId.trim()
    if (!oid) {
      setLoadErr('Acente kurum UUID girin.')
      setProfiles([])
      return
    }
    setLoadErr(null)
    setBusy(true)
    try {
      const r = await listAdminAgencyProfiles(token, oid)
      setProfiles(r.profiles)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'load_failed')
      setProfiles([])
    } finally {
      setBusy(false)
    }
  }, [orgId])

  async function applyPatch(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    const oid = orgId.trim()
    if (!oid) return
    const d = patchDoc.trim()
    const disc = patchDiscount.trim()
    if (!d && !disc) {
      setPatchMsg('Belge durumu seçin veya iskonto % girin (en az biri).')
      return
    }
    setPatchMsg(null)
    setBusy(true)
    try {
      const out = await patchAdminAgencyProfiles(token, {
        agency_organization_id: oid,
        ...(d ? { document_status: d } : {}),
        ...(disc ? { discount_percent: disc } : {}),
      })
      setPatchMsg(`Güncellendi: ${out.updated_count} satır.`)
      await load()
    } catch (err) {
      setPatchMsg(err instanceof Error ? err.message : 'patch_failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id="admin-agency-profiles-block"
      className="mt-10 scroll-mt-24 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40"
    >
      <h2 className="text-lg font-medium text-neutral-900 dark:text-white">Acente profilleri</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Kurum bazında <span className="font-mono">agency_profiles</span> (belge durumu, iskonto %). Aynı kuruma
        bağlı tüm kullanıcı satırları toplu güncellenir. İzinler:{' '}
        <span className="font-mono">admin.agency_profiles.read</span> /{' '}
        <span className="font-mono">admin.agency_profiles.write</span>.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Field className="min-w-[14rem] flex-1">
          <Label htmlFor="ap-org">Acente kurum UUID</Label>
          <Input
            id="ap-org"
            className="mt-1 font-mono text-xs"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          />
        </Field>
        <ButtonPrimary type="button" disabled={busy} onClick={() => void load()}>
          {busy ? '…' : 'Yükle'}
        </ButtonPrimary>
      </div>

      {loadErr ? (
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200" role="alert">
          {loadErr}
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50">
            <tr>
              <th className="px-4 py-2">Kullanıcı</th>
              <th className="px-4 py-2">E-posta</th>
              <th className="px-4 py-2">Belge</th>
              <th className="px-4 py-2">İskonto %</th>
            </tr>
          </thead>
          <tbody>
            {profiles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-neutral-500">
                  Kayıt yok veya henüz yüklenmedi.
                </td>
              </tr>
            ) : (
              profiles.map((p) => (
                <tr key={p.user_id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-2 font-mono text-xs">{p.user_id}</td>
                  <td className="px-4 py-2">{p.email || '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{p.document_status}</td>
                  <td className="px-4 py-2">{p.discount_percent}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form
        className="mt-6 rounded-lg border border-dashed border-neutral-300 p-4 dark:border-neutral-600"
        onSubmit={(e) => void applyPatch(e)}
      >
        <h3 className="text-sm font-medium text-neutral-900 dark:text-white">Toplu güncelle (aynı kurum)</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Seçmediğiniz / boş bıraktığınız alan API&apos;ye gitmez ve veritabanında değişmez.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Field className="min-w-[12rem]">
            <Label htmlFor="ap-doc">Belge durumu</Label>
            <select
              id="ap-doc"
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              value={patchDoc}
              disabled={busy}
              onChange={(e) => setPatchDoc(e.target.value)}
            >
              <option value="">— değiştirme —</option>
              {DOC_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field className="min-w-[8rem]">
            <Label htmlFor="ap-disc">İskonto %</Label>
            <Input
              id="ap-disc"
              type="text"
              inputMode="decimal"
              className="mt-1"
              value={patchDiscount}
              disabled={busy}
              onChange={(e) => setPatchDiscount(e.target.value)}
              placeholder="Boş = değiştirme"
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ButtonPrimary type="submit" disabled={busy || !orgId.trim()}>
            {busy ? '…' : 'Uygula'}
          </ButtonPrimary>
          {patchMsg ? (
            <span className="text-sm text-neutral-600 dark:text-neutral-400">{patchMsg}</span>
          ) : null}
        </div>
      </form>
    </section>
  )
}
