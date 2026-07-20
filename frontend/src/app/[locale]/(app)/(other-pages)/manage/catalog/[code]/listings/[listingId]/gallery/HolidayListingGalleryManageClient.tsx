'use client'

import ListingImagesSection from '../../../../ListingImagesSection'
import { formatManageApiError } from '@/lib/manage-api-error-tr'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import {
  initCatalogManageOrganizationFromMe,
} from '@/lib/catalog-manage-organization'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { getAuthMe, listManageCatalogListings } from '@/lib/travel-api'
import {
  MANAGE_FORM_CONTAINER_CLASS,
  ManageFormPageHeader,
} from '@/components/manage/ManageFormShell'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function HolidayListingGalleryManageClient({
  listingId,
  categoryCode,
}: {
  listingId: string
  categoryCode: string
}) {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()

  const [orgId, setOrgId] = useState('')
  const [needOrg, setNeedOrg] = useState(false)
  const [listingSlug, setListingSlug] = useState('')
  const [slugLoading, setSlugLoading] = useState(true)
  const [slugErr, setSlugErr] = useState<string | null>(null)

  const backHref = vitrinPath(
    `/manage/catalog/${encodeURIComponent(categoryCode)}/listings/${encodeURIComponent(listingId)}`,
  )

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) return
    void getAuthMe(token)
      .then((me) => {
        const perms = Array.isArray(me.permissions) ? me.permissions : []
        const roles = Array.isArray(me.roles) ? me.roles : []
        const admin =
          roles.some((r) => r.role_code === 'admin') ||
          perms.some((p) => p === 'admin.users.read' || p.startsWith('admin.'))
        setNeedOrg(admin)
        if (admin && typeof window !== 'undefined') {
          setOrgId(initCatalogManageOrganizationFromMe(me))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setSlugErr('Oturum bulunamadı.')
      setSlugLoading(false)
      return
    }
    if (needOrg && !orgId.trim()) {
      setSlugLoading(false)
      return
    }
    setSlugLoading(true)
    setSlugErr(null)
    const orgParam = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
    void listManageCatalogListings(token, {
      categoryCode,
      search: listingId,
      organizationId: orgParam?.organizationId,
      titleLocale: locale,
    })
      .then((r) => {
        const row = r.listings.find((x) => x.id === listingId)
        setListingSlug(row?.slug?.trim() ?? '')
      })
      .catch((e) => {
        setSlugErr(e instanceof Error ? formatManageApiError(e.message) : 'İlan bilgisi alınamadı.')
      })
      .finally(() => setSlugLoading(false))
  }, [listingId, locale, needOrg, orgId, categoryCode])

  const orgForSection = needOrg && orgId.trim() ? orgId.trim() : undefined

  return (
    <div className={`${MANAGE_FORM_CONTAINER_CLASS} py-8`}>
      <Link
        href={backHref}
        className="mb-6 text-link-muted inline-flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        İlan formuna dön
      </Link>

      <ManageFormPageHeader
        title="Galeri"
        subtitle={
          categoryCode === 'hotel'
            ? 'Tesis görsellerini yükleyin, sıralayın veya silin. Oda görselleri oda kartlarından yönetilir.'
            : 'Görselleri yükleyin, sıralayın veya silin. Değişiklikler kaydedilir; ana ilan formunda yalnızca önizleme görünür.'
        }
      />

      {slugErr ? <p className="mb-4 text-sm text-red-600 dark:text-red-400">{slugErr}</p> : null}

      {slugLoading ? (
        <div className="flex items-center gap-2 py-12 text-neutral-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          Yükleniyor…
        </div>
      ) : (
        <ListingImagesSection
          listingId={listingId}
          categoryCode={categoryCode}
          listingSlug={listingSlug}
          organizationId={orgForSection}
        />
      )}
    </div>
  )
}
