'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { createSupportChatSession, postSupportChatMessage } from '@/lib/travel-api'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getMessages } from '@/utils/getT'
import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'

const INPUT_CLS =
  'w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'

export default function AcenteOlForm() {
  const params = useParams()
  const vitrinPath = useVitrinHref()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const T = getMessages(locale).agencyPage

  const [businessName, setBusinessName] = useState('')
  const [tursabNo, setTursabNo] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleService(s: string) {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessName.trim() || !contactName.trim() || !email.trim()) return
    setError(null)
    setPending(true)
    try {
      const token = getStoredAuthToken() ?? undefined
      const session = await createSupportChatSession({ channel_code: 'agency_application' }, token)
      const body = [
        `📋 ACENTE BAŞVURUSU`,
        `${T.businessNameLabel}: ${businessName.trim()}`,
        `${T.tursabLabel}: ${tursabNo.trim() || '—'}`,
        `${T.contactNameLabel}: ${contactName.trim()}`,
        `${T.phoneLabel}: ${phone.trim() || '—'}`,
        `${T.emailLabel}: ${email.trim()}`,
        `${T.servicesLabel}: ${services.length > 0 ? services.join(', ') : '—'}`,
        `${T.notesLabel}: ${notes.trim() || '—'}`,
      ].join('\n')
      await postSupportChatMessage(session.id, { body })
      setSent(true)
    } catch {
      setError(T.errorMessage)
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-10 text-center dark:border-green-800 dark:bg-green-900/20">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" />
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">{T.successTitle}</h3>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          {T.successMessage.replace('{email}', email)}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link
            href={vitrinPath('/')}
            className="rounded-full bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            {T.backHome}
          </Link>
          <button
            onClick={() => {
              setSent(false)
              setBusinessName(''); setTursabNo(''); setContactName('')
              setPhone(''); setEmail(''); setServices([]); setNotes('')
            }}
            className="text-sm font-medium text-neutral-600 underline dark:text-neutral-400"
          >
            {T.newApplication}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{T.businessNameLabel} *</label>
            <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)}
              placeholder={T.businessNamePlaceholder} className={INPUT_CLS} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{T.tursabLabel}</label>
            <input type="text" value={tursabNo} onChange={(e) => setTursabNo(e.target.value)}
              placeholder={T.tursabPlaceholder} className={INPUT_CLS} />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{T.contactNameLabel} *</label>
            <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)}
              placeholder={T.contactNamePlaceholder} className={INPUT_CLS} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{T.phoneLabel}</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder={T.phonePlaceholder} className={INPUT_CLS} />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{T.emailLabel} *</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={T.emailPlaceholder} className={INPUT_CLS} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{T.servicesLabel}</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {T.services.map((s: string) => (
              <label key={s} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <input type="checkbox" checked={services.includes(s)} onChange={() => toggleService(s)}
                  className="rounded border-neutral-300 text-primary-500 focus:ring-primary-500" />
                {s}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{T.notesLabel}</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={T.notesPlaceholder}
            className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />
        </div>
        <button type="submit" disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
        >
          {pending ? T.sending : T.submitButton}
        </button>
      </form>
    </div>
  )
}
