'use client'

import { formatCheckoutMoney } from '@/lib/checkout-i18n'
import { motion } from 'framer-motion'
import { ArrowLeft, CreditCard, Lock, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'

export type ParatikaShellLabels = {
  backToCheckout: string
  secure3dBadge: string
  encryptedBadge: string
  poweredBy: string
  amountDue: string
  reservationCode: string
}

type Props = {
  locale: string
  title: string
  subtitle?: string
  labels: ParatikaShellLabels
  amountKurus?: number
  currencyCode?: string
  publicCode?: string
  onBack: () => void
  children: ReactNode
  footer?: ReactNode
}

const fadeEase = [0.22, 1, 0.36, 1] as const
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: fadeEase },
}

export default function ParatikaCheckoutShell({
  locale,
  title,
  subtitle,
  labels,
  amountKurus,
  currencyCode = 'TRY',
  publicCode,
  onBack,
  children,
  footer,
}: Props) {
  const amount =
    amountKurus != null && Number.isFinite(amountKurus)
      ? formatCheckoutMoney(locale, amountKurus / 100, currencyCode)
      : null

  return (
    <main className="relative min-h-[calc(100vh-5rem)] overflow-hidden pb-24 pt-8 sm:pt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary-50/80 via-white to-neutral-50 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-20 -z-10 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl dark:bg-primary-900/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-32 -z-10 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-900/15"
      />

      <div className="container max-w-5xl">
        <motion.button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          {...fadeUp}
        >
          <ArrowLeft className="h-4 w-4" />
          {labels.backToCheckout}
        </motion.button>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
          <motion.div
            className="rounded-3xl border border-neutral-200/80 bg-white/90 p-6 shadow-xl shadow-neutral-200/50 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/90 dark:shadow-none sm:p-8"
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.05 }}
          >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {labels.secure3dBadge}
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              <CreditCard className="hidden h-10 w-10 text-primary-500/80 sm:block" strokeWidth={1.5} />
            </div>

            {children}

            {footer ? <div className="mt-6 border-t border-neutral-100 pt-5 dark:border-neutral-800">{footer}</div> : null}
          </motion.div>

          <motion.aside
            className="space-y-4 lg:sticky lg:top-24"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease: fadeEase }}
          >
            {(amount || publicCode) && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                {publicCode ? (
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    {labels.reservationCode}
                  </p>
                ) : null}
                {publicCode ? (
                  <p className="mt-1 font-mono text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                    {publicCode}
                  </p>
                ) : null}
                {amount ? (
                  <>
                    <p className={`text-xs font-medium uppercase tracking-wide text-neutral-400 ${publicCode ? 'mt-4' : ''}`}>
                      {labels.amountDue}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-50">{amount}</p>
                  </>
                ) : null}
              </div>
            )}

            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                    {labels.encryptedBadge}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-800/80 dark:text-emerald-300/80">
                    {labels.poweredBy}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg bg-white/80 px-2.5 py-1 text-[10px] font-bold tracking-wider text-neutral-600 shadow-sm dark:bg-neutral-900/80 dark:text-neutral-300">
                  VISA
                </span>
                <span className="rounded-lg bg-white/80 px-2.5 py-1 text-[10px] font-bold tracking-wider text-neutral-600 shadow-sm dark:bg-neutral-900/80 dark:text-neutral-300">
                  MC
                </span>
                <span className="rounded-lg bg-white/80 px-2.5 py-1 text-[10px] font-bold tracking-wider text-neutral-600 shadow-sm dark:bg-neutral-900/80 dark:text-neutral-300">
                  TROY
                </span>
                <span className="rounded-lg bg-white/80 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-700 shadow-sm dark:bg-neutral-900/80 dark:text-emerald-400">
                  3D
                </span>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>
    </main>
  )
}

export function ParatikaCheckoutLoading({ message }: { message: string }) {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center px-4 pb-24 pt-16">
      <motion.div
        className="flex flex-col items-center gap-6 text-center"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative flex h-16 w-16 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-primary-200 dark:border-primary-800"
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="h-10 w-10 rounded-full border-2 border-t-primary-500 border-neutral-200 dark:border-neutral-700"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <Lock className="absolute h-4 w-4 text-primary-600 dark:text-primary-400" />
        </div>
        <p className="max-w-sm text-sm font-medium text-neutral-600 dark:text-neutral-400">{message}</p>
      </motion.div>
    </main>
  )
}

export function ParatikaCheckoutError({
  message,
  backLabel,
  onBack,
}: {
  message: string
  backLabel: string
  onBack: () => void
}) {
  return (
    <main className="container max-w-lg pb-24 pt-12">
      <motion.div
        className="rounded-2xl border border-red-200 bg-red-50/80 p-6 dark:border-red-900/50 dark:bg-red-950/30"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="whitespace-pre-line text-sm leading-relaxed text-red-700 dark:text-red-300">{message}</p>
        <button
          type="button"
          className="mt-5 text-sm font-semibold text-red-800 underline underline-offset-2 dark:text-red-200"
          onClick={onBack}
        >
          {backLabel}
        </button>
      </motion.div>
    </main>
  )
}
