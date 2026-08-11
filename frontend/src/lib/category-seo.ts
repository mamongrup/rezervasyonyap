import type { CategoryRegistryEntry } from '@/data/category-registry'
import { DEFAULT_OG_IMAGE_HEIGHT, DEFAULT_OG_IMAGE_WIDTH } from '@/lib/site-branding-seo'

type SeoCopy = { title: string; description: string }

const TR_CATEGORY_SEO: Record<string, SeoCopy> = {
  oteller: {
    title: 'Otel Rezervasyonu ve En Uygun Otel Fiyatları',
    description: 'Türkiye ve dünyadaki otelleri karşılaştırın; konum, olanak, fiyat ve müsaitlik bilgileriyle güvenli online otel rezervasyonu yapın.',
  },
  'tatil-evleri': {
    title: 'Kiralık Villa ve Tatil Evi Rezervasyonu',
    description: 'Havuzlu villa, balayı villası ve ailelere uygun tatil evlerini karşılaştırın; müsait tarihleri görerek güvenle rezervasyon yapın.',
  },
  'yat-kiralama': {
    title: 'Yat Kiralama, Gulet ve Mavi Tur Seçenekleri',
    description: 'Gulet, motoryat ve katamaran seçeneklerini rota, kapasite ve fiyatlarına göre karşılaştırın; size uygun yatı güvenle kiralayın.',
  },
  turlar: {
    title: 'Yurt İçi ve Yurt Dışı Tur Rezervasyonu',
    description: 'Kültür turları, Avrupa turları ve günübirlik gezileri program, tarih ve fiyatlarına göre karşılaştırıp online rezervasyon yapın.',
  },
  aktiviteler: {
    title: 'Aktivite ve Deneyim Rezervasyonu',
    description: 'Dalış, rafting, balon turu, safari ve daha fazla aktiviteyi konum, seans ve fiyat bilgileriyle keşfedin; yerinizi online ayırtın.',
  },
  kruvaziyer: {
    title: 'Kruvaziyer ve Gemi Turu Rezervasyonu',
    description: 'Akdeniz, Ege ve dünya rotalarındaki kruvaziyer turlarını tarih, kabin ve program seçenekleriyle karşılaştırın.',
  },
  'hac-umre': {
    title: 'Hac ve Umre Turları ile Güvenli Rezervasyon',
    description: 'Hac ve Umre paketlerini tarih, konaklama, ulaşım ve rehberlik hizmetleriyle inceleyin; güvenli şekilde başvurun.',
  },
  vize: {
    title: 'Vize Başvurusu ve Vize Danışmanlık Hizmetleri',
    description: 'Ülkeye göre vize şartlarını, gerekli belgeleri ve başvuru hizmetlerini inceleyin; uzman desteğiyle sürecinizi başlatın.',
  },
  'ucak-bileti': {
    title: 'Ucuz Uçak Bileti Ara ve Karşılaştır',
    description: 'Yurt içi ve yurt dışı uçuşları tarih, rota ve fiyatlarına göre karşılaştırın; size uygun uçak biletini güvenle bulun.',
  },
  'arac-kiralama': {
    title: 'Araç Kiralama ve Günlük Oto Kiralama',
    description: 'Ekonomik, aile ve lüks araç seçeneklerini teslim noktası, tarih ve fiyatlarına göre karşılaştırarak online araç kiralayın.',
  },
  feribot: {
    title: 'Feribot Bileti ve Ada Seferleri',
    description: 'Feribot ve ada seferlerini rota, tarih ve saat bilgileriyle karşılaştırın; online feribot bileti rezervasyonu yapın.',
  },
  transfer: {
    title: 'Havalimanı Transferi ve Özel Transfer',
    description: 'Havalimanı, otel ve şehirler arası özel transfer seçeneklerini araç, kapasite ve fiyat bilgileriyle karşılaştırın.',
  },
  'plaj-sezlong': {
    title: 'Plaj, Beach Club ve Şezlong Rezervasyonu',
    description: 'Plaj ve beach club seçeneklerini konum, giriş, şezlong ve hizmet bilgileriyle karşılaştırıp yerinizi online ayırtın.',
  },
  'sinema-biletleri': {
    title: 'Sinema Bileti ve Film Seansları',
    description: 'Vizyondaki filmleri, sinemaları ve güncel seansları inceleyin; uygun koltuk ve bilet seçenekleriyle rezervasyon yapın.',
  },
  etkinlikler: {
    title: 'Konser, Festival ve Etkinlik Biletleri',
    description: 'Konser, tiyatro, festival ve kültür etkinliklerini tarih, mekan ve seans bilgileriyle keşfedin; biletinizi online alın.',
  },
  'restoran-rezervasyon': {
    title: 'Online Restoran ve Masa Rezervasyonu',
    description: 'Restoranları mutfak, konum ve müsait saatlere göre keşfedin; seçtiğiniz tarih ve saatte masanızı online ayırtın.',
  },
}

const LOCALIZED_SUFFIX: Record<string, string> = {
  en: 'Online Booking & Best Prices',
  de: 'Online buchen & beste Preise',
  ru: 'Онлайн-бронирование и лучшие цены',
  zh: '在线预订与优惠价格',
  fr: 'Réservation en ligne & meilleurs prix',
}

export function categorySeoCopy(category: CategoryRegistryEntry, locale: string): SeoCopy {
  if (locale === 'tr' && TR_CATEGORY_SEO[category.slug]) return TR_CATEGORY_SEO[category.slug]
  const suffix = LOCALIZED_SUFFIX[locale] ?? LOCALIZED_SUFFIX.en
  return {
    title: `${category.name} — ${suffix}`,
    description: category.heroSubheading.trim(),
  }
}

export function categoryOgImageUrl(base: string, slug: string): string {
  return `${base.replace(/\/$/, '')}/api/og/category?slug=${encodeURIComponent(slug)}`
}

export function categoryOgImageMeta(base: string, slug: string, alt: string) {
  return {
    url: categoryOgImageUrl(base, slug),
    alt,
    width: DEFAULT_OG_IMAGE_WIDTH,
    height: DEFAULT_OG_IMAGE_HEIGHT,
    type: 'image/jpeg' as const,
  }
}
