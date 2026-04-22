'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { formatAuthApiError } from '@/lib/auth-error-messages'
import { forgotPassword } from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Logo from '@/shared/Logo'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const T = getMessages(locale).forgotPassword

  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [devToken, setDevToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setError(null)
    setPending(true)
    try {
      const res = await forgotPassword(email.trim())
      setSent(true)
      if (res.reset_token) setDevToken(res.reset_token)
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'unknown_error'
      setError(formatAuthApiError(raw))
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    const resetPath = devToken ? `${vitrinPath('/reset-password')}?token=${encodeURIComponent(devToken)}` : null
    const resetUrl = resetPath
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}${resetPath}`
      : null

    return (
      <div className="container">
        <div className="my-16 flex justify-center">
          <Logo className="w-auto" />
        </div>
        <div className="mx-auto max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">{T.successTitle}</h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            {T.successMessage.replace('{email}', email)}
          </p>
          {resetUrl && devToken && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left dark:border-amber-800 dark:bg-amber-900/20">
              <p className="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-400">{T.devModeNote}</p>
              <Link
                href={resetPath ?? '#'}
                className="break-all text-sm text-primary-600 underline dark:text-primary-400"
              >
                {resetUrl}
              </Link>
            </div>
          )}
          <Link
            href={vitrinPath('/login')}
            className="block text-sm font-medium text-primary-600 underline dark:text-primary-400"
          >
            {T.backToLogin}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="my-16 flex justify-center">
        <Logo className="w-auto" />
      </div>
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">{T.pageTitle}</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{T.pageSubtitle}</p>
        </div>

        <form className="grid grid-cols-1 gap-6" onSubmit={onSubmit}>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          )}
          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">{T.emailLabel}</Label>
            <Input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder={T.emailPlaceholder}
              className="mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <ButtonPrimary type="submit" disabled={pending}>
            {pending ? T.sending : T.submitButton}
          </ButtonPrimary>
        </form>

        <div className="block text-center text-sm text-neutral-700 dark:text-neutral-300">
          <Link href={vitrinPath('/login')} className="font-medium underline">
            {T.backToLogin}
          </Link>
        </div>
      </div>
    </div>
  )
}
