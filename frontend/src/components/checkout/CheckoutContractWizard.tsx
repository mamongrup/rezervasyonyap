'use client'

import type { CheckoutContractAcceptancePayload } from '@/components/CheckoutContractAcceptance'
import { checkoutT, fmtCheckout } from '@/lib/checkout-i18n'
import { getPublicCheckoutContractsBundle, type PublicContractBlock } from '@/lib/travel-api'
import { ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import React from 'react'

type Props = {
  listingId: string | undefined
  locale: string
  onValidityChange: (payload: CheckoutContractAcceptancePayload) => void
}

type ContractItem = {
  id: string
  block: PublicContractBlock
  acceptField: 'general' | 'sales' | 'category'
}

export default function CheckoutContractWizard({ listingId, locale, onValidityChange }: Props) {
  const C = checkoutT(locale)
  const notify = React.useRef(onValidityChange)
  React.useEffect(() => {
    notify.current = onValidityChange
  }, [onValidityChange])

  const [loading, setLoading] = React.useState(Boolean(listingId))
  const [err, setErr] = React.useState<string | null>(null)
  const [items, setItems] = React.useState<ContractItem[]>([])
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [acceptedIds, setAcceptedIds] = React.useState<Set<string>>(new Set())
  const [catAccepted, setCatAccepted] = React.useState(false)
  const [genAccepted, setGenAccepted] = React.useState(true)
  const [salAccepted, setSalAccepted] = React.useState(true)

  React.useEffect(() => {
    if (!listingId) {
      setLoading(false)
      setItems([])
      notify.current({
        ok: false,
        blocking_reason: 'listing_contract_missing',
        contract_accepted: false,
        general_contract_accepted: true,
        sales_contract_accepted: true,
      })
      return
    }
    let cancelled = false
    setLoading(true)
    setErr(null)
    setAcceptedIds(new Set())
    void getPublicCheckoutContractsBundle(listingId, locale)
      .then((b) => {
        if (cancelled) return
        const list: ContractItem[] = []
        if (b.general) {
          list.push({ id: 'general', block: b.general, acceptField: 'general' })
        }
        if (b.sales) {
          list.push({ id: 'sales', block: b.sales, acceptField: 'sales' })
        }
        if (b.category) {
          list.push({ id: 'category', block: b.category, acceptField: 'category' })
        }
        setItems(list)
        setGenAccepted(!b.general)
        setSalAccepted(!b.sales)
        setCatAccepted(!b.category)
        const first = list[0]?.id ?? null
        setOpenId(first)
        setLoading(false)
        if (!b.category) {
          notify.current({
            ok: false,
            blocking_reason: 'listing_contract_missing',
            contract_accepted: false,
            general_contract_accepted: genAccepted,
            sales_contract_accepted: salAccepted,
          })
        }
      })
      .catch((e) => {
        if (cancelled) return
        setLoading(false)
        setErr(e instanceof Error ? e.message : 'contract_load_failed')
        setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [listingId, locale])

  React.useEffect(() => {
    if (!listingId || loading || err) {
      if (loading) {
        notify.current({
          ok: false,
          blocking_reason: 'loading',
          contract_accepted: false,
          general_contract_accepted: false,
          sales_contract_accepted: false,
        })
      }
      return
    }
    if (items.length === 0) {
      notify.current({
        ok: false,
        blocking_reason: 'listing_contract_missing',
        contract_accepted: false,
        general_contract_accepted: genAccepted,
        sales_contract_accepted: salAccepted,
      })
      return
    }
    const allAccepted = items.every((i) => acceptedIds.has(i.id))
    const needCat = items.some((i) => i.acceptField === 'category')
    const general_contract_accepted =
      !items.some((i) => i.acceptField === 'general') || genAccepted
    const sales_contract_accepted = !items.some((i) => i.acceptField === 'sales') || salAccepted
    const contract_accepted = !needCat || catAccepted
    const ok =
      allAccepted && contract_accepted && general_contract_accepted && sales_contract_accepted

    notify.current({
      ok,
      blocking_reason: ok ? 'none' : 'acceptance_pending',
      contract_accepted,
      general_contract_accepted,
      sales_contract_accepted,
    })
  }, [listingId, loading, err, items, acceptedIds, catAccepted, genAccepted, salAccepted])

  const acceptCurrent = (item: ContractItem) => {
    setAcceptedIds((prev) => new Set(prev).add(item.id))
    if (item.acceptField === 'general') setGenAccepted(true)
    if (item.acceptField === 'sales') setSalAccepted(true)
    if (item.acceptField === 'category') setCatAccepted(true)
    const idx = items.findIndex((i) => i.id === item.id)
    const next = items[idx + 1]
    setOpenId(next?.id ?? null)
  }

  const labelFor = (item: ContractItem) => {
    switch (item.acceptField) {
      case 'general':
        return C.contractGeneralLabel
      case 'sales':
        return C.contractSalesLabel
      case 'category':
        return C.contractCategoryLabel
    }
  }

  if (!listingId) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        {C.contractsMissingListing}
      </p>
    )
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">{C.contractsLoading}</p>
  }

  if (err) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30">
        <p className="font-medium">{C.contractsLoadFailed}</p>
        <p className="mt-1 font-mono text-xs">{err}</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {C.contractsMissingCategory}
      </p>
    )
  }

  const doneCount = acceptedIds.size

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {fmtCheckout(C.contractWizardProgress, { done: doneCount, total: items.length })}
      </p>
      <div className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
        {items.map((item, index) => {
          const done = acceptedIds.has(item.id)
          const open = openId === item.id
          const locked = index > 0 && !acceptedIds.has(items[index - 1]!.id)
          return (
            <div key={item.id} className={locked ? 'opacity-50' : ''}>
              <button
                type="button"
                disabled={locked}
                onClick={() => setOpenId(open ? null : item.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-start disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={[
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      done
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200',
                    ].join(' ')}
                  >
                    {done ? '✓' : index + 1}
                  </span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {labelFor(item)}
                  </span>
                </span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  className={['h-5 w-5 transition', open ? 'rotate-180' : ''].join(' ')}
                  strokeWidth={1.75}
                />
              </button>
              {open && !locked ? (
                <div className="space-y-4 border-t border-neutral-100 px-4 pb-4 pt-3 dark:border-neutral-800">
                  <p className="text-xs text-neutral-500">
                    {fmtCheckout(C.contractVersion, { version: item.block.version })}
                  </p>
                  <div
                    className="max-h-56 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-3 text-sm whitespace-pre-wrap text-neutral-800 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-200"
                    tabIndex={0}
                  >
                    {item.block.body_text}
                  </div>
                  {!done ? (
                    <button
                      type="button"
                      onClick={() => acceptCurrent(item)}
                      className="w-full rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 dark:bg-primary-500"
                    >
                      {C.contractWizardAccept}
                    </button>
                  ) : (
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      {C.contractWizardDone}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
