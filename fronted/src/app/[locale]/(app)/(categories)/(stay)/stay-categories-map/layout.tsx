import { ApplicationLayout } from '../../../application-layout'
import Header3 from '@/components/Header/Header3'
import { ReactNode } from 'react'

const Layout = async ({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) => {
  const { locale } = await params
  return (
    <ApplicationLayout locale={locale} header={<Header3 initSearchFormTab="Stays" />}>
      {children}
    </ApplicationLayout>
  )
}

export default Layout
