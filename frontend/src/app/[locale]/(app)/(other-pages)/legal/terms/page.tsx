import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kullanım koşulları',
  description: 'Web sitesi ve hizmet kullanım şartları.',
}

export default function LegalTermsPage() {
  return (
    <div className="container max-w-3xl py-16 lg:py-24">
      <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">Kullanım koşulları</h1>
      <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
        <p>
          Bu sayfa yer tutucudur. Şirket unvanı, hizmet kapsamı, yasaklı kullanımlar ve sorumluluk sınırları gibi maddeleri
          hukuk danışmanınızla netleştirip burada yayınlayın.
        </p>
        <p>Rezervasyon ve ödeme koşulları, tedarikçi sözleşmelerinizle uyumlu olmalıdır.</p>
      </div>
    </div>
  )
}
