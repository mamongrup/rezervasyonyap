import type { Metadata } from 'next'
import HeaderFooterManageClient from './HeaderFooterManageClient'

export const metadata: Metadata = {
  title: 'Footer yönetimi',
  description: 'Site footer metinleri, güven rozetleri ve bağlantı sütunları',
}

export default function HeaderFooterManagePage() {
  return <HeaderFooterManageClient />
}
