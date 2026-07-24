import BackgroundSection from '@/components/BackgroundSection'
import BgGlassmorphism from '@/components/BgGlassmorphism'
import CmsBlocksRenderer from '@/components/cms/CmsBlocksRenderer'
import SectionClientSay from '@/components/SectionClientSay'
import NewsletterModule from '@/components/page-builder/modules/NewsletterModule'
import BecomeProviderModule from '@/components/page-builder/modules/BecomeProviderModule'
import {
  COMPANY,
  companyAddressFull,
  formatTursabLabel,
  COMPANY_PHONE_PRIMARY,
  COMPANY_PHONE_SECONDARY,
} from '@/lib/corporate/company'
import { getCmsPageBySlug } from '@/lib/travel-api'
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description: `${COMPANY.brandName} — ${COMPANY.foundedYear}'den beri Fethiye merkezli ${COMPANY.agencyName}. ${formatTursabLabel()}.`,
}

function SectionAnchor({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      {children}
    </section>
  )
}

function AboutStaticContent({ locale }: { locale: string }) {
  const contactHref = `/${locale}/contact`

  return (
    <>
      {/* Hero */}
      <div className="relative isolate -mx-4 min-h-[42vh] overflow-hidden rounded-3xl bg-neutral-900 sm:-mx-0 sm:min-h-[46vh]">
        <Image
          src="/corporate/fethiye-marina-hero.jpg"
          alt="Fethiye kıyısı ve marina"
          fill
          priority
          className="object-cover opacity-70"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-900/45 to-neutral-900/25" />
        <div className="relative flex min-h-[42vh] flex-col justify-end px-6 pb-10 pt-24 sm:min-h-[46vh] sm:px-10 sm:pb-14">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">{COMPANY.brandName}</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Fethiye’den yola çıkan, güvenilir seyahat deneyimi
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
            {COMPANY.foundedYear} yılından bu yana {COMPANY.agencyName} çatısı altında; otel, tur,
            tekne ve tatil ürünlerini yerinden bilen bir ekiple sunuyoruz.
          </p>
        </div>
      </div>

      {/* Story */}
      <section className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800">
          <Image
            src="/corporate/travel-desk-hero.jpg"
            alt="Seyahat planlama masası"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Hikâyemiz</h2>
          <div className="mt-4 space-y-4 leading-relaxed text-neutral-600 dark:text-neutral-400">
            <p>
              {COMPANY.legalName} bünyesinde kurulan {COMPANY.agencyName}, Fethiye’nin turizm
              dokusunu yakından tanıyan bir acente olarak yola çıktı. Yıllar içinde yalnızca yerel
              tur ve konaklama değil; Türkiye’nin farklı bölgelerine yayılan ürün yelpazesiyle
              dijital rezervasyon deneyimini güçlendirdik.
            </p>
            <p>
              Bugün {COMPANY.brandName} platformu üzerinden misafirlerimize şeffaf fiyat, net iptal
              koşulları ve {formatTursabLabel()} güvencesiyle hizmet veriyoruz. Amacımız; ekrandaki
              seçimin sahadaki gerçekle uyumlu, sorunsuz bir tatil haline gelmesi.
            </p>
            <p>
              Ofisimiz Kesikkapı’da; telefonlarımız açık. Online rezervasyon kadar yüz yüze
              danışmanlığı da önemsiyoruz — çünkü iyi bir tatil planı çoğu zaman bir soruyla başlar.
            </p>
          </div>
        </div>
      </section>

      {/* Facts */}
      <section className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-6 dark:border-neutral-800 dark:bg-neutral-900/40 sm:p-8">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Kurumsal bilgiler</h2>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Ticari unvan</dt>
            <dd className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">{COMPANY.legalName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Acente / belge</dt>
            <dd className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
              {COMPANY.agencyName}
              <br />
              {formatTursabLabel()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Kuruluş</dt>
            <dd className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">{COMPANY.foundedYear}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Adres</dt>
            <dd className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">{companyAddressFull()}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Telefon</dt>
            <dd className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
              <a className="underline-offset-2 hover:underline" href={`tel:${COMPANY_PHONE_PRIMARY.replace(/\s/g, '')}`}>
                {COMPANY_PHONE_PRIMARY}
              </a>
              {' · '}
              <a className="underline-offset-2 hover:underline" href={`tel:${COMPANY_PHONE_SECONDARY.replace(/\s/g, '')}`}>
                {COMPANY_PHONE_SECONDARY}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">E-posta</dt>
            <dd className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
              <a className="underline-offset-2 hover:underline" href={`mailto:${COMPANY.email}`}>
                {COMPANY.email}
              </a>
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-neutral-500">{COMPANY.etbisNote}</p>
        <p className="mt-4 text-sm">
          <Link
            href={contactHref}
            className="font-medium text-neutral-800 underline-offset-2 hover:underline dark:text-neutral-200"
          >
            İletişim sayfasına git →
          </Link>
        </p>
      </section>

      <SectionAnchor id="nasil-calisir">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Nasıl çalışır?</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          <li className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">1</span>
            <h3 className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">Keşfedin</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Otel, villa, tur, yat veya transfer arasından destinasyon ve tarihinize uygun ürünü seçin.
            </p>
          </li>
          <li className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">2</span>
            <h3 className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">Rezerve edin</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Misafir bilgilerini girin, koşulları onaylayın ve güvenli ödeme ile rezervasyonunuzu tamamlayın.
            </p>
          </li>
          <li className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">3</span>
            <h3 className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">Yola çıkın</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Onay e-postasını saklayın; ihtiyaç halinde Fethiye ofisimiz ve rezervasyon hatlarımız yanınızda.
            </p>
          </li>
        </ol>
      </SectionAnchor>

      {/* Values */}
      <section>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Ne için çalışıyoruz?</h2>
        <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Kısa vaatler değil; rezervasyondan dönüşe kadar net iletişim ve sorumlu acentelik.
        </p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-3">
          <li className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Şeffaflık</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Fiyat, dahil hizmetler ve iptal kuralları rezervasyon öncesinde görünür olmalı. Sürpriz
              ücretlerle değil, net bilgiyle ilerleriz.
            </p>
          </li>
          <li className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Yerel uzmanlık</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Likya kıyısı, tekne rotaları ve bölge konaklaması konusunda sahadaki deneyimi dijitale
              taşıyoruz; uzak bir katalog değil, tanıdığımız ürünleri öneriyoruz.
            </p>
          </li>
          <li className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Güvenilir süreç</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              TÜRSAB belgesi, KVKK uyumu ve güvenli ödeme altyapısı; misafir ve iş ortakları için
              sürdürülebilir bir iş modelinin temelidir.
            </p>
          </li>
        </ul>
      </section>

      <SectionAnchor id="kariyer">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Kariyer</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-neutral-600 dark:text-neutral-400">
          Operasyon, satış, içerik veya dijital ürün alanlarında ekibimize katılmak isterseniz
          özgeçmişinizi ve kısa bir tanıtım notunu e-posta ile iletebilirsiniz. Uygun pozisyonlarda
          sizinle iletişime geçeriz.
        </p>
        <p className="mt-4 text-sm">
          <a
            href={`mailto:${COMPANY.email}?subject=${encodeURIComponent('Kariyer başvurusu')}`}
            className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
          >
            {COMPANY.email}
          </a>
        </p>
      </SectionAnchor>

      <SectionAnchor id="basin">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Basın</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-neutral-600 dark:text-neutral-400">
          Röportaj, marka hikâyesi veya ürün lansmanı için basın taleplerinizi aynı iletişim
          adresine iletebilirsiniz. Kurumsal logo ve şirket bilgileri talebi üzerine paylaşılır.
        </p>
      </SectionAnchor>

      <SectionAnchor id="surdurulebilirlik">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Sürdürülebilirlik</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-neutral-600 dark:text-neutral-400">
          Bölge turizminin uzun vadeli değerini korumak için doğa ve kültür odaklı ürünleri öne
          çıkarmaya, gereksiz baskı yaratan uygulamalardan kaçınmaya özen gösteriyoruz. İş
          ortaklarımızdan da aynı duyarlılığı bekleriz.
        </p>
      </SectionAnchor>

      <div className="relative py-16">
        <BackgroundSection />
        <SectionClientSay />
      </div>

      <BecomeProviderModule
        config={{
          heading: 'Siz de aramıza katılın',
          subheading:
            'Otel, tatil evi, tur veya yat işletmecisiyseniz ürünlerinizi platforma ekleyerek misafirlere ulaşabilirsiniz.',
          ctaText: 'İlan oluştur',
          ctaHref: '/manage',
          secondaryCtaText: 'İletişim',
          secondaryCtaHref: contactHref,
          bgVariant: 'gradient',
        }}
      />

      <NewsletterModule
        config={{
          title: 'Haberdar olun',
          description: 'Yeni destinasyonlar, sezon fırsatları ve seyahat notları için bültenimize abone olun.',
          buttonText: 'Abone ol',
          gradient: 'from-primary-600 to-primary-700',
        }}
      />
    </>
  )
}

export default async function PageAbout({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  try {
    const { blocks } = await getCmsPageBySlug({ slug: 'about' })
    if (blocks.length > 0) {
      return (
        <div className="relative overflow-hidden">
          <BgGlassmorphism />
          <div className="container flex flex-col gap-y-16 py-16 lg:gap-y-28 lg:py-28">
            <CmsBlocksRenderer blocks={blocks} />
          </div>
        </div>
      )
    }
  } catch {
    /* yayımlanmış CMS sayfası yok — statik şablon */
  }

  return (
    <div className="relative overflow-hidden">
      <BgGlassmorphism />
      <div className="container flex flex-col gap-y-16 py-16 lg:gap-y-24 lg:py-24">
        <AboutStaticContent locale={locale} />
      </div>
    </div>
  )
}
