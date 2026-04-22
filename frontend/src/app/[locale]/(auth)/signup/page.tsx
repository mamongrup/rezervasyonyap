import SignupForm from '@/components/travel/SignupForm'
import { vitrinHref } from '@/lib/vitrin-href'
import { getMessages } from '@/utils/getT'
import Logo from '@/shared/Logo'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Sign Up',
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const loginHref = await vitrinHref(locale, '/login')
  const T = getMessages(locale)
  return (
    <div className="container">
      <div className="my-16 flex justify-center">
        <Logo className="w-auto" />
      </div>

      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">{T.login.signUpPageTitle}</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {T.login.signUpSubtitle}{' '}
            <Link href={loginHref} className="font-medium text-primary-600 underline dark:text-primary-400">
              {T.login.signInLink}
            </Link>
          </p>
        </div>

        <SignupForm locale={locale} />
      </div>
    </div>
  )
}
