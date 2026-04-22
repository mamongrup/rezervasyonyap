'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { getAuthMe, listMySupplierApplications, type SupplierApplication } from '@/lib/travel-api'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { Loader2, CheckCircle2, Clock, XCircle, PlusCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  hotel:         { label: 'Otel',             emoji: '🏨' },
  holiday_home:  { label: 'Tatil Evi / Villa', emoji: '🏡' },
  yacht_charter: { label: 'Yat Kiralama',     emoji: '⛵' },
  tour:          { label: 'Tur',               emoji: '🗺️' },
  activity:      { label: 'Aktivite',          emoji: '🏄' },
  cruise:        { label: 'Kruvaziyer',        emoji: '🚢' },
  car_rental:    { label: 'Araç Kiralama',     emoji: '🚗' },
  transfer:      { label: 'Transfer',          emoji: '🚐' },
  ferry:         { label: 'Feribot',           emoji: '⛴️' },
  hajj:          { label: 'Hac & Umre',        emoji: '🕌' },
  visa:          { label: 'Vize',              emoji: '🛂' },
  flight:        { label: 'Uçak Bileti',       emoji: '✈️' },
}

const STATUS_CONFIG = {
  draft:        { label: 'Taslak',          color: 'text-neutral-500', bg: 'bg-neutral-100',  icon: Clock },
  submitted:    { label: 'İncelemede',      color: 'text-blue-600',    bg: 'bg-blue-50',      icon: Clock },
  under_review: { label: 'Değerlendiriliyor', color: 'text-orange-600', bg: 'bg-orange-50',  icon: Clock },
  approved:     { label: 'Onaylandı',       color: 'text-green-600',   bg: 'bg-green-50',    icon: CheckCircle2 },
  rejected:     { label: 'Reddedildi',      color: 'text-red-600',     bg: 'bg-red-50',      icon: XCircle },
}

export default function IlanEkleClient() {
  const router = useRouter()
  const vitrinPath = useVitrinHref()

  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<SupplierApplication[]>([])
  const [approvedCodes, setApprovedCodes] = useState<string[]>([])

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      router.replace(`${vitrinPath('/login')}?redirect=${encodeURIComponent('/ilan-ekle')}`)
      return
    }

    const load = async () => {
      try {
        const [me, appsRes] = await Promise.all([
          getAuthMe(token),
          listMySupplierApplications(token),
        ])

        // Find approved supplier categories from user roles / permissions
        const granted = (me.permissions ?? [])
          .filter((p: string) => p.startsWith('catalog:'))
          .map((p: string) => p.replace('catalog:', ''))
        setApprovedCodes(granted)
        setApplications(appsRes.applications)
      } catch {
        // token expired → login
        router.replace(`${vitrinPath('/login')}?redirect=${encodeURIComponent('/ilan-ekle')}`)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router, vitrinPath])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    )
  }

  // If supplier has at least one approved category, show quick add options
  const approvedApps = applications.filter((a) => a.status === 'approved')
  const pendingApps = applications.filter((a) => a.status !== 'approved')

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">İlan Ekle</h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">
        İlan eklemek için önce tedarikçi olarak onaylanmanız gerekir.
      </p>

      {/* Approved categories → direct add listing */}
      {approvedApps.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
            Onaylı Kategorileriniz
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {approvedApps.map((app) => {
              const cat = CATEGORY_LABELS[app.category_code]
              return (
                <Link
                  key={app.id}
                  href={vitrinPath(`/manage/catalog/${app.category_code}`)}
                  className="group flex items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-4 transition hover:border-green-400 hover:bg-green-100 dark:border-green-900/40 dark:bg-green-900/10 dark:hover:bg-green-900/20"
                >
                  <span className="text-3xl">{cat?.emoji ?? '📋'}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {cat?.label ?? app.category_code}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">Onaylı — İlan ekleyebilirsiniz</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-400 transition group-hover:translate-x-1" />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Pending / rejected applications */}
      {pendingApps.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
            Başvurularınız
          </h2>
          <div className="grid gap-3">
            {pendingApps.map((app) => {
              const cat = CATEGORY_LABELS[app.category_code]
              const sc = STATUS_CONFIG[app.status]
              const Icon = sc.icon
              return (
                <div
                  key={app.id}
                  className={`flex items-center gap-4 rounded-2xl border p-4 ${sc.bg} dark:bg-opacity-10`}
                >
                  <span className="text-3xl">{cat?.emoji ?? '📋'}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {cat?.label ?? app.category_code}
                    </p>
                    <div className={`flex items-center gap-1.5 text-sm ${sc.color}`}>
                      <Icon className="h-4 w-4" />
                      {sc.label}
                    </div>
                    {app.admin_notes && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        Not: {app.admin_notes}
                      </p>
                    )}
                  </div>
                  {(app.status === 'draft' || app.status === 'rejected') && (
                    <Link
                      href={`${vitrinPath('/tedarikci-ol')}?app=${encodeURIComponent(String(app.id))}&cat=${encodeURIComponent(app.category_code)}`}
                      className="rounded-xl bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200"
                    >
                      {app.status === 'rejected' ? 'Tekrar Başvur' : 'Devam Et'}
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* New application CTA */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Yeni Kategori Başvurusu
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(CATEGORY_LABELS)
            .filter(([code]) => !applications.find((a) => a.category_code === code && a.status !== 'rejected'))
            .map(([code, { label, emoji }]) => (
              <Link
                key={code}
                href={`${vitrinPath('/tedarikci-ol')}?cat=${encodeURIComponent(code)}`}
                className="group flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-primary-400 hover:bg-primary-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-primary-900/10"
              >
                <span className="text-2xl">{emoji}</span>
                <span className="flex-1 font-medium text-neutral-700 dark:text-neutral-200 group-hover:text-primary-600">
                  {label}
                </span>
                <PlusCircle className="h-4 w-4 text-neutral-400 group-hover:text-primary-500" />
              </Link>
            ))}
        </div>
      </section>
    </div>
  )
}
