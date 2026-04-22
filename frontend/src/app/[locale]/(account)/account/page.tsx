import AccountProfile from '@/components/travel/AccountProfile'
import { getMessages } from '@/utils/getT'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const T = getMessages(locale).accountPage
  return { title: T.pageTitle, description: T.pageDescription }
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <AccountProfile locale={locale} />
}
