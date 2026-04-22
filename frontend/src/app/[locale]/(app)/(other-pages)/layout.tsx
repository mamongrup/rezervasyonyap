import Header from '@/components/Header/Header'
import { Metadata } from 'next'
import { connection } from 'next/server'
import { ApplicationLayout } from '../application-layout'

/**
 * Bu grup altında manage, ilan-ekle vb. çok dillı sayfalar var; build SSG sırasında
 * ApplicationLayout → getCachedSiteConfig ve panel verisi uzak API’de takılınca 300sn aşılıyor.
 * Bu segmenti tamamen istek-anı render’a al (VPS `next build` güvenilir olsun).
 */
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata: Metadata = {
  title: 'Home',
  description:
    'Chisfis is a modern and elegant template for Next.js, Tailwind CSS, and TypeScript. It is designed to be simple and easy to use, with a focus on performance and accessibility.',
  keywords: ['Next.js', 'Tailwind CSS', 'TypeScript', 'Chisfis', 'Travel', 'E-commerce', 'Booking', 'Cars'],
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  await connection()
  const { locale } = await params
  return (
    <ApplicationLayout locale={locale} header={<Header hasBorderBottom={true} locale={locale} />}>
      {children}
    </ApplicationLayout>
  )
}
