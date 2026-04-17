import LoginForm from '@/components/travel/LoginForm'
import { vitrinHref } from '@/lib/vitrin-href'
import { getMessages } from '@/utils/getT'
import Logo from '@/shared/Logo'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Login',
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const signupHref = await vitrinHref(locale, '/signup')
  const T = getMessages(locale)
  return (
    <div className="container">
      <div className="my-16 flex justify-center">
        <Logo className="w-auto" />
      </div>

      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">{T.login.pageTitle}</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {T.login.pageSubtitle}{' '}
            <Link href={signupHref} className="font-medium text-primary-600 underline dark:text-primary-400">
              {T.login.signUpLink}
            </Link>
          </p>
        </div>

        <LoginForm locale={locale} />
      </div>
    </div>
  )
}
