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
    <div className="space-y-12 px-4 py-6 md:px-6 lg:px-8">
      <AiFeatureWorkbench
        profileCode="region_hierarchy"
        title="Bölge hiyerarşisi — model talimatı"
        subtitle="İl / ilçe üretim görevleri ayrıca aşağıdaki sihirbazdan tetiklenir. Bu bölümdeki talimat, region_hierarchy profiline bağlı genel AI işlerine uygulanır."
        defaultInputJson={DEFAULT_JSON}
      />
      <AiRegionsClient />
    </div>
  )
}
