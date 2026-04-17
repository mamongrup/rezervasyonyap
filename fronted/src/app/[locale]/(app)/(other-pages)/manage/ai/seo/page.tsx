'use client'

import AiFeatureWorkbench from '@/components/manage/AiFeatureWorkbench'

const DEFAULT_JSON = `{
  "page_title": "Örnek ürün sayfası",
  "body_excerpt": "Kısa tanıtım metni burada yer alır.",
  "locale": "tr",
  "max_title_len": 60,
  "max_desc_len": 155
}`

export default function AiSeoPage() {
  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <AiFeatureWorkbench
        profileCode="seo_writer"
        title="SEO oluşturucu"
        subtitle="Meta başlık ve açıklama üretimi için sistem talimatını kaydedin; komut ile sayfa bağlamını JSON olarak iletin."
        defaultInputJson={DEFAULT_JSON}
      />
    </div>
  )
}
