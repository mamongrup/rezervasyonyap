import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Building2, CheckCircle2, TrendingUp, Users, Globe, Headphones,
  Star, BarChart3, ShieldCheck, Zap, Gift, Phone, Mail,
} from 'lucide-react'
import AcenteOlForm from './AcenteOlForm'

export const metadata: Metadata = {
  title: 'Acente Olun — Seyahat Platformu Ortağınız',
  description:
    'Seyahat acentenizi platformumuza bağlayın. Milyonlarca müşteriye ulaşın, komisyon kazanın, rezervasyonlarınızı tek panelden yönetin.',
}

const BENEFITS = [
  {
    icon: TrendingUp,
    title: 'Artan Gelir',
    desc: 'Platformumuz üzerinden yaptığınız her rezervasyondan rekabetçi komisyon oranlarıyla gelir elde edin.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    icon: Globe,
    title: 'Geniş Müşteri Kitlesi',
    desc: 'Yurt içi ve yurt dışındaki milyonlarca gezgine markanızı tanıtın, organik rezervasyonlar alın.',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    icon: BarChart3,
    title: 'Güçlü Analitik',
    desc: 'Rezervasyon performansınızı, dönüşüm oranlarınızı ve gelir trendlerinizi anlık olarak izleyin.',
    color: 'text-violet-600',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
  },
  {
    icon: ShieldCheck,
    title: 'Güvenli Ödeme',
    desc: 'Tahsilatları biz yapıyoruz, komisyonlarınızı otomatik transfer ile hesabınıza aktarıyoruz.',
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    icon: Zap,
    title: 'Hızlı Entegrasyon',
    desc: 'Mevcut portföyünüzü tek seferde yükleyin. API entegrasyonu veya manuel ekleme seçenekleri mevcuttur.',
    color: 'text-rose-600',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
  },
  {
    icon: Headphones,
    title: 'Özel Destek',
    desc: 'Acente ortaklarımıza özel müşteri başarısı ekibimiz her adımda yanınızdadır.',
    color: 'text-primary-600',
    bg: 'bg-primary-50 dark:bg-primary-900/20',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Başvurun',
    desc: 'Aşağıdaki formu doldurun. Başvurunuz 1–2 iş günü içinde değerlendirilir.',
  },
  {
    step: '02',
    title: 'Onay & Sözleşme',
    desc: 'Başvurunuz onaylandıktan sonra acente sözleşmesini dijital olarak imzalayın.',
  },
  {
    step: '03',
    title: 'Portföyünüzü Yükleyin',
    desc: 'Tur, otel veya aktivite paketlerinizi panel üzerinden ya da API ile ekleyin.',
  },
  {
    step: '04',
    title: 'Kazanmaya Başlayın',
    desc: 'Rezervasyonlar gelmeye başlar; komisyonlarınız otomatik olarak hesabınıza aktarılır.',
  },
]

const PLANS = [
  {
    name: 'Başlangıç',
    price: 'Ücretsiz',
    period: '',
    desc: 'Küçük acenteler ve bireysel rehberler için.',
    features: [
      '5 aktif ilan',
      'Temel analitik',
      'E-posta desteği',
      'Standart komisyon oranı',
    ],
    cta: 'Hemen Başla',
    highlighted: false,
  },
  {
    name: 'Profesyonel',
    price: '₺499',
    period: '/ay',
    desc: 'Büyüyen acenteler için tüm ihtiyaçlar bir arada.',
    features: [
      'Sınırsız ilan',
      'Gelişmiş analitik & raporlar',
      'Öncelikli müşteri desteği',
      'Düşük komisyon oranı',
      'Öne çıkarma kredisi',
      'API erişimi',
    ],
    cta: 'Profesyonel\'e Geç',
    highlighted: true,
  },
  {
    name: 'Kurumsal',
    price: 'Teklif Al',
    period: '',
    desc: 'Büyük zincirler ve kurumsal acenteler için özel çözüm.',
    features: [
      'Sınırsız ilan & lokasyon',
      'Özel yönetici hesabı',
      'SLA garantili destek',
      'Özel komisyon müzakeresi',
      'White-label seçeneği',
      'Tam API + webhook erişimi',
    ],
    cta: 'Bize Ulaşın',
    highlighted: false,
  },
]

const STATS = [
  { value: '850K+', label: 'Aylık ziyaretçi' },
  { value: '12.000+', label: 'Aktif ilan' },
  { value: '2.400+', label: 'Ortak acente' },
  { value: '98%', label: 'Müşteri memnuniyeti' },
]

export default function AcenteOlPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 py-24 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        </div>
        <div className="container relative mx-auto max-w-5xl px-4 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <Building2 className="h-4 w-4" />
            Acente Ortaklığı
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Seyahat Acentenizi<br />
            <span className="text-yellow-300">Milyonlara Taşıyın</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-white/80">
            Türkiye&apos;nin en hızlı büyüyen seyahat platformuna acente ortağı olun.
            Tur, otel, yat ve daha fazlasını listeleyin — rezervasyonlar otomatik gelsin.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="#basvuru"
              className="rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-primary-700 shadow-lg transition hover:bg-yellow-50"
            >
              Ücretsiz Başvur
            </a>
            <a
              href="#nasil-calisir"
              className="rounded-2xl border border-white/30 px-8 py-3.5 text-sm font-medium backdrop-blur-sm transition hover:bg-white/10"
            >
              Nasıl Çalışır?
            </a>
          </div>
        </div>
      </section>

      {/* ── İstatistikler ──────────────────────────────────────────────── */}
      <section className="border-b border-neutral-100 bg-neutral-50 py-12 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold text-primary-600 dark:text-primary-400">{s.value}</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Avantajlar ─────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">
              Neden Bizimle Çalışmalısınız?
            </h2>
            <p className="mt-3 text-neutral-500 dark:text-neutral-400">
              Acente ortaklarımıza sunduğumuz ayrıcalıklı avantajlar
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${b.bg}`}>
                  <b.icon className={`h-6 w-6 ${b.color}`} />
                </div>
                <h3 className="mb-2 font-semibold text-neutral-900 dark:text-white">{b.title}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Nasıl Çalışır ──────────────────────────────────────────────── */}
      <section id="nasil-calisir" className="bg-neutral-50 py-20 dark:bg-neutral-900">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">Nasıl Çalışır?</h2>
            <p className="mt-3 text-neutral-500 dark:text-neutral-400">4 adımda acente ortağınız olun</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="relative rounded-2xl bg-white p-6 shadow-sm dark:bg-neutral-800">
                <p className="mb-3 text-4xl font-extrabold text-primary-100 dark:text-primary-900/60">
                  {step.step}
                </p>
                <h3 className="mb-2 font-semibold text-neutral-900 dark:text-white">{step.title}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planlar ────────────────────────────────────────────────────── */}
      <section id="planlar" className="py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">Üyelik Planları</h2>
            <p className="mt-3 text-neutral-500 dark:text-neutral-400">
              İhtiyacınıza göre plan seçin — istediğiniz zaman yükseltin
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={[
                  'relative flex flex-col rounded-2xl border p-6',
                  plan.highlighted
                    ? 'border-primary-500 bg-primary-600 text-white shadow-xl shadow-primary-500/20'
                    : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900',
                ].join(' ')}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
                      En Popüler
                    </span>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className={`font-bold ${plan.highlighted ? 'text-white' : 'text-neutral-900 dark:text-white'}`}>
                    {plan.name}
                  </h3>
                  <div className="mt-1 flex items-end gap-1">
                    <span className={`text-3xl font-extrabold ${plan.highlighted ? 'text-white' : 'text-neutral-900 dark:text-white'}`}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className={`mb-0.5 text-sm ${plan.highlighted ? 'text-white/70' : 'text-neutral-500'}`}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-sm ${plan.highlighted ? 'text-white/70' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    {plan.desc}
                  </p>
                </div>
                <ul className="mb-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${plan.highlighted ? 'text-yellow-300' : 'text-primary-500'}`} />
                      <span className={plan.highlighted ? 'text-white/90' : 'text-neutral-600 dark:text-neutral-300'}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#basvuru"
                  className={[
                    'block rounded-xl py-2.5 text-center text-sm font-semibold transition',
                    plan.highlighted
                      ? 'bg-white text-primary-700 hover:bg-yellow-50'
                      : 'border border-primary-500 text-primary-600 hover:bg-primary-50 dark:border-primary-600 dark:text-primary-400 dark:hover:bg-primary-900/20',
                  ].join(' ')}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Başvuru Formu ──────────────────────────────────────────────── */}
      <section id="basvuru" className="bg-neutral-50 py-20 dark:bg-neutral-900">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">Acente Başvurusu</h2>
            <p className="mt-3 text-neutral-500 dark:text-neutral-400">
              Formu doldurun, ekibimiz 1–2 iş günü içinde sizinle iletişime geçsin.
            </p>
          </div>

          <AcenteOlForm />
        </div>
      </section>

      {/* ── İletişim ──────────────────────────────────────────────────── */}
      <section className="border-t border-neutral-100 py-16 dark:border-neutral-800">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
                <Phone className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Telefon</p>
                <p className="text-sm text-neutral-500">+90 212 XXX XX XX</p>
                <p className="text-xs text-neutral-400">Hft içi 09:00–18:00</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
                <Mail className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">E-posta</p>
                <p className="text-sm text-neutral-500">acente@seyahat.com</p>
                <p className="text-xs text-neutral-400">24 saat içinde yanıt</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
                <Users className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Acente Desteği</p>
                <p className="text-sm text-neutral-500">acente-destek@seyahat.com</p>
                <p className="text-xs text-neutral-400">Öncelikli destek hattı</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
