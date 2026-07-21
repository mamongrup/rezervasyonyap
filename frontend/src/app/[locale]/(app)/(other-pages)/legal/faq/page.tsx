import CorporatePageShell from '@/components/corporate/CorporatePageShell'
import {
  COMPANY,
  companyAddressFull,
  formatTursabLabel,
  COMPANY_PHONE_PRIMARY,
  COMPANY_PHONE_SECONDARY,
} from '@/lib/corporate/company'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sık sorulan sorular',
  description: `${COMPANY.brandName} — rezervasyon, iptal, ödeme, KVKK ve iletişim SSS.`,
}

type FaqItem = { q: string; a: string }

const FAQ: FaqItem[] = [
  {
    q: 'Rezervasyon Yap nedir?',
    a: `${COMPANY.brandName}; ${COMPANY.legalName} bünyesinde, ${COMPANY.agencyName} markasıyla faaliyet gösteren online rezervasyon platformudur. ${formatTursabLabel()} ile otel, tur, tekne, villa ve transfer ürünlerini tek çatı altında sunarız.`,
  },
  {
    q: 'Şirket bilgileriniz nelerdir?',
    a: `Ticari unvan: ${COMPANY.legalName}. Ofis: ${companyAddressFull()}. ${formatTursabLabel()}. İletişim: ${COMPANY_PHONE_PRIMARY} / ${COMPANY_PHONE_SECONDARY}, ${COMPANY.email}.`,
  },
  {
    q: 'Nasıl rezervasyon yapabilirim?',
    a: 'İlgilendiğiniz ürün sayfasında tarih, kişi sayısı ve seçenekleri belirleyip ödeme adımlarını tamamlayın. Onay sonrası e-posta ile rezervasyon özeti gönderilir. Yardım için ofisimizi arayabilirsiniz.',
  },
  {
    q: 'Hangi ödeme yöntemlerini kabul ediyorsunuz?',
    a: 'Kredi/banka kartı ile güvenli online ödeme ve ürünün izin verdiği durumlarda banka havalesi / EFT kabul edilir. Kart işlemleri SSL ile korunur; kart bilgileriniz saklanmaz.',
  },
  {
    q: 'İptal ve iade nasıl çalışır?',
    a: 'Her ürünün kendi iptal koşulları vardır ve rezervasyon sırasında gösterilir. Genel çerçeve için İptal ve İade sayfamıza bakın. Özel durumlar için müşteri hizmetlerimizle iletişime geçin.',
  },
  {
    q: 'Rezervasyonumu değiştirebilir miyim?',
    a: 'Tarih veya kişi sayısı değişikliği, ürün kurallarına ve müsaitliğe bağlıdır. En kısa sürede bize yazın veya arayın; uygunsa güncelleme yapılır, fark ücreti çıkabilir.',
  },
  {
    q: 'Kişisel verilerim güvende mi?',
    a: 'KVKK kapsamında veri sorumlusu olarak hareket ederiz. Ayrıntılar Gizlilik ve KVKK sayfasındadır. Taleplerinizi aynı sayfada yer alan iletişim kanallarından iletebilirsiniz.',
  },
  {
    q: 'Fethiye dışında da hizmet veriyor musunuz?',
    a: 'Merkez ofisimiz Fethiye’dedir; platform üzerinden Türkiye’nin birçok noktasına otel, tur ve tatil ürünleri sunulur. Ürün sayfasındaki lokasyon bilgisi geçerlidir.',
  },
  {
    q: 'Şikayetimi nereye iletebilirim?',
    a: `Öncelikle ${COMPANY.email} veya telefon hatlarımız üzerinden bize ulaşın. TÜRSAB üyesi acente olarak tüketici hakları çerçevesinde şikayet süreçleri de işletilir.`,
  },
  {
    q: 'Çerezler nedir, kapatabilir miyim?',
    a: 'Zorunlu çerezler site için gereklidir. Analitik ve benzeri tercihler tarayıcı ayarlarından veya çerez bildiriminden yönetilebilir. Detay: Çerez Politikası.',
  },
]

export default function FaqPage() {
  return (
    <CorporatePageShell
      title="Sık sorulan sorular"
      subtitle="Rezervasyon, ödeme, iptal ve iletişim hakkında en sık sorulan soruların yanıtları."
      heroSrc="/corporate/travel-desk-hero.jpg"
      heroAlt="Seyahat danışmanlığı ve rezervasyon"
    >
      <div className="not-prose divide-y divide-neutral-200 dark:divide-neutral-800">
        {FAQ.map((item) => (
          <details key={item.q} className="group py-5">
            <summary className="cursor-pointer list-none font-semibold text-neutral-900 dark:text-neutral-100 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-start justify-between gap-4">
                {item.q}
                <span className="mt-0.5 shrink-0 text-neutral-400 transition group-open:rotate-45" aria-hidden>
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-base">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </CorporatePageShell>
  )
}
