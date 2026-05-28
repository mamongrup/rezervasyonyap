import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, Home, Ship, Sparkles, Calendar, Globe, Wallet, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tesis Yönetimi — Otel, Villa, Yat, Aktivite',
  description:
    'Otel, tatil evi, yat ve aktivite tesisinizi tek panelden yönetin. Vitrinde satış + partner API ağı.',
}

const VERTICALS = [
  {
    icon: Building2,
    code: 'hotel',
    title: 'Otel',
    desc: 'Oda tipleri, pansiyon, takvim ve komisyon şeffaflığı.',
  },
  {
    icon: Home,
    code: 'holiday_home',
    title: 'Tatil evi / Villa',
    desc: 'Bravo entegrasyonu, iCal senkron, sezonluk fiyat.',
  },
  {
    icon: Ship,
    code: 'yacht_charter',
    title: 'Yat kiralama',
    desc: 'Müsaitlik takvimi, depozito ve rezervasyon paneli.',
  },
  {
    icon: Sparkles,
    code: 'activity',
    title: 'Aktivite',
    desc: 'Seans, kontenjan ve anlık fiyat teklifi.',
  },
]

const FEATURES = [
  { icon: Calendar, title: 'Tek takvim', desc: 'Rezervasyon, iCal ve müsaitlik aynı yerde.' },
  { icon: Globe, title: 'Vitrin + API', desc: 'rezervasyonyap.tr ve acente partner ağı.' },
  { icon: Wallet, title: 'Komisyon & fatura', desc: 'Tedarikçi panelinde şeffaf tahakkuk.' },
]

export default function TesisYonetimiPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <section className="relative overflow-hidden bg-neutral-950 py-20 text-white">
        <div className="container relative mx-auto max-w-5xl px-4">
          <p className="mb-3 text-sm font-medium text-primary-400">Tedarikçi / tesis sahibi</p>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Tesisinizi vitrine açın,
            <span className="text-primary-400"> partner ağına dağıtın</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-neutral-400">
            Otel, tatil evi, yat ve aktivite — tek envanter hem sitemizde satılır hem acente API’si ile dış
            kanallara açılır. Siz panelden yönetirsiniz.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/tedarikci-ol"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-7 py-3.5 text-sm font-bold transition hover:bg-primary-500"
            >
              Tedarikçi başvurusu
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/developer"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-7 py-3.5 text-sm font-medium transition hover:bg-white/5"
            >
              Partner API dokümantasyonu
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Desteklenen tesis tipleri</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {VERTICALS.map((v) => (
              <div
                key={v.code}
                className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-neutral-900/40"
              >
                <v.icon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                <h3 className="mt-4 font-semibold text-neutral-900 dark:text-white">{v.title}</h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-100 bg-neutral-50 py-16 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Neden biz?</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <f.icon className="h-7 w-7 text-primary-600" />
                <h3 className="mt-3 font-semibold text-neutral-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Hemen başlayın</h2>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">
            Onay sonrası katalog panelinden ilanınızı yayınlayın; acenteler Partner API ile satış yapabilir.
          </p>
          <Link
            href="/tedarikci-ol"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-8 py-3 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900"
          >
            Tedarikçi Ol
          </Link>
        </div>
      </section>
    </div>
  )
}
