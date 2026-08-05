import { ApplicationLayout } from '../application-layout'
import type { ReactNode } from 'react'

/** Bölge vitrin sayfaları — ISR; panel kaydı `revalidateLocationPagePaths` ile bust eder. */
export const revalidate = 300

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return <ApplicationLayout locale={locale}>{children}</ApplicationLayout>
}
