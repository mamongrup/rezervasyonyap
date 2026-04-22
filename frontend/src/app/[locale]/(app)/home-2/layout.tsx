import Header from '@/components/Header/Header'
import { ApplicationLayout } from '../application-layout'

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return (
    <ApplicationLayout locale={locale} header={<Header hasBorderBottom={false} locale={locale} />}>
      {children}
    </ApplicationLayout>
  )
}
