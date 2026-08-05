import Header from '@/components/Header/Header'
import { connection } from 'next/server'
import { ApplicationLayout } from '../application-layout'

/**
 * Oturum / işlem / panel sayfaları — istek anı render.
 * Blog/about/legal gibi vitrin CMS sayfaları `(marketing)` grubunda ISR kullanır.
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
