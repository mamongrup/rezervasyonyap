import BgGlassmorphism from '@/components/BgGlassmorphism'
import NewsletterModule from '@/components/page-builder/modules/NewsletterModule'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import {
  Activity,
  Anchor,
  Car,
  Home,
  Hotel,
  Landmark,
  Map,
  Plane,
  Rocket,
  Sailboat,
  Ship,
  Stamp,
  Van,
  type LucideIcon,
} from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'İlan Ver & Kazan',
  description:
    'Otel, tatil evi, tur, yat kiralama veya araç kiralama ilanınızı ekleyin. Milyonlarca gezgine ulaşın ve kazanmaya başlayın.',
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  oteller: Hotel,
  'tatil-evleri': Home,
  'yat-kiralama': Anchor,
  turlar: Map,
  aktiviteler: Activity,
  kruvaziyer: Ship,
  'arac-kiralama': Car,
  transfer: Van,
  feribot: Sailboat,
  'hac-umre': Landmark,
  vize: Stamp,
  'ucak-bileti': Plane,
}

const categories = [
  { slug: 'oteller', name: 'Otel', desc: 'Butik otelinden 5 yıldızlı tesise her ölçekte konaklama' },
  { slug: 'tatil-evleri', name: 'Tatil Evi / Villa', desc: 'Özel villa, dağ evi, çiftlik evi ve apart daireler' },
  { slug: 'yat-kiralama', name: 'Yat Kiralama', desc: 'Gulet, motor yat, katamaran ve tekne turları' },
  { slug: 'turlar', name: 'Tur', desc: 'Günübirlik, uzun ve özel şehir turları' },
  { slug: 'aktiviteler', name: 'Aktivite', desc: 'Su sporları, yamaç paraşütü, dalış ve daha fazlası' },
  { slug: 'kruvaziyer', name: 'Kruvaziyer', desc: 'Akdeniz ve dünya kruvaziyer güzergahları' },
  { slug: 'arac-kiralama', name: 'Araç Kiralama', desc: 'Günlük ve uzun dönem araç kiralama hizmetleri' },
  { slug: 'transfer', name: 'Transfer', desc: 'Havalimanı, şehirler arası ve özel transfer' },
  { slug: 'feribot', name: 'Feribot', desc: 'Yurt içi ve uluslararası feribot seferleri' },
  { slug: 'hac-umre', name: 'Hac & Umre', desc: 'Resmi Diyanet İşleri onaylı hac ve umre paketleri' },
  { slug: 'vize', name: 'Vize', desc: 'Vize başvuru ve danışmanlık hizmetleri' },
  { slug: 'ucak-bileti', name: 'Uçak Bileti', desc: 'Yurt içi ve yurt dışı uçuş seçenekleri' },
]

const steps = [
  {
    step: '01',
    title: 'Kategori Seçin',
    desc: 'Sunduğunuz hizmete uygun kategoriyi seçin. Otel, tur, yat, araç kiralama ve daha fazlası.',
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  },
  {
    step: '02',
    title: 'Bilgileri Girin',
    desc: 'Başlık, açıklama, fiyat, fotoğraf ve konum bilgilerini ekleyin. Birkaç dakika sürer.',
    color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  },
  {
    step: '03',
    title: 'Onay Bekleyin',
    desc: 'Ekibimiz ilanınızı 24 saat içinde inceler ve onaylar. Sizi e-posta ile bilgilendiririz.',
    color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
  },
  {
    step: '04',
    title: 'Rezervasyon Alın',
    desc: 'İlanınız yayınlandıktan sonra gezginler rezervasyon yapar. Ödemeler güvenle hesabınıza aktarılır.',
    color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  },
]

const faqs = [
  {
    q: 'İlan vermek ücretli mi?',
    a: 'Temel ilan oluşturma tamamen ücretsizdir. Öne çıkarma ve premium görünürlük paketleri isteğe bağlı olarak sunulmaktadır.',
  },
  {
    q: 'Komisyon oranı nedir?',
    a: 'Başlangıç için %0 komisyon sunuyoruz. Aylık rezervasyon hacminize göre avantajlı komisyon kademeleri mevcuttur.',
  },
  {
    q: 'Birden fazla ilan ekleyebilir miyim?',
    a: 'Evet, aynı hesapla birden fazla kategori ve bölgede sınırsız ilan oluşturabilirsiniz.',
  },
  {
    q: 'Ödeme ne zaman yapılır?',
    a: 'Konuk check-out yaptıktan 48 saat sonra ödeme hesabınıza aktarılır. Banka havalesi ve IBAN desteği mevcuttur.',
  },
]

function IlanVerCategoryIcon({ slug }: { slug: string }) {
  const Icon = CATEGORY_ICONS[slug] ?? Hotel
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/15 via-white to-indigo-500/10 text-primary-600 shadow-sm ring-1 ring-primary-500/15 dark:from-primary-400/15 dark:via-neutral-900 dark:to-indigo-500/10 dark:text-primary-400 dark:ring-primary-500/25">
      <Icon className="h-6 w-6" strokeWidth={1.65} aria-hidden />
    </span>
  )
}

export default function IlanVerPage() {
  return (
    <div className="relative overflow-hidden">
      <BgGlassmorphism />

      {/* Hero */}
      <section className="container pt-16 pb-0 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
            <Rocket className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            Ücretsiz başlayın
          </div>
          <h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl text-neutral-900 dark:text-neutral-100">
            İlanınızı Ekleyin,<br />
            <span className="text-primary-600">Kazanmaya Başlayın</span>
          </h1>
          <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Türkiye&apos;nin en büyük seyahat platformunda yerinizi alın. Otel, tur, tatil evi, yat, araç kiralama ve daha fazlasını ekleyin — milyonlarca gezgine ulaşın.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <ButtonPrimary href="/manage" className="px-8 py-3.5 text-base">
              Ücretsiz İlan Oluştur
            </ButtonPrimary>
            <ButtonSecondary href="#nasil-calisir" className="px-8 py-3.5 text-base">
              Nasıl Çalışır?
            </ButtonSecondary>
          </div>
          <p className="mt-4 text-sm text-neutral-400">
            Kredi kartı gerekmez · Kurulum ücretsiz · 24 saat içinde yayında
          </p>
        </div>
      </section>

      <div className="container flex flex-col gap-y-20 py-20 lg:gap-y-28 lg:py-28">

        {/* Steps */}
        <section id="nasil-calisir">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">4 Adımda Başlayın</h2>
            <p className="mt-3 text-neutral-500 dark:text-neutral-400">Kayıt olmaktan ilk rezervasyona kadar her şey çok kolay</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.step} className="rounded-2xl border border-neutral-100 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold ${s.color}`}>
                  {s.step}
                </div>
                <h3 className="mb-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">{s.title}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* Category grid */}
        <section>
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Hangi Kategoride İlan Vereceksiniz?</h2>
            <p className="mt-3 text-neutral-500 dark:text-neutral-400">{categories.length} farklı kategoride ilan oluşturabilirsiniz</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href="/manage"
                className="group flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-white p-5 transition hover:border-primary-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-primary-700"
              >
                <IlanVerCategoryIcon slug={cat.slug} />
                <div>
                  <h3 className="font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-neutral-100 dark:group-hover:text-primary-400">
                    {cat.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{cat.desc}</p>
                </div>
                <span className="mt-auto text-xs font-medium text-primary-600 group-hover:underline dark:text-primary-400">
                  İlan Ver →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <Divider />

        {/* FAQ */}
        <section>
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Sıkça Sorulan Sorular</h2>
          </div>
          <div className="mx-auto max-w-3xl divide-y divide-neutral-100 dark:divide-neutral-800">
            {faqs.map((faq, i) => (
              <div key={i} className="py-6">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <NewsletterModule
          config={{
            title: 'Yayına Girin, Öne Çıkın!',
            description: 'İlan sahiplerine özel kampanya ve duyurulardan haberdar olmak için bültenimize abone olun.',
            buttonText: 'Abone Ol',
            gradient: 'from-primary-600 to-primary-700',
          }}
        />
      </div>
    </div>
  )
}
