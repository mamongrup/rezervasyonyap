'use client'

import { formatAuthApiError } from '@/lib/auth-error-messages'
import { resolvePostLoginPath } from '@/lib/post-login-redirect'
import { getAuthMe, loginUser } from '@/lib/travel-api'
import { setStoredAuthToken } from '@/lib/auth-storage'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { normalizeHrefForLocale } from '@/lib/i18n-config'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { getMessages } from '@/utils/getT'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface LoginFormProps {
  locale: string
  /** Modal içinde kullanıldığında: başarılı girişte sayfa yönlendirmesi yerine bu callback çağrılır */
  onSuccess?: () => void
}

export default function LoginForm({ locale, onSuccess }: LoginFormProps) {
  const router = useRouter()
  const vitrinPath = useVitrinHref()
  const T = getMessages(locale)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') ?? '').trim()
    const password = String(fd.get('password') ?? '')
    if (!email || !password) {
      setError('email_password_required')
      return
    }
    setPending(true)
    try {
      const res = await loginUser({ email, password })
      setStoredAuthToken(res.token)
      if (onSuccess) {
        onSuccess()
        router.refresh()
      } else {
        const me = await getAuthMe(res.token)
        const path = resolvePostLoginPath(me.permissions ?? [], me.roles ?? [])
        router.push(vitrinPath(path))
        router.refresh()
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'login_failed'
      setError(formatAuthApiError(raw))
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="grid grid-cols-1 gap-6" onSubmit={onSubmit}>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <Field className="block">
        <Label className="text-neutral-800 dark:text-neutral-200">{T.login['Email address']}</Label>
        <Input type="email" name="email" required autoComplete="email" placeholder="example@example.com" className="mt-1" />
      </Field>
      <Field className="block">
        <div className="flex items-center justify-between text-neutral-800 dark:text-neutral-200">
          <Label>{T.login['Password']}</Label>
          <Link href={normalizeHrefForLocale(locale, '/forgot-password')} className="text-sm font-medium underline">
            {T.login['Forgot password?']}
          </Link>
        </div>
        <Input type="password" name="password" required autoComplete="current-password" className="mt-1" />
      </Field>
      <ButtonPrimary type="submit" disabled={pending}>
        {pending ? '…' : T.login['Login']}
      </ButtonPrimary>
      <div className="block text-center text-sm text-neutral-700 dark:text-neutral-300">
        {T.login['New user?']}{' '}
        <Link href={normalizeHrefForLocale(locale, '/signup')} className="font-medium underline">
          {T.login['Create an account']}
        </Link>
      </div>
    </form>
  )
}
