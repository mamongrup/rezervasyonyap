'use client'

import SectionSubscribe2 from '@/components/SectionSubscribe2'
import { getSitePublicConfig, mergeBrandingIntoEnvContact } from '@/lib/site-public-config'
import { buildSocialLinksFromSiteConfig } from '@/lib/site-social-links'
import {
  createSupportChatSession,
  getSitePublicConfig as fetchSitePublicConfig,
  postSupportChatMessage,
} from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import SocialsList from '@/shared/SocialsList'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function PageContact() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const T = getMessages(locale).contactPage

  const [contactCfg, setContactCfg] = useState(() => getSitePublicConfig())
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchSitePublicConfig(undefined)
      .then((pub) => {
        if (!cancelled) {
          setContactCfg(mergeBrandingIntoEnvContact(getSitePublicConfig(), pub.branding))
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const c = contactCfg
  const info: { title: string; description: string; href?: string }[] = []
  if (c.address) info.push({ title: T.addressLabel, description: c.address })
  if (c.email) info.push({ title: T.emailLabel, description: c.email, href: `mailto:${c.email}` })
  if (c.phone) info.push({ title: T.phoneLabel, description: c.phone, href: `tel:${c.phone.replace(/\s/g, '')}` })
  if (info.length === 0) {
    info.push(
      { title: T.addressLabel, description: '—' },
      { title: T.emailLabel, description: c.email || '—' },
      { title: T.phoneLabel, description: c.phone || '—' },
    )
  }

  const socials = buildSocialLinksFromSiteConfig(c)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) return
    setError(null)
    setPending(true)
    try {
      const session = await createSupportChatSession({ channel_code: 'contact' })
      await postSupportChatMessage(session.id, {
        body: `Ad: ${name.trim()}\nE-posta: ${email.trim()}\n\n${message.trim()}`,
      })
      setSent(true)
    } catch {
      setError(T.errorMessage)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="pt-10 pb-24 sm:py-24 lg:py-32">
      <div className="container mx-auto max-w-7xl">
        <div className="grid shrink-0 grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2">
          {/* Sol */}
          <div>
            <h1 className="max-w-2xl text-4xl font-semibold sm:text-5xl">{T.pageTitle}</h1>
            <div className="mt-10 flex max-w-sm flex-col gap-y-8 sm:mt-20">
              {info.map((item, index) => (
                <div key={index}>
                  <h3 className="text-sm font-semibold tracking-wider uppercase dark:text-neutral-200">{item.title}</h3>
                  {item.href ? (
                    <a href={item.href} className="mt-2 block text-neutral-500 hover:underline dark:text-neutral-400">
                      {item.description}
                    </a>
                  ) : (
                    <span className="mt-2 block whitespace-pre-line text-neutral-500 dark:text-neutral-400">
                      {item.description}
                    </span>
                  )}
                </div>
              ))}
              <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase dark:text-neutral-200">{T.socialLabel}</h3>
                <SocialsList className="mt-2" socials={socials} />
              </div>
            </div>
          </div>

          {/* Sağ */}
          <div>
            {sent ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 rounded-3xl border border-green-200 bg-green-50 p-10 text-center dark:border-green-800 dark:bg-green-900/20">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">{T.successTitle}</h2>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {T.successMessage.replace('{email}', email)}
                </p>
                <button
                  onClick={() => { setSent(false); setName(''); setEmail(''); setMessage('') }}
                  className="text-sm font-medium text-primary-600 underline dark:text-primary-400"
                >
                  {T.sendAnother}
                </button>
              </div>
            ) : (
              <form className="grid grid-cols-1 gap-6" onSubmit={onSubmit}>
                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
                    {error}
                  </p>
                )}
                <div className="block">
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">{T.nameLabel}</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder={T.namePlaceholder}
                    className="mt-1 block w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm focus:border-primary-300 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
                <div className="block">
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">{T.emailInputLabel}</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder={T.emailPlaceholder}
                    className="mt-1 block w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm focus:border-primary-300 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
                <div className="block">
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">{T.messageLabel}</label>
                  <textarea required rows={6} value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder={T.messagePlaceholder}
                    className="mt-1 block w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm focus:border-primary-300 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <ButtonPrimary type="submit" disabled={pending}>
                    {pending ? T.sending : T.submitButton}
                  </ButtonPrimary>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="container mt-20 lg:mt-32">
        <Divider />
        <SectionSubscribe2 className="mt-20 lg:mt-32" />
      </div>
    </div>
  )
}
