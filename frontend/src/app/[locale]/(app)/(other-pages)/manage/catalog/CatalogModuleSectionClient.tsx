'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { categoryLabelTr } from '@/lib/catalog-category-ui'
import Link from 'next/link'

export type CatalogModuleSection = 'seo' | 'availability' | 'recovery' | 'room-features'

export default function CatalogModuleSectionClient({
  categoryCode,
  section,
}: {
  categoryCode: string
  section: CatalogModuleSection
}) {
  const vitrinPath = useVitrinHref()
  const base = vitrinPath(`/manage/catalog/${encodeURIComponent(categoryCode)}`)
  const adminSeo = vitrinPath('/manage/admin/content/seo-redirects')
  const label = categoryLabelTr(categoryCode)

  const titles: Record<CatalogModuleSection, string> = {
    seo: 'SEO & açılış sayfaları',
    availability: 'Kullanılabilirlik',
    recovery: 'Kurtarma (çöp kutusu)',
    'room-features': 'Oda öznitelikleri',
  }

  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">Katalog</p>
      <h1 className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{titles[section]}</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{label}</p>

      {section === 'seo' ? (
        <div className="mt-6 space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
          <p>
            <span className="font-medium text-neutral-900 dark:text-white">{label}</span> için SEO yönlendirmeleri,
            site haritası ve 404 günlüğü platform genelinde yönetilir.
          </p>
          <p>
            <Link href={adminSeo} className="font-medium text-primary-600 underline dark:text-primary-400">
              Yönetici → SEO yönlendirme &amp; günlük
            </Link>
          </p>
          <p className="text-xs text-neutral-500">
            İlan bazlı çok dilli meta ve slug çalışması: ilan satırından{' '}
            <Link href={`${base}/listings`} className="text-primary-600 underline dark:text-primary-400">
              çeviriler
            </Link>
            .
          </p>
        </div>
      ) : null}

      {section === 'availability' ? (
        <div className="mt-6 space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
          <p>
            Müsaitlik ve takvim{' '}
            <strong className="font-medium text-neutral-900 dark:text-white">ilan bazında</strong> tutulur; kategori ve
            vertical’a göre takvim alanları ilan detayından yönetilir.
          </p>
          {categoryCode === 'hotel' ? (
            <p>
              Otel ilanları için günlük doluluk / fiyat override:{' '}
              <Link href={`${base}/listings`} className="font-medium text-primary-600 underline dark:text-primary-400">
                Tüm ilanlar
              </Link>{' '}
              → <strong className="font-medium">Detay (Aç)</strong> → takvim ve dönemsel fiyat kuralları.
            </p>
          ) : (
            <p>
              Bu kategori (<span className="font-medium">{label}</span>) için takvim mantığı ilgili vertical tablolarına
              göre değişir; ilan listesinden her kayıt için düzenleme yapın:{' '}
              <Link href={`${base}/listings`} className="font-medium text-primary-600 underline dark:text-primary-400">
                İlanlar
              </Link>
              .
            </p>
          )}
        </div>
      ) : null}

      {section === 'recovery' ? (
        <div className="mt-6 space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
          <p>
            Silinen kayıtları geri yükleme (çöp kutusu) için ayrı bir API bu sürümde yok.
          </p>
          <p className="text-xs text-neutral-500">
            İlan durumu <span className="font-mono">draft / published / archived</span> ile yönetilir; kalıcı silme ve
            geri alma backend iş paketi olarak eklenebilir.
          </p>
        </div>
      ) : null}

      {section === 'room-features' ? (
        <div className="mt-6 space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
          {categoryCode === 'hotel' ? (
            <>
              <p>
                Oda tipleri ve oda bazlı özellikler <span className="font-mono">hotel_rooms</span> tablosunda; öznitelik
                sözlüğü için <span className="font-mono">meta_json</span> alanını kullanın (ör. manzara, kat, yatak
                sayısı).
              </p>
              <p>
                <Link href={`${base}/listings`} className="font-medium text-primary-600 underline dark:text-primary-400">
                  İlanlar
                </Link>{' '}
                → <strong className="font-medium">Detay (Aç)</strong> → Odalar bölümünden oda ekleyip düzenleyin.
              </p>
            </>
          ) : (
            <p>
              &quot;Oda öznitelikleri&quot; yalnızca <strong className="font-medium">otel</strong> kategorisi için
              anlamlıdır. Diğer kategorilerde özellikler{' '}
              <Link href={`${base}/attributes`} className="text-primary-600 underline dark:text-primary-400">
                kategori öznitelikleri
              </Link>{' '}
              ve ilan düzeyindeki alanlarla yönetilir.
            </p>
          )}
        </div>
      ) : null}

      <p className="mt-10 text-sm">
        <Link href={base} className="text-primary-600 underline dark:text-primary-400">
          ← Kategori özeti
        </Link>
      </p>
    </div>
  )
}
