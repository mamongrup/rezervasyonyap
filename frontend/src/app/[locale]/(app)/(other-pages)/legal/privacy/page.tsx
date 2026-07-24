import CorporatePageShell from '@/components/corporate/CorporatePageShell'
import { COMPANY, companyAddressFull } from '@/lib/corporate/company'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gizlilik ve KVKK',
  description:
    'Rezervasyon Yap kişisel verilerin korunması, KVKK aydınlatma metni ve gizlilik politikası.',
}

export default function LegalPrivacyPage() {
  return (
    <CorporatePageShell
      title="Gizlilik ve KVKK"
      subtitle="Kişisel verilerinizin nasıl toplandığı, işlendiği ve korunduğu hakkında şeffaf bilgilendirme."
      heroSrc="/corporate/travel-desk-hero.jpg"
      heroAlt="Seyahat belgelerinin bulunduğu düzenli bir çalışma masası"
    >
      <p>
        {COMPANY.brandName} ({COMPANY.siteUrl}) üzerinden sunulan hizmetlerde kişisel verilerinizin
        güvenliği önceliğimizdir. Bu metin; 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve
        ilgili mevzuat kapsamında veri sorumlusu sıfatıyla yürüttüğümüz işleme faaliyetlerini açıklar.
      </p>

      <h2>1. Veri sorumlusu</h2>
      <p>
        <strong>{COMPANY.legalName}</strong>
        <br />
        Ticari unvan / acente: {COMPANY.agencyName} — TÜRSAB {COMPANY.tursabClass} No: {COMPANY.tursabNo}
        <br />
        Adres: {companyAddressFull()}
        <br />
        E-posta: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        <br />
        Telefon: {COMPANY.phones.reservation.join(' / ')}
      </p>

      <h2>2. İşlenen kişisel veriler</h2>
      <p>Hizmetin niteliğine göre aşağıdaki kategoriler işlenebilir:</p>
      <ul>
        <li>
          <strong>Kimlik ve iletişim:</strong> ad-soyad, T.C. kimlik / pasaport bilgisi (yasal zorunluluk
          halinde), e-posta, telefon, adres
        </li>
        <li>
          <strong>Rezervasyon ve işlem:</strong> seçilen ürün, tarih, misafir sayısı, ödeme durumu,
          fatura bilgileri
        </li>
        <li>
          <strong>Teknik veriler:</strong> IP adresi, tarayıcı / cihaz bilgisi, oturum kayıtları, çerez
          tanımlayıcıları (istatistik ve güvenlik amaçlı)
        </li>
        <li>
          <strong>İletişim kayıtları:</strong> destek talepleri, e-posta ve form içerikleri
        </li>
      </ul>

      <h2>3. İşleme amaçları ve hukuki sebepler</h2>
      <ul>
        <li>Rezervasyonun oluşturulması, ifası ve faturalandırılması (sözleşmenin kurulması / ifası)</li>
        <li>Yasal yükümlülüklerin yerine getirilmesi (vergi, turizm ve e-ticaret mevzuatı)</li>
        <li>Müşteri destek süreçlerinin yürütülmesi ve şikayetlerin yanıtlanması</li>
        <li>Site güvenliği, dolandırıcılık önleme ve performans analizi</li>
        <li>Açık rızanız olması halinde kampanya ve bilgilendirme iletişimleri</li>
      </ul>

      <h2>4. Aktarım</h2>
      <p>
        Verileriniz; konaklama, ulaşım veya tur sağlayıcıları, ödeme kuruluşları, barındırma ve e-posta
        hizmeti sunan iş ortakları ile yalnızca hizmetin gerektirdiği ölçüde paylaşılabilir. Yurt dışına
        aktarım söz konusu olduğunda KVKK’nın öngördüğü güvenceler aranır.
      </p>

      <h2>5. Saklama süresi</h2>
      <p>
        Veriler, ilgili mevzuattaki zamanaşımı ve saklama yükümlülükleri ile işlemenin amacı ortadan
        kalkana kadar tutulur; süre sonunda silinir, yok edilir veya anonim hale getirilir.
      </p>

      <h2>6. Haklarınız (KVKK md. 11)</h2>
      <p>Veri sahibi olarak; işlenip işlenmediğini öğrenme, düzeltme, silme, itiraz ve şikayet haklarına
        sahipsiniz. Başvurularınızı <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> adresine
        iletebilirsiniz. Gerekirse Kişisel Verileri Koruma Kurulu’na şikayette bulunabilirsiniz.
      </p>

      <h2>7. Çerezler ve log kayıtları</h2>
      <p>
        Site, standart web sunucu logları ve çerezler aracılığıyla teknik veriler toplayabilir. Ayrıntılar
        için <a href="/legal/cookies">Çerez Politikası</a> sayfasını inceleyiniz. Tarayıcı ayarlarınızdan
        çerezleri sınırlandırabilirsiniz; bazı zorunlu çerezler olmadan site düzgün çalışmayabilir.
      </p>

      <h2>8. Üçüncü taraf bağlantılar</h2>
      <p>
        Platformda yer alan dış bağlantıların gizlilik uygulamalarından {COMPANY.brandName} sorumlu
        değildir. İlgili sitelerin politikalarını ayrıca okumanızı öneririz.
      </p>

      <h2>9. İletişim</h2>
      <p>
        Gizlilik ve KVKK başvuruları: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> ·{' '}
        {companyAddressFull()}
      </p>
    </CorporatePageShell>
  )
}
