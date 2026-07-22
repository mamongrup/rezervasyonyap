import { ApplicationLayout } from '../application-layout'

/** Metadata `[locale]/layout` + `page.tsx` generateMetadata’dan gelir (şablon “Home/Chisfis” sızıntısı yok). */
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return <ApplicationLayout locale={locale}>{children}</ApplicationLayout>
}
