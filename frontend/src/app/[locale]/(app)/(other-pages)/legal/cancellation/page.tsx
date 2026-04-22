import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'İptal ve iade',
  description: 'Rezervasyon iptali, iade ve değişiklik koşulları.',
}

export default function LegalCancellationPage() {
  return (
    <div className="container max-w-3xl py-16 lg:py-24">
      <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">İptal ve iade</h1>
      <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
        <p>
          Bu sayfa yer tutucudur. Tur / otel / uçak ürün tipine göre iptal süreleri, ceza kesintileri, force majeure ve
          iade kanallarını şeffaf biçimde listeleyin; checkout akışında da aynı özeti gösterin.
        </p>
      </div>
    </div>
  )
}
