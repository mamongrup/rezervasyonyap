'use client'

import Input from '@/shared/Input'
import { motion } from 'framer-motion'
import { Loader2, Lock } from 'lucide-react'
import { useMemo, useState } from 'react'

export type ParatikaDirectPostLabels = {
  title: string
  note: string
  cardOwner: string
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  pay: string
  secureNote: string
  processing3d: string
}

type Props = {
  actionUrl: string
  defaultCardOwner?: string
  labels: ParatikaDirectPostLabels
  onBeforeSubmit?: () => void
}

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

function formatPanDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function maskPanForPreview(pan: string): string {
  const digits = pan.replace(/\D/g, '')
  if (!digits) return '•••• •••• •••• ••••'
  const parts: string[] = []
  for (let i = 0; i < 16; i += 4) {
    const chunk = digits.slice(i, i + 4)
    if (!chunk) parts.push('••••')
    else if (chunk.length < 4) parts.push(chunk.padEnd(4, '•'))
    else parts.push(chunk)
  }
  return parts.join(' ')
}

const fieldMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
}

export default function ParatikaDirectPostForm({
  actionUrl,
  defaultCardOwner = '',
  labels,
  onBeforeSubmit,
}: Props) {
  const years = useMemo(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 16 }, (_, i) => String(y + i))
  }, [])

  const [cardOwner, setCardOwner] = useState(defaultCardOwner)
  const [panDigits, setPanDigits] = useState('')
  const [expiryMonth, setExpiryMonth] = useState('')
  const [expiryYear, setExpiryYear] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const panDisplay = formatPanDisplay(panDigits)
  const expiryPreview =
    expiryMonth && expiryYear ? `${expiryMonth}/${expiryYear.slice(-2)}` : 'MM/YY'

  return (
    <form
      action={actionUrl}
      method="POST"
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        setSubmitting(true)
        const form = e.currentTarget
        const panHidden = form.elements.namedItem('pan') as HTMLInputElement
        panHidden.value = panDigits.replace(/\D/g, '')
        onBeforeSubmit?.()
        form.submit()
      }}
    >
      <input type="hidden" name="installmentCount" value="1" />
      <input type="hidden" name="points" value="" />
      <input type="hidden" name="pan" value="" />

      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-primary-900 p-6 text-white shadow-2xl shadow-slate-900/25"
        initial={{ opacity: 0, y: 20, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformPerspective: 800 }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"
        />
        <div className="flex items-start justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            Secure
          </span>
          <div className="flex gap-1.5">
            <span className="h-7 w-10 rounded-md bg-white/15" />
            <span className="h-7 w-7 rounded-full bg-amber-400/90" />
          </div>
        </div>
        <motion.p
          className="mt-8 font-mono text-lg tracking-[0.12em] sm:text-xl"
          key={panDigits}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {maskPanForPreview(panDigits)}
        </motion.p>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-white/45">{labels.cardOwner}</p>
            <p className="truncate text-sm font-medium uppercase tracking-wide">
              {cardOwner.trim() || 'AD SOYAD'}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wider text-white/45">Valid</p>
            <p className="font-mono text-sm">{expiryPreview}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="space-y-4"
        initial="initial"
        animate="animate"
        variants={{
          animate: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
        }}
      >
        <motion.div variants={fieldMotion}>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {labels.cardOwner}
          </label>
          <Input
            className="mt-1.5 transition-shadow focus:shadow-md focus:shadow-primary-100/50 dark:focus:shadow-primary-900/20"
            name="cardOwner"
            required
            maxLength={32}
            autoComplete="cc-name"
            value={cardOwner}
            onChange={(e) => setCardOwner(e.target.value)}
          />
        </motion.div>

        <motion.div variants={fieldMotion}>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {labels.cardNumber}
          </label>
          <Input
            className="mt-1.5 font-mono tracking-wider transition-shadow focus:shadow-md focus:shadow-primary-100/50 dark:focus:shadow-primary-900/20"
            required
            maxLength={19}
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="0000 0000 0000 0000"
            value={panDisplay}
            onChange={(e) => setPanDigits(e.target.value.replace(/\D/g, '').slice(0, 16))}
          />
        </motion.div>

        <motion.div className="grid grid-cols-2 gap-4 sm:grid-cols-3" variants={fieldMotion}>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {labels.expiryMonth}
            </label>
            <select
              name="expiryMonth"
              required
              value={expiryMonth}
              onChange={(e) => setExpiryMonth(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm transition-shadow focus:border-primary-300 focus:shadow-md focus:ring-3 focus:ring-primary-200/50 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:ring-primary-600/25"
            >
              <option value="">—</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {labels.expiryYear}
            </label>
            <select
              name="expiryYear"
              required
              value={expiryYear}
              onChange={(e) => setExpiryYear(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm transition-shadow focus:border-primary-300 focus:shadow-md focus:ring-3 focus:ring-primary-200/50 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:ring-primary-600/25"
            >
              <option value="">—</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {labels.cvv}
            </label>
            <Input
              className="mt-1.5 font-mono transition-shadow focus:shadow-md focus:shadow-primary-100/50 dark:focus:shadow-primary-900/20"
              name="cvv"
              type="password"
              required
              maxLength={4}
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="•••"
            />
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="flex items-start gap-2 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{labels.secureNote}</p>
      </motion.div>

      <motion.button
        type="submit"
        disabled={submitting}
        className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-neutral-900 text-sm font-semibold text-white shadow-lg shadow-neutral-900/20 transition hover:bg-neutral-800 disabled:opacity-70 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
        whileHover={{ scale: submitting ? 1 : 1.01 }}
        whileTap={{ scale: submitting ? 1 : 0.99 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{labels.processing3d}</span>
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            {labels.pay}
          </>
        )}
      </motion.button>
    </form>
  )
}
