'use client'

import AiFeatureWorkbench from '@/components/manage/AiFeatureWorkbench'

const DEFAULT_JSON = `{
  "source_text": "Rezervasyonunuz onaylandı. İyi yolculuklar!",
  "source_locale": "tr",
  "target_locale": "en",
  "glossary": {
    "rezervasyon": "reservation"
  }
}`

export default function AiTranslatePage() {
  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <AiFeatureWorkbench
        profileCode="translator"
        title="Çeviri asistanı"
        subtitle="Çok dilli içerik için model talimatını (üslup, yasaklı kelimeler) burada tutun; metinleri JSON ile gönderin."
        defaultInputJson={DEFAULT_JSON}
      />
    </div>
  )
}
