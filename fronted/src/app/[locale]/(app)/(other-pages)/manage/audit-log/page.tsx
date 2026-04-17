'use client'

import Link from 'next/link'
import { Construction } from 'lucide-react'

export default function PlaceholderPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/40">
        <Construction className="h-8 w-8 text-amber-600 dark:text-amber-400" />
      </div>
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Denetim Gunlugu</h1>
      <p className="mt-3 max-w-md text-sm text-neutral-500">
        Sistem degisiklikleri ve yonetici islemlerini takip edin. Bu sayfa gelistirme asamasindadir.
      </p>
      <Link
        href="javascript:history.back()"
        className="mt-6 rounded-xl bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
      >
        Geri Don
      </Link>
    </div>
  )
}