'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import AdminSocialApiSection from '../../AdminSocialApiSection'
import AdminSocialSection from '../../AdminSocialSection'
import { useState } from 'react'
import { Settings, Share2 } from 'lucide-react'

type Tab = 'api' | 'queue'

export default function AdminSocialPage() {
  const [tab, setTab] = useState<Tab>('api')

  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        {/* Sekme navigasyonu */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-[color:var(--manage-card-border)] bg-[color:var(--manage-card-bg)] p-1 backdrop-blur-sm w-fit">
          <button
            type="button"
            onClick={() => setTab('api')}
            className={[
              'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
              tab === 'api'
                ? 'bg-[color:var(--manage-primary)] text-white shadow-sm'
                : 'text-[color:var(--manage-text-muted)] hover:bg-[color:var(--manage-hover-bg)] hover:text-[color:var(--manage-text)]',
            ].join(' ')}
          >
            <Settings className="h-4 w-4" />
            API Ayarları
          </button>
          <button
            type="button"
            onClick={() => setTab('queue')}
            className={[
              'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
              tab === 'queue'
                ? 'bg-[color:var(--manage-primary)] text-white shadow-sm'
                : 'text-[color:var(--manage-text-muted)] hover:bg-[color:var(--manage-hover-bg)] hover:text-[color:var(--manage-text)]',
            ].join(' ')}
          >
            <Share2 className="h-4 w-4" />
            Paylaşım Kuyruğu
          </button>
        </div>

        {tab === 'api' && <AdminSocialApiSection />}
        {tab === 'queue' && <AdminSocialSection />}
      </div>
    </ManageAccessGuard>
  )
}
