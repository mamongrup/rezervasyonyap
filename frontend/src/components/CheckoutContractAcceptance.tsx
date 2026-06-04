'use client'

import { checkoutT, fmtCheckout } from '@/lib/checkout-i18n'
import { getPublicCheckoutContractsBundle, type PublicContractBlock } from '@/lib/travel-api'
import { Description, Field, Label } from '@/shared/fieldset'
import React from 'react'

export type CheckoutContractAcceptancePayload = {
  ok: boolean
  contract_accepted: boolean
  general_contract_accepted: boolean
  sales_contract_accepted: boolean
}

type Props = {
  listingId: string | undefined
  locale: string
  optional?: boolean
  onValidityChange: (payload: CheckoutContractAcceptancePayload) => void
}

function ContractSection({
  block,
  checked,
  onChange,
  inputId,
  label,
  locale,
}: {
  block: PublicContractBlock
  checked: boolean
  onChange: (v: boolean) => void
  inputId: string
  label: string
  locale: string
}) {
  const C = checkoutT(locale)
  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{block.title}</h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {fmtCheckout(C.contractVersion, { version: block.version })}
        </p>
      </div>
      <div
        className="max-h-48 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-3 text-sm leading-relaxed whitespace-pre-wrap text-neutral-800 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-200"
        tabIndex={0}
        role="region"
        aria-label={C.contractBodyAria}
      >
        {block.body_text}
      </div>
      <Field className="flex flex-row items-start gap-3 !space-y-0">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-neutral-300"
        />
        <div>
          <Label htmlFor={inputId} className="!text-sm font-medium cursor-pointer">
            {label}
          </Label>
          <Description className="!mt-1">{C.contractAcceptHint}</Description>
        </div>
      </Field>
    </div>
  )
}

export default function CheckoutContractAcceptance({
  listingId,
  locale,
  optional = false,
  onValidityChange,
}: Props) {
  const C = checkoutT(locale)
  const notify = React.useRef(onValidityChange)
  React.useEffect(() => {
    notify.current = onValidityChange
  }, [onValidityChange])

  const [loading, setLoading] = React.useState(Boolean(listingId))
  const [err, setErr] = React.useState<string | null>(null)
  const [bundle, setBundle] = React.useState<Awaited<
    ReturnType<typeof getPublicCheckoutContractsBundle>
  > | null>(null)

  const [catAccepted, setCatAccepted] = React.useState(false)
  const [genAccepted, setGenAccepted] = React.useState(true)
  const [salAccepted, setSalAccepted] = React.useState(true)

  React.useEffect(() => {
    if (!listingId) {
      setLoading(false)
      setErr(null)
      setBundle(null)
      setCatAccepted(false)
      setGenAccepted(true)
      setSalAccepted(true)
      notify.current({
        ok: optional,
        contract_accepted: optional,
        general_contract_accepted: true,
        sales_contract_accepted: true,
      })
      return
    }
    let cancelled = false
    setLoading(true)
    setErr(null)
    setCatAccepted(false)
    void getPublicCheckoutContractsBundle(listingId, locale)
      .then((b) => {
        if (cancelled) return
        setBundle(b)
        setGenAccepted(!b.general)
        setSalAccepted(!b.sales)
        setCatAccepted(b.category ? false : optional)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        setLoading(false)
        setErr(e instanceof Error ? e.message : 'contract_load_failed')
        setBundle(null)
      })
    return () => {
      cancelled = true
    }
  }, [listingId, locale, optional])

  React.useEffect(() => {
    if (!listingId) return
    if (loading || err || !bundle) {
      notify.current({
        ok: false,
        contract_accepted: false,
        general_contract_accepted: false,
        sales_contract_accepted: false,
      })
      return
    }

    const catMissing = bundle.category === null
    if (catMissing && !optional) {
      notify.current({
        ok: false,
        contract_accepted: false,
        general_contract_accepted: false,
        sales_contract_accepted: false,
      })
      return
    }

    const needCat = bundle.category !== null
    const needGen = bundle.general !== null
    const needSal = bundle.sales !== null

    const contract_accepted = !needCat || catAccepted
    const general_contract_accepted = !needGen || genAccepted
    const sales_contract_accepted = !needSal || salAccepted
    const ok = contract_accepted && general_contract_accepted && sales_contract_accepted

    notify.current({
      ok,
      contract_accepted,
      general_contract_accepted,
      sales_contract_accepted,
    })
  }, [listingId, optional, loading, err, bundle, catAccepted, genAccepted, salAccepted])

  if (!listingId) {
    if (optional) return null
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        {C.contractsMissingListing}
      </p>
    )
  }

  if (loading) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">{C.contractsLoading}</p>
  }

  if (err) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
        <p className="font-medium">{C.contractsLoadFailed}</p>
        <p className="mt-1 font-mono text-xs opacity-90">{err}</p>
        <p className="mt-2 text-xs">{C.contractsLoadFailedHint}</p>
      </div>
    )
  }

  if (!bundle) return null

  const missingCategory = bundle.category === null && !optional
  const hasAnyBlock = Boolean(bundle.general || bundle.sales || bundle.category)

  if (!hasAnyBlock && missingCategory) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-medium">{C.contractsMissingCategory}</p>
        <p className="mt-1 text-xs">{C.contractsMissingCategoryHint}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
        {C.contractsSectionTitle ?? 'Sözleşmeler'}
      </h3>
      {missingCategory ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">{C.contractsMissingCategory}</p>
          <p className="mt-1 text-xs">{C.contractsMissingCategoryHint}</p>
        </div>
      ) : null}
      {bundle.general ? (
        <ContractSection
          block={bundle.general}
          checked={genAccepted}
          onChange={setGenAccepted}
          inputId="checkout-contract-general"
          label={C.contractGeneralLabel}
          locale={locale}
        />
      ) : null}
      {bundle.sales ? (
        <ContractSection
          block={bundle.sales}
          checked={salAccepted}
          onChange={setSalAccepted}
          inputId="checkout-contract-sales"
          label={C.contractSalesLabel}
          locale={locale}
        />
      ) : null}
      {bundle.category ? (
        <ContractSection
          block={bundle.category}
          checked={catAccepted}
          onChange={setCatAccepted}
          inputId="checkout-contract-category"
          label={C.contractCategoryLabel}
          locale={locale}
        />
      ) : null}
    </div>
  )
}
