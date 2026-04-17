import type { Metadata } from 'next'
import SubcategoriesManageClient from './SubcategoriesManageClient'

export const metadata: Metadata = {
  title: 'Alt Kategori Yönetimi',
}

export default function SubcategoriesManagePage() {
  return <SubcategoriesManageClient />
}
