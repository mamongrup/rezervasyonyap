'use client'

import { useState } from 'react'
import Image from 'next/image'
import subscribeImg from '@/images/svg-subcribe-2.png'
import { ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

interface NewsletterConfig {
  title?: string
  description?: string
  buttonText?: string
  bullets?: string[]
  imageUrl?: string
  /** gradient prop — artık kullanılmıyor ama geriye dönük uyumluluk için tutuldu */
  gradient?: string
}

const DEFAULT_BULLETS: { label: string; color: string }[] = [
  { label: 'Özel indirim ve kampanyalara ilk sen ulaş', color: 'bg-blue-100 text-blue-600' },
  { label: 'Premium fırsatları kaçırma',                color: 'bg-rose-100 text-rose-500' },
  { label: 'Sonsuz seyahat ilhamı al',                  color: 'bg-teal-100 text-teal-600' },
]

export default function NewsletterModule({ config }: { config: NewsletterConfig }) {
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const rawBullets = config.bullets ?? null
  const bullets = rawBullets
    ? rawBullets.map((label, i) => ({ label, color: DEFAULT_BULLETS[i]?.color ?? DEFAULT_BULLETS[0].color }))
    : DEFAULT_BULLETS

  const customImageUrl = config.imageUrl ?? null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (res.ok) {
        setStatus('success')
        setEmail('')
      } else {
        setStatus('error')
        setErrorMsg(data.error ?? 'Gönderilemedi. Lütfen tekrar deneyin.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Bağlantı hatası. Lütfen tekrar deneyin.')
    }
  }

  return (
    <div className="relative flex flex-col lg:flex-row lg:items-center">
      {/* ── Sol: metin + form ── */}
      <div className="mb-10 shrink-0 lg:me-10 lg:mb-0 lg:w-2/5">
        <h2 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
          {config.title ?? 'Bültenimize Katılın'}{' '}
          <span className="ml-1">🎉</span>
        </h2>
        <p className="mt-5 text-neutral-600 dark:text-neutral-400">
          {config.description ??
            'Özel kampanyalar, son dakika fırsatları ve seyahat ilhamını doğrudan gelen kutunuza alın.'}
        </p>

        {/* Numaralı maddeler */}
        <ul className="mt-10 space-y-4">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-center gap-4">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${b.color}`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{b.label}</span>
            </li>
          ))}
        </ul>

        {/* Form */}
        {status === 'success' ? (
          <div className="mt-10 flex items-center gap-2 text-green-600 dark:text-green-400">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Teşekkürler! Sizi listeye ekledik.</span>
          </div>
        ) : (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="relative mt-10 max-w-sm"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
              placeholder="E-posta adresinizi girin"
              className="h-12 w-full rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm text-neutral-700 placeholder:text-neutral-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder:text-neutral-500"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              aria-label={config.buttonText ?? 'Abone Ol'}
              className="absolute end-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-900 text-white transition hover:bg-neutral-700 disabled:opacity-60 dark:bg-primary-500 dark:hover:bg-primary-400"
            >
              {status === 'loading' ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} />
              )}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="mt-2 text-sm text-red-500">{errorMsg}</p>
        )}
      </div>

      {/* ── Sağ: illüstrasyon ── */}
      <div className="grow">
        {customImageUrl ? (
          <div className="relative h-72 w-full overflow-hidden rounded-2xl lg:h-96">
            <Image src={customImageUrl} alt="Bülten" fill className="object-cover object-center" sizes="50vw" />
          </div>
        ) : (
          <Image src={subscribeImg} alt="Bültenimize katılın" className="w-full" />
        )}
      </div>
    </div>
  )
}
