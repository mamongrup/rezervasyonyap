import CorporatePageShell from '@/components/corporate/CorporatePageShell'
import { COMPANY, companyAddressFull } from '@/lib/corporate/company'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'İptal ve iade şartları',
  description:
    'Otel, tur, yat, villa ve ulaşım rezervasyonlarında iptal, değişiklik, no-show ve iade koşulları — Rezervasyon Yap.',
}

export default function LegalCancellationPage() {
  return (
    <CorporatePageShell
      title="İptal ve iade şartları"
      subtitle="Ürün tipine göre uygulanan iptal, değişiklik ve iade kurallarının genel çerçevesi. Kesin koşullar rezervasyon belgenizde yer alır."
      heroSrc="/corporate/fethiye-marina-hero.jpg"
      heroAlt="Fethiye sahil şeridi ve marina"
    >
      <p>
        {COMPANY.brandName} ({COMPANY.agencyName}, TÜRSAB {COMPANY.tursabClass} No:{' '}
        {COMPANY.tursabNo}) üzerinden yapılan rezervasyonlarda iptal, değişiklik ve iade işlemleri;
        seçtiğiniz ürünün niteliğine, ödeme durumuna ve rezervasyon sırasında onayladığınız koşullara
        göre yürütülür.
      </p>
      <p>
        Aşağıdaki metin genel çerçeveyi açıklar. Ürün kartında, ödeme adımında veya rezervasyon
        onayında <strong>daha özel bir iptal politikası</strong> gösterilmişse o politika esas alınır.
        Çelişki halinde özel koşullar geçerlidir. Paket tur niteliğindeki ürünlerde 6502 sayılı Kanun
        ve Paket Tur Sözleşmeleri Yönetmeliği hükümleri saklıdır.
      </p>

      <h2>1. İptal talebi nasıl iletilir?</h2>
      <ul>
        <li>
          Talebinizi hesabınızdaki rezervasyon ekranından, e-posta ile (
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>) veya telefon hatlarımızdan yazılı /
          kayıt altına alınabilir şekilde iletin.
        </li>
        <li>
          İptalin geçerli sayıldığı an; talebin tarafımıza ulaştığı ve rezervasyon kaydına işlendiği
          andır. Mesai dışı iletilen talepler ilk iş gününde işleme alınır; süre hesabında bu kayıt
          saati esas alınır.
        </li>
        <li>
          Rezervasyon numarası, ad-soyad ve mümkünse ödeme dekontunu talebinize eklemeniz süreci
          hızlandırır.
        </li>
      </ul>

      <h2>2. Paket turlar (yurt içi / yurt dışı)</h2>
      <p>
        Ulaşım, konaklama, gezi, transfer veya benzeri hizmetlerden en az ikisini tek bedelle sunan
        ürünler paket tur sayılır. Yönetmelik çerçevesinde:
      </p>
      <ul>
        <li>
          <strong>Başlangıca en az 30 gün kala</strong> yapılan fesihte; zorunlu vergi, harç ve benzeri
          yasal masraflar hariç ödenen bedel kesintisiz iade edilir.
        </li>
        <li>
          <strong>30 günden az süre kala</strong> yapılan fesihlerde sözleşmede / ürün kartında yazılı
          kademeli kesinti uygulanabilir. Üründe oran belirtilmemişse aşağıdaki örnek çerçeve
          kullanılır (sektörde yaygın uygulama):
          <ul>
            <li>29–21 gün kala: bedelin %25’i kesilir</li>
            <li>20–8 gün kala: bedelin %50’si kesilir</li>
            <li>7 gün ve daha az / kalkış günü: bedelin tamamı kesilebilir</li>
          </ul>
        </li>
        <li>
          <strong>Mücbir sebep / belgelenmiş engel:</strong> Katılımcının veya birinci derece
          yakınlarının, 10 günlük mutat iştigaline engel ciddi rahatsızlığı veya vefatı; tam teşekküllü
          devlet hastanesinden alınmış resmi rapor / belgelerle kanıtlanırsa, 30 günden az kala bile
          — zorunlu yasal masraflar ile üçüncü kişilere ödenip belgelendirilebilen ve iadesi mümkün
          olmayan tutarlar hariç — kesintisiz iade talep edilebilir.
        </li>
        <li>
          <strong>Acente kaynaklı iptal veya esaslı değişiklik</strong> (tarih, kategori, programın
          temel unsurları vb.): Alternatif turu kabul etmeme hakkınız vardır; sözleşmeden dönmeniz
          halinde ödenen bedel en geç 14 gün içinde kesintisiz iade edilir.
        </li>
        <li>
          Yurt dışı turlarda vize, pasaport ve seyahat sağlık işlemleri katılımcı sorumluluğundadır.
          Vize reddi tek başına mücbir sebep sayılmaz; kesinti oranları sözleşmeye göre uygulanabilir.
          Acente turun tamamını iptal ederse vize harcı iadesi konsolosluk / aracı kuruma bağlıdır.
        </li>
      </ul>

      <h2>3. Konaklama (otel)</h2>
      <p>
        Otel rezervasyonlarında iptal politikası ürün kartında “ücretsiz iptal”, “kısmi iade” veya
        “iade edilmez” olarak belirtilir. Kartta özel oran yoksa ve mücbir sebep belgelenmemişse,
        check-in tarihine göre aşağıdaki varsayılan çerçeve uygulanır:
      </p>
      <ul>
        <li>
          <strong>Girişe 15 günden fazla kala:</strong> ödenen konaklama bedelinin tamamı iade edilir
          (aksi yazılı değilse)
        </li>
        <li>
          <strong>15 günden az – 7 gün (dahil) kala:</strong> bedelin yaklaşık %65’i iade edilir
          (%35 kesinti)
        </li>
        <li>
          <strong>7 günden az – 3 gün (dahil) kala:</strong> bedelin yaklaşık %50’si iade edilir
        </li>
        <li>
          <strong>Son 3 gün, check-in günü veya no-show:</strong> iade yapılmaz; bedel cayma /
          no-show ücreti olarak değerlendirilir
        </li>
      </ul>
      <p>
        Erken rezervasyon, kampanya veya “iade edilmez” tarifelerde genellikle rezervasyon anından
        itibaren iade yoktur; bu durum ödeme öncesinde açıkça gösterilir. Erken check-out veya
        kullanılmayan geceler için iade, tesis politikasına bağlıdır. Hasar depozitosu varsa ayrı
        hesaplanır.
      </p>
      <p>
        Standart giriş/çıkış saatleri (aksi belirtilmedikçe) genelde check-in 14:00 sonrası,
        check-out 12:00 öncesidir. Erken giriş / geç çıkış müsaitliğe ve ek ücrete tabidir.
      </p>

      <h2>4. Tatil evi / villa</h2>
      <ul>
        <li>
          Villa ve tatil evi iptalleri, ilan sahibinin belirlediği kurallara göre işler; çoğu üründe
          check-in’e yaklaştıkça kesinti artar veya depozito yanar.
        </li>
        <li>
          Güvence / hasar depozitosu, konaklama bedelinden ayrı tutulur; hasarsız çıkışta iade
          süresi ürün koşullarında yazılır.
        </li>
        <li>
          Temizlik, havuz bakımı veya minimum konaklama gecesi şartları iade hesabını etkileyebilir.
        </li>
      </ul>

      <h2>5. Tur, aktivite, günübirlik gezi ve yat</h2>
      <ul>
        <li>
          Kalkış / başlangıç saatine yakın iptallerde yüksek kesinti veya iade olmaması yaygındır.
          Ürün kartında saatlik/günlük eşikler varsa onlar uygulanır.
        </li>
        <li>
          Minimum katılımcı şartı olan turlarda yeterli kayıt oluşmazsa acente turu iptal edebilir;
          bu durumda ödenen bedel (belirtilen vize vb. hariç) 14 gün içinde iade edilir; ayrıca
          tazminat doğmaz.
        </li>
        <li>
          Hava muhalefeti, resmi yasak veya liman/marina otoritesi kararıyla iptalde alternatif tarih
          veya iade seçenekleri sunulmaya çalışılır.
        </li>
        <li>
          Yat / mavi yolculukta yakıt, liman, mürettebat ve özel rota koşulları ayrı kesinti
          kalemleri oluşturabilir; sözleşme ekindeki şartlar geçerlidir.
        </li>
      </ul>

      <h2>6. Ulaşım (uçak, feribot, transfer, araç kiralama)</h2>
      <ul>
        <li>
          Bilet sınıfı ve taşıyıcı / kiralama şirketinin kuralları belirleyicidir. İsim değişikliği,
          tarih değişikliği ve iptal ücretleri taşıyıcı tarifesine tabidir.
        </li>
        <li>
          Charter ve tarifeli uçuşlarda hareket saatleri değişebilir; kalkıştan 24 saat önce teyit
          edilmesi önerilir. Taşıyıcı kaynaklı rötar ve saat değişikliklerinden platformun
          sorumluluğu, aracılık sınırları içinde değerlendirilir.
        </li>
        <li>Transfer ve araç kiralamada no-show durumunda genelde iade yapılmaz.</li>
      </ul>

      <h2>7. Değişiklik ve devir</h2>
      <ul>
        <li>
          Tarih, tesis veya kişi sayısı değişikliği müsaitliğe bağlıdır; yeni tarihte fiyat farkı
          çıkabilir. Değişiklik ücreti ürün koşullarında belirtilmişse ayrıca tahsil edilir.
        </li>
        <li>
          Konaklama veya tur rezervasyonunun üçüncü kişiye devri, ürünün izin verdiği süre içinde ve
          yazılı bildirimle mümkündür. Devir alan ile devreden, bakiye ve doğan masraflardan
          birlikte sorumlu olabilir.
        </li>
      </ul>

      <h2>8. No-show</h2>
      <p>
        Rezervasyon iptal edilmeden hizmet başlangıcında hazır bulunulmaması (otele giriş yapılmaması,
        tura katılınmaması, transfer noktasında olunmaması) no-show sayılır. Bu durumda ürün
        koşullarına göre ilk gece bedeli veya toplam bedelin tamamı kesilebilir; iade yapılmaz.
      </p>

      <h2>9. Hizmet eksikliği (gerçekleşmiş seyahat)</h2>
      <p>
        Seyahat gerçekleştikten sonra taahhüt edilen veya örfen beklenen hizmetin eksik / ayıplı
        sunulduğuna ilişkin bedel iade taleplerinde, TÜRSAB Turizm Tüketicileri Talepleri
        Değerlendirme Çizelgesi (kamuoyunda “Kütahya Çizelgesi” olarak da anılır) sektörel değerlendirme
        kaynağı olarak dikkate alınır.
      </p>
      <ul>
        <li>
          Çizelge; gerçekleşmeyen, katılınmayan veya tüketici tarafından iptal edilen hizmetlere
          ilişkin taleplerde kullanılmaz.
        </li>
        <li>
          Eksiklik / ayıp iddiasının seyahat sırasında acente veya tesis görevlisine
          bildirilmemesi halinde iade miktarı çizelge esaslarına göre azaltılabilir.
        </li>
        <li>
          Seyahatin hiç gerçekleşmemesi, esaslı unsurlarından yoksun kalması veya acente tarafından
          iptali gibi durumlarda maddi/manevi tazminat talepleri çizelge dışında, ilgili mevzuata
          göre değerlendirilir.
        </li>
      </ul>

      <h2>10. İade yöntemi ve süre</h2>
      <ul>
        <li>
          Onaylanan iadeler, ödemenin yapıldığı yönteme (kredi/banka kartı veya EFT/havale) geri
          yönlendirilir.
        </li>
        <li>
          Paket turda yönetmelik uyarınca kesintisiz iade gereken hallerde süre, bildirimin
          ulaşmasından itibaren en geç <strong>14 gündür</strong>. Diğer ürünlerde iade onayı sonrası
          banka / kart kuruluşu süreçleri nedeniyle tutarın hesabınıza yansıması birkaç iş günü
          sürebilir.
        </li>
        <li>
          İndirim, puan veya hediye çeki ile yapılan ödemelerde iade aynı araçlarla veya ürün
          koşullarında yazıldığı şekilde yapılır.
        </li>
        <li>Muhasebe soruları: {COMPANY.phones.accounting.join(', ')}</li>
      </ul>

      <h2>11. Mesafeli satış ve cayma</h2>
      <p>
        Konaklama, paket tur, taşıma ve belirli bir tarihte ifası gereken eğlence / dinlence
        hizmetlerinde, mesafeli sözleşmelerdeki genel 14 günlük cayma hakkı çoğu durumda uygulanmaz;
        iptal ve iade bu sayfadaki / ürün kartındaki özel koşullara tabidir. Ayrıntı için Kullanım
        Koşulları sayfasına bakınız.
      </p>

      <h2>12. Uyuşmazlık</h2>
      <p>
        Öncelikle müşteri hizmetlerimize başvurmanızı rica ederiz. Çözülemeyen uyuşmazlıklarda
        yerleşim yerinizdeki Tüketici Hakem Heyeti / Tüketici Mahkemesi ile TÜRSAB kanalları
        kullanılabilir. {COMPANY.etbisNote}
      </p>

      <h2>13. İletişim</h2>
      <p>
        Rezervasyon: {COMPANY.phones.reservation.join(' / ')}
        <br />
        Ofis: {COMPANY.phones.office.join(' / ')}
        <br />
        E-posta: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        <br />
        Adres: {companyAddressFull()}
      </p>
      <p className="text-sm text-neutral-500">
        Bu metin bilgilendirme amaçlıdır; tüketici mevzuatındaki zorunlu haklar saklıdır. Son
        güncelleme: Temmuz 2026.
      </p>
    </CorporatePageShell>
  )
}
