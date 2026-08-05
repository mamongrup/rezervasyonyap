import CorporatePageShell from '@/components/corporate/CorporatePageShell'
import { COMPANY, companyAddressFull } from '@/lib/corporate/company'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kullanım koşulları',
  description: 'Rezervasyon Yap web sitesi ve rezervasyon hizmetleri kullanım şartları.',
}

export default function LegalTermsPage() {
  return (
    <CorporatePageShell
      title="Kullanım koşulları"
      subtitle="Platformu kullanarak aşağıdaki şartları kabul etmiş sayılırsınız."
      heroSrc="/corporate/travel-desk-hero.jpg"
      heroAlt="Seyahat planlama masası"
    >
      <p>
        Bu koşullar; {COMPANY.legalName} ({COMPANY.agencyName}, TÜRSAB {COMPANY.tursabClass} No:{' '}
        {COMPANY.tursabNo}) tarafından işletilen {COMPANY.brandName} platformunun ({COMPANY.siteUrl})
        kullanımını düzenler.
      </p>

      <h2>1. Hizmetin kapsamı</h2>
      <p>
        Platform; otel, tatil evi, yat, tur, aktivite, araç kiralama, transfer, feribot, uçak bileti ve
        benzeri seyahat ürünlerinin tanıtımı, fiyatlandırılması ve rezervasyon süreçlerinin
        dijitalleştirilmesini sağlar. Bazı ürünler {COMPANY.agencyName} tarafından, bazıları ise
        bağımsız tedarikçiler adına sunulur; ürün kartında belirtilen koşullar esas alınır.
      </p>

      <h2>2. Üyelik ve hesap güvenliği</h2>
      <ul>
        <li>Doğru ve güncel bilgi vermek kullanıcının sorumluluğundadır.</li>
        <li>Hesap bilgilerinizin gizliliğini korumak size aittir; yetkisiz erişimi derhal bildirin.</li>
        <li>Platformu yasalara aykırı, yanıltıcı veya zarar verici biçimde kullanmak yasaktır.</li>
      </ul>

      <h2>3. Rezervasyon ve ödeme</h2>
      <p>
        Rezervasyon, ödeme onayı ve tedarikçi müsaitliği ile kesinleşir. Fiyatlar, vergiler ve ek
        ücretler ödeme öncesi ekranda gösterilir. Kredi kartı ile taksit / parçalı ödeme imkânları ile
        EFT-havale seçenekleri kampanya ve banka koşullarına göre değişkenlik gösterebilir.
      </p>

      <h2>4. İptal, değişiklik ve iade</h2>
      <p>
        İptal ve iade kuralları ürün tipine ve tedarikçi politikasına göre değişir. Genel çerçeve için{' '}
        <a href="/legal/cancellation">İptal ve İade</a> sayfasına bakınız. Paket tur ve konaklama
        uyuşmazlıklarında TÜRSAB uygulamaları ve ilgili mevzuat dikkate alınır.
      </p>

      <h2>5. İçerik ve fikri mülkiyet</h2>
      <p>
        Site tasarımı, metinler, logolar ve yazılım {COMPANY.legalName} veya lisans verenlerine aittir.
        İzinsiz kopyalama, scrap etme veya ticari yeniden yayın yasaktır. Tedarikçi tarafından
        sağlanan görseller ve açıklamalar ilgili sağlayıcının sorumluluğundadır; editoryal
        düzenlemeler platform standartlarına göre yapılabilir.
      </p>

      <h2>6. Sorumluluk sınırı</h2>
      <p>
        Platform, üçüncü taraf hizmet sağlayıcıların ifa kusurlarından kaynaklanan doğrudan
        zararlarda aracılık rolüyle sınırlı sorumluluk taşır. Zorunlu hallerde yasal tüketici
        haklarınız saklıdır. Mücbir sebep (doğal afet, grev, resmi yasak vb.) durumunda ifa
        gecikmeleri için makul bilgilendirme yapılır.
      </p>

      <h2>7. Uygulanacak hukuk</h2>
      <p>
        Uyuşmazlıklarda Türkiye Cumhuriyeti hukuku uygulanır; yetkili merciler Fethiye / Muğla
        mahkemeleri ve icra daireleri ile Tüketici Hakem Heyetleri’dir (tüketici işlemlerinde).
      </p>

      <h2>8. İletişim</h2>
      <p>
        {companyAddressFull()}
        <br />
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> · {COMPANY.phones.reservation.join(' / ')}
      </p>
    </CorporatePageShell>
  )
}
