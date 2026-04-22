'use client'

import AiFeatureWorkbench from '@/components/manage/AiFeatureWorkbench'

const DEFAULT_JSON = `{
  "task": "blog_draft",
  "topic": "Kapadokya balon ve vadiler",
  "tone": "samimi",
  "locale": "tr"
}`

export default function AiContentPage() {
  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <AiFeatureWorkbench
        profileCode="content_writer"
        title="İçerik oluşturucu"
        subtitle="Blog, CMS sayfası ve ilan metinleri için talimatı burada güncelleyin; komut JSON’u ile tek seferlik üretim kuyruğa alınır."
        defaultInputJson={DEFAULT_JSON}
        inputHelp="task: örn. blog_draft, listing_description — backend worker hangi alanları beklediğine göre değişebilir."
      />
    </div>
  )
}
