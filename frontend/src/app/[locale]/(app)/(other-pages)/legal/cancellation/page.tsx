import CorporatePageShell from '@/components/corporate/CorporatePageShell'
import { COMPANY, companyAddressFull } from '@/lib/corporate/company'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'İptal ve iade',
  description: 'Rezervasyon iptali, değişiklik ve iade koşulları — Rezervasyon Yap.',
}

export default function LegalCancellationPage() {
  return (
    <CorporatePageShell
      title="İptal ve iade"
      subtitle="Ürün tipine göre değişen iptal kurallarının özeti. Kesin koşullar rezervasyon belgenizde yer alır."
      heroSrc="/corporate/fethiye-marina-hero.jpg"
      heroAlt="Fethiye sahil şeridi ve marina"
    >
      <p>
        {COMPANY.brandName} üzerinden yapılan rezervasyonlarda iptal, değişiklik ve iade işlemleri;
        seçtiğiniz ürünün (otel, tatil evi, tur, yat, aktivite vb.) kendi kuralları ile ödeme
        durumuna göre yürütülür. Aşağıdaki metin genel çerçeveyi özetler; çelişki halinde ödeme
        sırasında onayladığınız ürün koşulları geçerlidir.
      </p>

      <h2>1. Genel ilkeler</h2>
      <ul>
        <li>İptal talebinizi mümkün olan en kısa sürede hesabınızdan veya müşteri hizmetlerinden iletin.</li>
        <li>
          Ücretsiz iptal süresi olan ürünlerde bu süre dolmadan yapılan taleplerde kesinti uygulanmaz
          (aksi açıkça belirtilmedikçe).
        </li>
        <li>
          Süre aşıldığında veya “iade edilemez” tarifelerde kesinti / no-show ücreti ürün kartında
          yazılı oranlara göre hesaplanır.
        </li>
        <li>
          Gerçekleşmeyen veya tüketici tarafından bırakılan paket tur hizmetlerinde TÜRSAB tüketici
          değerlendirme uygulamaları dikkate alınır; çizelge hükümleri gerçekleşmiş hizmet
          eksiklikleri için geçerlidir.
        </li>
      </ul>

      <h2>2. Konaklama (otel / tatil evi)</h2>
      <p>
        Check-in tarihine kalan süreye göre kademeli kesintiler uygulanabilir. Erken check-out veya
        kullanılmayan geceler için iade, tesis politikasına bağlıdır. Hasar depozitosu varsa ayrı
        değerlendirilir.
      </p>

      <h2>3. Tur, aktivite ve yat</h2>
      <p>
        Kalkış / başlangıç saatine yakın iptallerde yüksek kesinti veya iade olmaması sık görülen bir
        uygulamadır. Hava muhalefeti veya resmi yasak nedeniyle iptal edilirse alternatif tarih veya
        iade seçenekleri sunulmaya çalışılır.
      </p>

      <h2>4. Ulaşım (uçak, feribot, transfer)</h2>
      <p>
        Bilet sınıfı ve taşıyıcı kuralları belirleyicidir. İsim değişikliği, tarih değişikliği ve
        iptal ücretleri taşıyıcı tarifesine tabidir; platform aracılık bedeli ayrıca kesilebilir.
      </p>

      <h2>5. İade yöntemi ve süre</h2>
      <p>
        Onaylanan iadeler, ödemenin yapıldığı yönteme (kart / EFT) geri yönlendirilir. Banka ve kart
        kuruluşu süreçleri nedeniyle tutarın hesabınıza yansıması birkaç iş günü sürebilir. Muhasebe
        sorularınız için: {COMPANY.phones.accounting.join(', ')}.
      </p>

      <h2>6. Destek</h2>
      <p>
        Rezervasyon departmanı: {COMPANY.phones.reservation.join(' / ')}
        <br />
        Ofis: {COMPANY.phones.office.join(' / ')}
        <br />
        E-posta: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        <br />
        Adres: {companyAddressFull()}
      </p>
    </CorporatePageShell>
  )
}
