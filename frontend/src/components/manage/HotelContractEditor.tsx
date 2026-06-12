'use client'

import { formatManageApiError } from '@/lib/manage-api-error-tr'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  listManageCategoryContracts,
  patchManageListingContract,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import { useEffect, useState } from 'react'

export default function HotelContractEditor({
  listingId,
  organizationId,
  categoryCode,
  initialContractId,
}: {
  listingId: string
  organizationId?: string
  categoryCode: string
  initialContractId?: string | null
}) {
  const orgParam = organizationId?.trim() ? { organizationId: organizationId.trim() } : undefined
  const [contracts, setContracts] = useState<{ id: string; code: string; title?: string }[]>([])
  const [contractId, setContractId] = useState(initialContractId?.trim() ?? '')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    setContractId(initialContractId?.trim() ?? '')
  }, [initialContractId])

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setLoading(false)
      return
    }
    let cancelled = false
    void listManageCategoryContracts(token, { contractScope: 'category', categoryCode, ...orgParam })
      .then((res) => {
        if (cancelled) return
        const rows = (res.contracts ?? [])
          .filter((c) => c.is_active === 'true' || c.is_active === 't')
          .map((c) => ({
            id: c.id,
            code: c.code,
            title: c.code,
          }))
        setContracts(rows)
      })
      .catch(() => {
        if (!cancelled) setContracts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [categoryCode, organizationId])

  async function handleSave() {
    const token = getStoredAuthToken()
    if (!token || !contractId.trim()) return
    setBusy(true)
    setMsg(null)
    try {
      await patchManageListingContract(
        token,
        listingId,
        { category_contract_id: contractId.trim() },
        orgParam,
      )
      setMsg({ ok: true, text: 'Sözleşme ataması kaydedildi.' })
    } catch (e) {
      setMsg({
        ok: false,
        text: e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('save_failed'),
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-neutral-400">Sözleşmeler yükleniyor…</p>

  if (contracts.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Bu kategori için aktif sözleşme şablonu yok. Katalog → Sözleşmeler bölümünden ekleyin.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
        Vitrinde «Kurallar» bölümünde ve rezervasyon akışında gösterilen otel sözleşmesi.
      </p>
      <Field className="block max-w-md">
        <Label>Sözleşme şablonu</Label>
        <select
          className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          value={contractId}
          onChange={(e) => setContractId(e.target.value)}
        >
          <option value="">— Seçin —</option>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Field>
      <ButtonPrimary type="button" disabled={busy || !contractId.trim()} onClick={() => void handleSave()}>
        {busy ? 'Kaydediliyor…' : 'Sözleşmeyi kaydet'}
      </ButtonPrimary>
      {msg ? (
        <p className={`text-sm ${msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
          {msg.text}
        </p>
      ) : null}
    </div>
  )
}
