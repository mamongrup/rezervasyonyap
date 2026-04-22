import { ApplicationLayout } from '../(app)/application-layout'
import { PageNavigation } from './PageNavigation'
import { connection } from 'next/server'

/** Hesap sayfaları build’de SSG ile takılmasın (aynı site config / API gecikmesi). */
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function Layout({
  children,
  params,
}: {
  children?: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  await connection()
  const { locale } = await params
  return (
    <ApplicationLayout locale={locale}>
      <div className="bg-neutral-50 dark:bg-neutral-900">
        <div className="border-b border-neutral-200 bg-white pt-12 dark:border-neutral-700 dark:bg-neutral-800">
          <PageNavigation />
        </div>
        <div className="container pt-14 pb-24 sm:pt-16 lg:pb-32">{children}</div>
      </div>
    </ApplicationLayout>
  )
}
