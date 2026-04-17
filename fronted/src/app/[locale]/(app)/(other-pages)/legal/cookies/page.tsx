import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Çerez politikası',
  description: 'Çerez türleri, saklama süreleri ve tercih yönetimi.',
}

export default function LegalCookiesPage() {
  return (
    <div className="container max-w-3xl py-16 lg:py-24">
      <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">Çerez politikası</h1>
      <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
        <p>
          Bu sayfa yer tutucudur. Zorunlu, işlevsel, analitik ve pazarlama çerezleri; saklama süreleri ve üçüncü taraflar
          hakkında metinlerinizi yönetim panelinden veya hukuk ekibinizle tamamlayın.
        </p>
      </div>
    </div>
  )
}
