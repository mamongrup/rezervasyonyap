import CorporatePageShell from '@/components/corporate/CorporatePageShell'
import { COMPANY } from '@/lib/corporate/company'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Çerez politikası',
  description: 'Rezervasyon Yap çerez türleri, amaçları ve tercih yönetimi.',
}

export default function LegalCookiesPage() {
  return (
    <CorporatePageShell
      title="Çerez politikası"
      subtitle="Sitemizde hangi çerezlerin neden kullanıldığını ve nasıl yönetebileceğinizi açıklıyoruz."
      heroSrc="/corporate/travel-desk-hero.jpg"
      heroAlt="Dijital seyahat planlama ortamı"
    >
      <p>
        {COMPANY.brandName} ({COMPANY.siteUrl}), site deneyimini iyileştirmek, güvenliği sağlamak ve
        (izin verdiğiniz ölçüde) performansı ölçmek için çerez ve benzeri teknolojiler kullanır.
      </p>

      <h2>1. Çerez nedir?</h2>
      <p>
        Çerez; tarayıcınızda saklanan küçük bir metin dosyasıdır. Oturum çerezleri tarayıcı
        kapanınca silinir; kalıcı çerezler belirlenen süre boyunca cihazınızda kalabilir.
      </p>

      <h2>2. Kullandığımız türler</h2>
      <ul>
        <li>
          <strong>Zorunlu çerezler:</strong> oturum, güvenlik, dil / para birimi tercihi, sepet ve
          ödeme adımlarının çalışması için gereklidir.
        </li>
        <li>
          <strong>İşlevsel çerezler:</strong> arama filtreleri, son görüntülenen ilanlar gibi
          kolaylıklar.
        </li>
        <li>
          <strong>Analitik çerezler:</strong> sayfa trafiği ve hata oranlarını anonim / toplu
          istatistiklerle anlamamıza yardımcı olur (açık rıza veya meşru menfaat çerçevesinde).
        </li>
        <li>
          <strong>Pazarlama çerezleri:</strong> yalnızca onayınız varsa; kampanya ölçümü ve
          yeniden pazarlama için üçüncü taraflarca yerleştirilebilir.
        </li>
      </ul>

      <h2>3. Üçüncü taraflar</h2>
      <p>
        Ödeme, harita, analitik veya reklam ortakları kendi çerezlerini kullanabilir. Bu
        sağlayıcıların politikaları ilgili şirketlere aittir; {COMPANY.brandName} yalnızca
        hizmetin gerektirdiği entegrasyonu sağlar.
      </p>

      <h2>4. Tercihlerinizi yönetme</h2>
      <p>
        Tarayıcı ayarlarından çerezleri silebilir veya engelleyebilirsiniz. Sitede çerez
        bildirimi gösteriliyorsa tercihlerinizi oradan da güncelleyebilirsiniz. Zorunlu
        çerezler olmadan bazı işlevler çalışmayabilir.
      </p>

      <h2>5. Daha fazla bilgi</h2>
      <p>
        Kişisel veri işleme hakkında ayrıntı için <a href="/legal/privacy">Gizlilik ve KVKK</a>{' '}
        sayfasına bakın. Sorularınız: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
      </p>
    </CorporatePageShell>
  )
}
