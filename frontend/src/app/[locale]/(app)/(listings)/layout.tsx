import Header from '@/components/Header/Header'
import { ReactNode } from 'react'
import { ApplicationLayout } from '../application-layout'

/**
 * İlan detay kabuğu — ISR. Tarihli fiyat / müsaitlik blokları kendi
 * fetch’lerinde `no-store` veya kısa TTL kullanmaya devam eder.
 */
export const revalidate = 120

const Layout = async ({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) => {
  const { locale } = await params
  return (
    <ApplicationLayout locale={locale} header={<Header hasBorderBottom={false} locale={locale} />}>
      <div>
        <div className="container">{children}</div>
      </div>
    </ApplicationLayout>
  )
}

export default Layout
