'use client'

import AiFeatureWorkbench from '@/components/manage/AiFeatureWorkbench'

const DEFAULT_JSON = `{
  "user_message": "Merhaba, 2 yetişkin için hafta sonu otel arıyorum.",
  "session_id": "demo-admin-session",
  "locale": "tr"
}`

export default function AiChatbotPage() {
  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <AiFeatureWorkbench
        profileCode="chat_sales"
        title="Satış sohbeti (chatbot)"
        subtitle="Sohbet tonu, ürün önerisi kuralları ve kaçınılacak ifadeler için sistem talimatını kaydedin; örnek kullanıcı mesajı ile iş oluşturun."
        defaultInputJson={DEFAULT_JSON}
      />
    </div>
  )
}
