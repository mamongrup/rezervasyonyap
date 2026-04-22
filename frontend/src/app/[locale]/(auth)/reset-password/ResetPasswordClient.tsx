'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { resetPassword } from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Logo from '@/shared/Logo'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function ResetPasswordClient() {
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const T = getMessages(locale).resetPassword
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError(T.errorTooShort); return }
    if (password !== confirm) { setError(T.errorMismatch); return }
    if (!token) { setError(T.errorNoToken); return }
    setPending(true)
    try {
      await resetPassword({ token, new_password: password })
      setDone(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(
        msg === 'invalid_or_expired_token' ? T.errorInvalidToken
          : msg === 'password_too_short' ? T.errorTooShort
            : msg,
      )
    } finally {
      setPending(false)
    }
  }

  if (!token) {
    return (
      <div className="container">
        <div className="my-16 flex justify-center"><Logo className="w-auto" /></div>
        <div className="mx-auto max-w-md space-y-6 text-center">
          <p className="text-red-600">{T.invalidLinkMsg}</p>
          <Link href={vitrinPath('/forgot-password')} className="font-medium underline text-primary-600">
            {T.requestNewLink}
          </Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="container">
        <div className="my-16 flex justify-center"><Logo className="w-auto" /></div>
        <div className="mx-auto max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">{T.successTitle}</h2>
          <p className="text-neutral-500 dark:text-neutral-400">{T.successMessage}</p>
          <Link
            href={vitrinPath('/login')}
            className="inline-block rounded-full bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            {T.signInButton}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="my-16 flex justify-center"><Logo className="w-auto" /></div>
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
            <Label className="text-neutral-800 dark:text-neutral-200">{T.newPassword}</Label>
            <Input type="password" required minLength={6} autoComplete="new-password" className="mt-1"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">{T.confirmPassword}</Label>
            <Input type="password" required autoComplete="new-password" className="mt-1"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <ButtonPrimary type="submit" disabled={pending}>
            {pending ? T.saving : T.submitButton}
          </ButtonPrimary>
        </form>
      </div>
    </div>
  )
}
