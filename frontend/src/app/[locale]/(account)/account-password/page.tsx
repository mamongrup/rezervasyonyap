'use client'

import { changePassword } from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getMessages } from '@/utils/getT'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AccountPasswordPage() {
  const params = useParams()
  const router = useRouter()
  const vitrinPath = useVitrinHref()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const T = getMessages(locale).changePassword

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const token = getStoredAuthToken()
    if (!token) { router.push(vitrinPath('/login')); return }
    if (next.length < 6) { setError(T.errorTooShort); return }
    if (next !== confirm) { setError(T.errorMismatch); return }

    setPending(true)
    try {
      await changePassword(token, { current_password: current, new_password: next })
      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(
        msg === 'wrong_current_password' ? T.errorWrongCurrent
          : msg === 'password_too_short' ? T.errorTooShort
            : msg === 'session_not_found' ? T.errorExpiredSession
              : msg,
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">{T.pageTitle}</h1>
      <Divider className="my-8 w-14!" />

      <form onSubmit={onSubmit} className="max-w-xl space-y-6">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
            {T.successMessage}
          </p>
        )}
        <Field>
          <Label>{T.currentPassword}</Label>
          <Input type="password" name="current_password" required autoComplete="current-password" className="mt-1.5"
            value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field>
          <Label>{T.newPassword}</Label>
          <Input type="password" name="new_password" required minLength={6} autoComplete="new-password" className="mt-1.5"
            value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field>
          <Label>{T.confirmPassword}</Label>
          <Input type="password" name="confirm_password" required autoComplete="new-password" className="mt-1.5"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <div className="pt-4">
          <ButtonPrimary type="submit" disabled={pending}>
            {pending ? T.saving : T.submitButton}
          </ButtonPrimary>
        </div>
      </form>
    </div>
  )
}
