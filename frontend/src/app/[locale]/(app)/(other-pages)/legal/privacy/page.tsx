import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gizlilik ve KVKK',
  description: 'Kişisel verilerin işlenmesi ve çerez politikası.',
}

export default function LegalPrivacyPage() {
  return (
    <div className="container max-w-3xl py-16 lg:py-24">
      <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">Gizlilik ve KVKK</h1>
      <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
        <p>
          Bu sayfa yer tutucudur. Veri sorumlusu bilgileri, işleme amaçları, saklama süreleri, çerez türleri ve kullanıcı
          hakları (KVKK md. 11) metinlerinizi ekleyin.
        </p>
      </div>
    </div>
  )
}
