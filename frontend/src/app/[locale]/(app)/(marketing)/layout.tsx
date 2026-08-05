import Header from '@/components/Header/Header'
import { ApplicationLayout } from '../application-layout'

/**
 * Vitrin CMS / pazarlama sayfaları — ISR.
 * Manage, checkout, ilan-ekle vb. `(other-pages)` altında force-dynamic kalır;
 * build sırasında panel API’sine takılma riski bu gruba taşınmaz.
 */
export const revalidate = 600

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return (
    <ApplicationLayout locale={locale} header={<Header hasBorderBottom={true} locale={locale} />}>
      {children}
    </ApplicationLayout>
  )
}
