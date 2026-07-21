import BackgroundSection from '@/components/BackgroundSection'
import BgGlassmorphism from '@/components/BgGlassmorphism'
import CmsBlocksRenderer from '@/components/cms/CmsBlocksRenderer'
import SectionClientSay from '@/components/SectionClientSay'
import NewsletterModule from '@/components/page-builder/modules/NewsletterModule'
import BecomeProviderModule from '@/components/page-builder/modules/BecomeProviderModule'
import rightImg from '@/images/about-hero-right.png'
import { getCmsPageBySlug } from '@/lib/travel-api'
import { Metadata } from 'next'
import SectionFounder from './SectionFounder'
import SectionHero from './SectionHero'
import SectionStatistic from './SectionStatistic'

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description:
    "Türkiye'nin en kapsamlı seyahat platformu olarak otel, tur, tatil evi, yat kiralama ve daha fazlasını tek çatı altında sunuyoruz.",
}

export default async function PageAbout() {
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

      <div className="container flex flex-col gap-y-16 py-16 lg:gap-y-28 lg:py-28">
        <SectionHero
          rightImg={rightImg}
          heading="👋 Hakkımızda"
          subHeading="Türkiye'nin dört bir yanındaki gezginleri, en iyi otellerden tatil evlerine, tur operatörlerinden yat kiralamaya kadar binlerce seçenekle buluşturan bağımsız bir seyahat platformuyuz."
        />

        <SectionFounder />

        <div className="relative py-20">
          <BackgroundSection />
          <SectionClientSay />
        </div>

        <SectionStatistic />

        <section id="kariyer" className="scroll-mt-28 rounded-3xl border border-neutral-200 bg-white p-8 dark:border-neutral-700 dark:bg-neutral-900 sm:p-10">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">Kariyer</h2>
          <p className="mt-3 max-w-3xl text-neutral-600 dark:text-neutral-300">
            Seyahat teknolojisi ve operasyon ekiplerimize katılmak ister misiniz? Açık pozisyonlar ve
            başvurular için bizimle iletişime geçin.
          </p>
          <a
            href="/contact"
            className="mt-5 inline-flex text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            İletişim →
          </a>
        </section>

        <section id="basin" className="scroll-mt-28 rounded-3xl border border-neutral-200 bg-white p-8 dark:border-neutral-700 dark:bg-neutral-900 sm:p-10">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">Basın</h2>
          <p className="mt-3 max-w-3xl text-neutral-600 dark:text-neutral-300">
            Medya kitleri, marka varlıkları ve basın soruları için iletişim formumuz üzerinden bize
            ulaşabilirsiniz. Güncel içerikler için blogumuzu da takip edin.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold">
            <a href="/contact" className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
              Basın iletişimi →
            </a>
            <a href="/blog" className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
              Blog →
            </a>
          </div>
        </section>

        <section
          id="surdurulebilirlik"
          className="scroll-mt-28 rounded-3xl border border-neutral-200 bg-white p-8 dark:border-neutral-700 dark:bg-neutral-900 sm:p-10"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">Sürdürülebilirlik</h2>
          <p className="mt-3 max-w-3xl text-neutral-600 dark:text-neutral-300">
            Yerel işletmeleri destekleyen, şeffaf fiyatlı ve sorumlu turizm ilkelerine uygun bir
            platform inşa ediyoruz. Tesis ve tur ortaklarımızın yasal belgelerini doğrulayarak güvenli
            seyahati önceiyoruz.
          </p>
        </section>

        <BecomeProviderModule
          config={{
            heading: 'Siz de Aramıza Katılın',
            subheading:
              'Otel, tatil evi, tur, yat, araç kiralama — her türlü seyahat hizmetinizi platformumuza ekleyin ve milyonlarca gezgine ulaşın.',
            ctaText: 'İlan Oluştur',
            ctaHref: '/tedarikci-ol',
            secondaryCtaText: 'Daha Fazla Bilgi',
            secondaryCtaHref: '/ilan-ver#nasil-calisir',
            bgVariant: 'gradient',
          }}
        />

        <NewsletterModule
          config={{
            title: 'Haberdar Olun',
            description: 'Yeni destinasyonlar, özel kampanyalar ve seyahat ipuçları için bültenimize abone olun.',
            buttonText: 'Abone Ol',
            gradient: 'from-primary-600 to-primary-700',
          }}
        />
      </div>
    </div>
  )
}
