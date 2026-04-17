'use client'

import { formatAuthApiError } from '@/lib/auth-error-messages'
import { registerUser } from '@/lib/travel-api'
import { setStoredAuthToken } from '@/lib/auth-storage'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { normalizeHrefForLocale } from '@/lib/i18n-config'
import { TcKimlikWidget } from '@/components/travel/TcKimlikWidget'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import T from '@/utils/getT'
import { ArrowRight, SkipForward } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Step = 'register' | 'tc-verify'

export default function SignupForm({ locale }: { locale: string }) {
  const router = useRouter()
  const vitrinPath = useVitrinHref()
  const [step, setStep] = useState<Step>('register')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') ?? '').trim()
    const password = String(fd.get('password') ?? '')
    const display_name = String(fd.get('display_name') ?? '').trim()
    if (!email || !password) {
      setError('email_password_required')
      return
    }
    setPending(true)
    try {
      const res = await registerUser({
        email,
        password,
        ...(display_name ? { display_name } : {}),
      })
      setStoredAuthToken(res.token)
      // Go to TC verification step instead of directly to account
      setStep('tc-verify')
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'register_failed'
      setError(formatAuthApiError(raw))
    } finally {
      setPending(false)
    }
  }

  function goToAccount() {
    router.push(vitrinPath('/account'))
    router.refresh()
  }

  // ── Adım 2: TC Doğrulama ──────────────────────────────────────────────────
  if (step === 'tc-verify') {
    return (
      <div className="space-y-6">
        {/* Başarı bilgisi */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
          ✅ Hesabınız oluşturuldu! Şimdi kimliğinizi doğrulayabilirsiniz.
        </div>

        <TcKimlikWidget onVerified={goToAccount} />

        {/* TC vatandaşı değil veya sonra yapmak istiyorum */}
        <div className="text-center">
          <button
            onClick={goToAccount}
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <SkipForward className="h-4 w-4" />
            TC vatandaşı değilim, atla
          </button>
        </div>
      </div>
    )
  }

  // ── Adım 1: Kayıt formu ───────────────────────────────────────────────────
  return (
    <form className="grid grid-cols-1 gap-6" onSubmit={onSubmit}>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <Field className="block">
        <Label className="text-neutral-800 dark:text-neutral-200">{T['login']['Email address']}</Label>
        <Input type="email" name="email" required autoComplete="email" placeholder="example@example.com" className="mt-1" />
      </Field>
      <Field className="block">
        <Label className="text-neutral-800 dark:text-neutral-200">{T['accountPage']['Name']}</Label>
        <Input type="text" name="display_name" autoComplete="name" className="mt-1" />
      </Field>
      <Field className="block">
        <Label className="flex items-center justify-between text-neutral-800 dark:text-neutral-200">
          {T['login']['Password']}
        </Label>
        <Input type="password" name="password" required autoComplete="new-password" className="mt-1" />
      </Field>
      <ButtonPrimary type="submit" disabled={pending}>
        {pending ? '…' : (
          <span className="flex items-center justify-center gap-2">
            {T['login']['Signup']}
            <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </ButtonPrimary>
      <div className="block text-center text-sm text-neutral-700 dark:text-neutral-300">
        {T['login']['Already have an account?']}{' '}
        <Link href={normalizeHrefForLocale(locale, '/login')} className="font-medium underline">
          {T['login']['Sign in']}
        </Link>
      </div>
    </form>
  )
}
