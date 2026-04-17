'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import Link from 'next/link'

export default function SeoMerchantClient() {
  const vitrinPath = useVitrinHref()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Google Merchant Center</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Google Merchant ürün feed’i genelde <strong>ilan / ürün</strong> verisinin yapılandırılmış (GTIN, fiyat, stok,
          görsel) dışa aktarımı ile oluşturulur. Bu panelde hazır bir Merchant XML üreticisi yok; ilanlarınızı katalogdan
          yönetip feed’i harici araç veya özel entegrasyon ile Merchant’a gönderebilirsiniz.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-5 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300">
        <h2 className="font-semibold text-neutral-900 dark:text-white">Önerilen adımlar</h2>
        <ol className="mt-3 list-inside list-decimal space-y-2">
          <li>
            İlan bilgilerini güncel tutun:{' '}
            <Link href={vitrinPath('/manage/catalog')} className="text-primary-600 underline dark:text-primary-400">
              Katalog
            </Link>
            .
          </li>
          <li>
            Görseller ve fiyatların doğru olduğundan emin olun (Merchant politikaları).
          </li>
          <li>
            Google Merchant Center’da feed kaynağını (XML/CSV) ve hedef ülkeyi tanımlayın.
          </li>
          <li>
            Ticari entegrasyonlar:{' '}
            <Link
              href={vitrinPath('/manage/admin/payments/gateways')}
              className="text-primary-600 underline dark:text-primary-400"
            >
              Ödeme / entegrasyonlar
            </Link>
            .
          </li>
        </ol>
      </div>

      <p className="text-sm text-neutral-500">
        Resmi dokümantasyon:{' '}
        <a
          href="https://support.google.com/merchants/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 underline dark:text-primary-400"
        >
          Google Merchant Center Yardım
        </a>
        .
      </p>
    </div>
  )
}
