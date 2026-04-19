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

        <BecomeProviderModule
          config={{
            heading: 'Siz de Aramıza Katılın',
            subheading:
              'Otel, tatil evi, tur, yat, araç kiralama — her türlü seyahat hizmetinizi platformumuza ekleyin ve milyonlarca gezgine ulaşın.',
            ctaText: 'İlan Oluştur',
            ctaHref: '/manage',
            secondaryCtaText: 'Daha Fazla Bilgi',
            secondaryCtaHref: '#',
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
