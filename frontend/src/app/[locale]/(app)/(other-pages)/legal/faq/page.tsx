import FaqPageJsonLd from '@/components/seo/FaqPageJsonLd'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sıkça sorulan sorular',
  description: 'Vize, bagaj, iptal ve ödeme hakkında SSS.',
}

const faq = [
  {
    q: 'Rezervasyonumu nasıl iptal ederim?',
    a: 'Hesabınızdan veya bize ulaşarak iptal talebinde bulunabilirsiniz. Kesinti koşulları ürün sayfasındaki iptal politikasına göre değişir.',
  },
  {
    q: 'Ödeme güvencesi var mı?',
    a: 'Ödemeleriniz güvenli ödeme altyapısı üzerinden alınır. Detaylar için Gizlilik ve Kullanım koşulları sayfalarına bakın.',
  },
  {
    q: 'Vize işlemlerini siz mi yapıyorsunuz?',
    a: 'Vize gereklilikleri resmi makamlara göre değişir; güncel bilgi için konsolosluk kaynaklarını kontrol etmenizi öneririz. Acente hizmet kapsamınızı bu metinde netleştirin.',
  },
]

export default function LegalFaqPage() {
  return (
    <>
      <FaqPageJsonLd items={faq} />
      <div className="container max-w-3xl py-16 lg:py-24">
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">Sıkça sorulan sorular</h1>
        <dl className="mt-10 space-y-8">
          {faq.map((item) => (
            <div key={item.q}>
              <dt className="font-semibold text-neutral-900 dark:text-neutral-100">{item.q}</dt>
              <dd className="mt-2 text-neutral-600 dark:text-neutral-400">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  )
}
