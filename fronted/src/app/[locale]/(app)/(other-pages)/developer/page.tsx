import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Code2, Zap, Globe, ShieldCheck, BarChart3, Webhook, BookOpen,
  Terminal, Copy, ArrowRight, CheckCircle2, Clock, Lock, Mail,
  RefreshCw, Database, Layers, Server,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Developer API — Seyahat Platformu',
  description:
    'REST API ile seyahat içeriklerini uygulamanıza entegre edin. Tur, otel, uçuş ve daha fazlası için kapsamlı API dökümantasyonu.',
}

const FEATURES = [
  {
    icon: Zap,
    title: 'Yüksek Performans',
    desc: '99.9% uptime SLA, ortalama 50ms yanıt süresi. Küresel CDN ile düşük gecikme.',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  {
    icon: ShieldCheck,
    title: 'Güvenli & OAuth 2.0',
    desc: 'OAuth 2.0, API key ve JWT token desteği. HTTPS zorunlu, rate limiting dahil.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    icon: Globe,
    title: 'Çok Dilli Destek',
    desc: 'Türkçe ve İngilizce başta olmak üzere 20+ dil. locale parametresiyle anlık çeviri.',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    icon: Webhook,
    title: 'Webhook Bildirimleri',
    desc: 'Rezervasyon, iptal ve ödeme olayları için anlık webhook desteği.',
    color: 'text-violet-600',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
  },
  {
    icon: RefreshCw,
    title: 'Real-time Müsaitlik',
    desc: 'Anlık müsaitlik sorgulama. Stale veri yok; her istek canlı envanter döner.',
    color: 'text-rose-600',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
  },
  {
    icon: Database,
    title: 'Zengin İçerik',
    desc: '12.000+ ilan, 500+ destinasyon, fotoğraf, fiyat, puanlama ve konum verisi.',
    color: 'text-primary-600',
    bg: 'bg-primary-50 dark:bg-primary-900/20',
  },
]

const ENDPOINTS = [
  { method: 'GET',    path: '/v1/catalog/listings',           desc: 'Tüm ilanları listele & filtrele' },
  { method: 'GET',    path: '/v1/catalog/listings/:slug',     desc: 'Tekil ilan detayları' },
  { method: 'GET',    path: '/v1/catalog/categories',         desc: 'Kategori listesi' },
  { method: 'GET',    path: '/v1/search?q=antalya',           desc: 'Serbest metin arama' },
  { method: 'GET',    path: '/v1/availability/:id',           desc: 'Anlık müsaitlik sorgusu' },
  { method: 'POST',   path: '/v1/bookings',                   desc: 'Yeni rezervasyon oluştur' },
  { method: 'GET',    path: '/v1/bookings/:id',               desc: 'Rezervasyon durumu sorgula' },
  { method: 'DELETE', path: '/v1/bookings/:id',               desc: 'Rezervasyon iptali' },
  { method: 'GET',    path: '/v1/collections',                desc: 'Kuratoryal koleksiyonlar' },
  { method: 'GET',    path: '/v1/regions',                    desc: 'Destinasyon & bölge verisi' },
]

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  POST:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PUT:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DELETE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

const PLANS = [
  {
    name: 'Sandbox',
    price: 'Ücretsiz',
    period: '',
    desc: 'Geliştirme ve test için.',
    features: [
      '1.000 istek/gün',
      'Test ortamı',
      'Tüm endpoint\'ler',
      'E-posta desteği',
    ],
    cta: 'Sandbox Key Al',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '₺999',
    period: '/ay',
    desc: 'Küçük entegrasyonlar için.',
    features: [
      '50.000 istek/ay',
      'Prodüksiyon ortamı',
      'Webhook desteği',
      'SLA %99.5',
      'Teknik destek',
    ],
    cta: 'Starter\'a Başla',
    highlighted: false,
  },
  {
    name: 'Business',
    price: '₺3.499',
    period: '/ay',
    desc: 'Büyük uygulamalar için.',
    features: [
      '500.000 istek/ay',
      'Öncelikli destek',
      'Real-time webhook',
      'SLA %99.9',
      'Özel rate limit',
      'White-label seçeneği',
    ],
    cta: 'Business\'a Geç',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Teklif',
    period: '',
    desc: 'Kurumsal & OTA entegrasyonları.',
    features: [
      'Sınırsız istek',
      'Özel SLA',
      'Dedicated endpoint',
      'GDS entegrasyonu',
      'Özel veri yapısı',
      '7/24 telefon desteği',
    ],
    cta: 'Teklif Alın',
    highlighted: false,
  },
]

const CODE_SAMPLE = `// Listing arama örneği
const response = await fetch(
  'https://api.seyahat.com/v1/catalog/listings' +
  '?category_code=hotel&location=Antalya&locale=tr&per_page=10',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json',
    },
  }
)

const { listings, total } = await response.json()
// listings[0] → { id, slug, title, price_from, location, ... }`

export default function DeveloperPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-neutral-950 py-24 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />
          <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-primary-600/10 blur-3xl" />
          <div className="absolute -bottom-20 left-0 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>
        <div className="container relative mx-auto max-w-5xl px-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-400">
              REST API v1
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              ✓ Tüm sistemler çalışıyor
            </span>
          </div>
          <h1 className="mb-6 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Seyahat Verilerini<br />
            <span className="bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">
              API ile Entegre Edin
            </span>
          </h1>
          <p className="mb-10 max-w-2xl text-lg text-neutral-400">
            Tur, otel, yat, uçuş ve daha fazlası — tek bir REST API ile uygulamanıza entegre edin.
            Kapsamlı dökümantasyon, SDK&apos;lar ve sandbox ortamı ile dakikalar içinde başlayın.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="#basvuru"
              className="flex items-center gap-2 rounded-2xl bg-primary-600 px-7 py-3.5 text-sm font-bold transition hover:bg-primary-500"
            >
              <Terminal className="h-4 w-4" />
              Ücretsiz API Key Al
            </a>
            <a
              href="#endpoints"
              className="flex items-center gap-2 rounded-2xl border border-white/10 px-7 py-3.5 text-sm font-medium backdrop-blur-sm transition hover:bg-white/5"
            >
              <BookOpen className="h-4 w-4" />
              Dökümantasyon
            </a>
          </div>

          {/* Code preview */}
          <div className="mt-14 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-500/60" />
                <span className="h-3 w-3 rounded-full bg-amber-500/60" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/60" />
              </div>
              <span className="text-xs text-neutral-400">Hızlı Başlangıç</span>
            </div>
            <pre className="overflow-x-auto p-5 text-sm text-neutral-300">
              <code>{CODE_SAMPLE}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ── Rakamlar ───────────────────────────────────────────────────── */}
      <section className="border-b border-neutral-100 bg-neutral-50 py-10 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { v: '50ms', l: 'Ortalama yanıt süresi' },
              { v: '99.9%', l: 'Uptime SLA' },
              { v: '12K+', l: 'Aktif ilan' },
              { v: '500+', l: 'Destinasyon' },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <p className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">{s.v}</p>
                <p className="mt-1 text-xs text-neutral-500">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Özellikler ─────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">API Özellikleri</h2>
            <p className="mt-3 text-neutral-500 dark:text-neutral-400">
              Profesyonel seyahat uygulamaları için ihtiyacınız olan her şey
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.bg}`}>
                  <f.icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <h3 className="mb-2 font-semibold text-neutral-900 dark:text-white">{f.title}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Endpoint referans ──────────────────────────────────────────── */}
      <section id="endpoints" className="bg-neutral-50 py-20 dark:bg-neutral-900">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">API Referansı</h2>
            <p className="mt-3 text-neutral-500 dark:text-neutral-400">
              Temel endpoint&apos;ler — tam dökümantasyon için Swagger UI açın
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
            <div className="border-b border-neutral-100 px-5 py-3 dark:border-neutral-700">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Base URL: <code className="text-primary-600 dark:text-primary-400">https://api.seyahat.com</code>
              </span>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {ENDPOINTS.map((ep) => (
                <div key={ep.path} className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-neutral-50 dark:hover:bg-neutral-700/40">
                  <span className={`shrink-0 rounded-md px-2.5 py-0.5 text-xs font-bold font-mono ${METHOD_COLORS[ep.method]}`}>
                    {ep.method}
                  </span>
                  <code className="flex-1 text-sm text-neutral-700 dark:text-neutral-300 font-mono">
                    {ep.path}
                  </code>
                  <span className="hidden text-sm text-neutral-500 sm:block">{ep.desc}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-neutral-100 px-5 py-3 dark:border-neutral-700">
              <a href="#basvuru" className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline">
                Tam dökümantasyona erişin <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Planlar ────────────────────────────────────────────────────── */}
      <section id="planlar" className="py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">API Planları</h2>
            <p className="mt-3 text-neutral-500 dark:text-neutral-400">
              Sandbox&apos;la ücretsiz başlayın, ihtiyaçlarınız büyüdükçe yükseltin
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={[
                  'relative flex flex-col rounded-2xl border p-5',
                  plan.highlighted
                    ? 'border-primary-500 bg-primary-600 text-white shadow-xl shadow-primary-500/20'
                    : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900',
                ].join(' ')}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
                      Önerilen
                    </span>
                  </div>
                )}
                <h3 className={`font-bold ${plan.highlighted ? 'text-white' : 'text-neutral-900 dark:text-white'}`}>
                  {plan.name}
                </h3>
                <div className="mt-1 flex items-end gap-1">
                  <span className={`text-2xl font-extrabold ${plan.highlighted ? 'text-white' : 'text-neutral-900 dark:text-white'}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`mb-0.5 text-xs ${plan.highlighted ? 'text-white/70' : 'text-neutral-500'}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className={`mt-1 mb-4 text-xs ${plan.highlighted ? 'text-white/70' : 'text-neutral-500 dark:text-neutral-400'}`}>
                  {plan.desc}
                </p>
                <ul className="mb-5 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${plan.highlighted ? 'text-yellow-300' : 'text-primary-500'}`} />
                      <span className={plan.highlighted ? 'text-white/90' : 'text-neutral-600 dark:text-neutral-300'}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#basvuru"
                  className={[
                    'block rounded-xl py-2 text-center text-xs font-semibold transition',
                    plan.highlighted
                      ? 'bg-white text-primary-700 hover:bg-yellow-50'
                      : 'border border-primary-500 text-primary-600 hover:bg-primary-50 dark:border-primary-600 dark:text-primary-400',
                  ].join(' ')}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Başvuru ────────────────────────────────────────────────────── */}
      <section id="basvuru" className="bg-neutral-50 py-20 dark:bg-neutral-900">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">API Erişimi Talep Edin</h2>
            <p className="mt-3 text-neutral-500 dark:text-neutral-400">
              Sandbox key anında, prodüksiyon key 1 iş günü içinde iletilir.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    placeholder="Ahmet Yılmaz"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Şirket / Proje Adı *
                  </label>
                  <input
                    type="text"
                    placeholder="TechTravel A.Ş."
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  İş E-postası *
                </label>
                <input
                  type="email"
                  placeholder="developer@sirket.com"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Entegrasyon Tipi *
                </label>
                <select className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
                  <option>Web uygulaması</option>
                  <option>Mobil uygulama</option>
                  <option>OTA / B2B platform</option>
                  <option>Acente yönetim sistemi</option>
                  <option>Diğer</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Hangi verileri kullanacaksınız?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['İlan arama', 'Rezervasyon', 'Müsaitlik', 'Fiyat', 'Fotoğraflar', 'Webhook'].map((s) => (
                    <label key={s} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <input type="checkbox" className="rounded border-neutral-300 text-primary-500 focus:ring-primary-500" />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Proje Açıklaması
                </label>
                <textarea
                  rows={3}
                  placeholder="API'yi nasıl kullanmayı planladığınızı kısaca açıklayın..."
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
              </div>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              >
                <Terminal className="h-4 w-4" />
                API Key Talep Et
              </button>
              <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Sandbox key&apos;iniz anında, prodüksiyon key&apos;iniz ise proje incelemesinden sonra e-posta ile iletilir.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA bottom ─────────────────────────────────────────────────── */}
      <section className="border-t border-neutral-100 bg-white py-16 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                Teknik sorularınız mı var?
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                developer@seyahat.com adresinden bize yazın.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:developer@seyahat.com"
                className="flex items-center gap-2 rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300"
              >
                <Mail className="h-4 w-4" />
                E-posta Gönder
              </a>
              <a
                href="#basvuru"
                className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-500"
              >
                <Code2 className="h-4 w-4" />
                Hemen Başla
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
