import Header from '@/components/Header/Header'
import { connection } from 'next/server'
import { ApplicationLayout } from '../application-layout'

/**
 * Bu grup altında manage, ilan-ekle vb. çok dillı sayfalar var; build SSG sırasında
 * ApplicationLayout → getCachedSiteConfig ve panel verisi uzak API’de takılınca 300sn aşılıyor.
 * Bu segmenti tamamen istek-anı render’a al (VPS `next build` güvenilir olsun).
 */
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

/** Sayfa metadata’sı child `generateMetadata` / `[locale]/layout` üzerinden; şablon “Home” yok. */
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
