'use client'

import AiFeatureWorkbench from '@/components/manage/AiFeatureWorkbench'
import AiRegionsClient from './AiRegionsClient'

const DEFAULT_JSON = `{
  "hint": "Türkiye için örnek il isimleri ve kısa tanıtım cümlesi üret.",
  "locale": "tr",
  "granularity": "provinces"
}`

export default function AiRegionsPage() {
  return (
    <div className="space-y-8 px-4 py-6 md:px-6 lg:px-8">
      <AiRegionsClient />
      <details className="rounded-xl border border-neutral-200 dark:border-neutral-700">
        <summary className="cursor-pointer px-4 py-3 text-sm text-neutral-500">
          Model talimatı (region_hierarchy) — geliştiriciler / ileri kullanım
        </summary>
        <div className="border-t border-neutral-200 dark:border-neutral-700">
          <AiFeatureWorkbench
            profileCode="region_hierarchy"
            title="Bölge hiyerarşisi — model talimatı"
            subtitle="Yukarıdaki sihirbaz il / ilçe / belde kayıtlarını doğrudan veritabanına yazar. Bu bölüm yalnızca AI profil metnini düzenler; «Kuyruğa gönder» JSON üretir, DB'ye yazmaz."
            defaultInputJson={DEFAULT_JSON}
          />
        </div>
      </details>
    </div>
  )
}
