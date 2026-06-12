'use client'

import { useRegisterVitrinOverlay, vitrinOverlayDialogClassName } from '@/components/aside/aside'
import { getSitePublicConfig, mergeBrandingIntoEnvContact } from '@/lib/site-public-config'
import { ensureTawkScriptLoaded, isTawkConfigured, openTawkWidget, setTawkRuntimeConfig } from '@/lib/tawk-widget'
import { getSitePublicConfig as fetchSitePublicConfig } from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import clsx from 'clsx'
import { ChevronRight, Headset, MessageCircle, Sparkles } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  locale: string
}

function CustomerSupportBadge({
  className,
  iconClassName = 'size-7',
}: {
  className?: string
  iconClassName?: string
}) {
  return (
    <span
      className={clsx(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/30',
        className,
      )}
    >
      <Headset className={iconClassName} strokeWidth={2} aria-hidden />
    </span>
  )
}

function SupportOptionIcon({
  tone,
  children,
}: {
  tone: 'ai' | 'live' | 'wa'
  children: ReactNode
}) {
  return (
    <span
      className={clsx(
        'flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/5',
        tone === 'ai' &&
          'bg-gradient-to-br from-primary-500 to-primary-700 text-white dark:from-primary-400 dark:to-primary-600',
        tone === 'live' &&
          'bg-gradient-to-br from-sky-500 to-blue-600 text-white',
        tone === 'wa' && 'bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white',
      )}
    >
      {children}
    </span>
  )
}

export default function FooterCustomerSupportSheet({ open, onClose, locale }: Props) {
  const bn = getMessages(locale).mobile.bottomNav
  useRegisterVitrinOverlay(open)

  const [whatsappE164, setWhatsappE164] = useState(() => getSitePublicConfig().whatsappE164)
  const [tawkReady, setTawkReady] = useState(() => isTawkConfigured())

  useEffect(() => {
    let cancelled = false
    void fetchSitePublicConfig(undefined)
      .then((pub) => {
        if (cancelled) return
        setTawkRuntimeConfig(pub.branding ?? null)
        setTawkReady(isTawkConfigured())
        setWhatsappE164(
          mergeBrandingIntoEnvContact(getSitePublicConfig(), pub.branding).whatsappE164,
        )
        if (isTawkConfigured()) void ensureTawkScriptLoaded()
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  function openAiAssistant() {
    onClose()
    window.dispatchEvent(new CustomEvent('open-concierge-chat'))
  }

  async function openTawkLive() {
    onClose()
    await ensureTawkScriptLoaded()
    openTawkWidget()
  }

  function openWhatsapp() {
    if (!whatsappE164) return
    onClose()
    window.open(`https://wa.me/${whatsappE164}`, '_blank', 'noopener,noreferrer')
  }

  const items = [
    {
      key: 'ai',
      label: bn.supportAiAssistant,
      onClick: openAiAssistant,
      tone: 'ai' as const,
      icon: <Sparkles className="size-5" strokeWidth={1.75} />,
      show: true,
    },
    {
      key: 'tawk',
      label: bn.supportTawkLive,
      onClick: () => void openTawkLive(),
      tone: 'live' as const,
      icon: <MessageCircle className="size-5" strokeWidth={1.75} />,
      show: tawkReady,
    },
    {
      key: 'wa',
      label: bn.supportWhatsapp,
      onClick: openWhatsapp,
      tone: 'wa' as const,
      icon: (
        <svg aria-hidden className="size-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      show: !!whatsappE164,
    },
  ].filter((item) => item.show)

  return (
    <Dialog open={open} onClose={onClose} className={vitrinOverlayDialogClassName}>
      <DialogBackdrop className="fixed inset-0 bg-neutral-950/50 backdrop-blur-[2px] duration-300 ease-out data-closed:opacity-0" />
      <div className="fixed inset-x-0 bottom-0 flex justify-center pb-above-mobile-nav lg:hidden">
        <DialogPanel
          transition
          className="w-full max-w-lg overflow-hidden rounded-t-[1.75rem] bg-white/95 shadow-[0_-12px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-xl duration-300 ease-out data-closed:translate-y-10 data-closed:opacity-0 dark:bg-neutral-900/95 dark:ring-white/10"
        >
          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-neutral-300/80 dark:bg-neutral-600" />

          <div className="border-b border-neutral-100 px-5 pb-4 pt-4 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <CustomerSupportBadge className="size-10 shadow-md" iconClassName="size-5" />
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
                  {bn.supportMenuTitle}
                </DialogTitle>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {bn.supportMenuSubtitle}
                </p>
              </div>
            </div>
          </div>

          <ul className="space-y-2 px-4 py-4">
            {items.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={item.onClick}
                  className={clsx(
                    'group flex w-full items-center gap-3.5 rounded-2xl px-3 py-3.5 text-start transition-all',
                    'bg-neutral-50/90 hover:bg-neutral-100 active:scale-[0.99]',
                    'dark:bg-neutral-800/60 dark:hover:bg-neutral-800',
                  )}
                >
                  <SupportOptionIcon tone={item.tone}>{item.icon}</SupportOptionIcon>
                  <span className="min-w-0 flex-1 text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-white">
                    {item.label}
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-300"
                    strokeWidth={2}
                  />
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl py-2.5 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              {bn.supportClose}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

/** Destek menüsü — footer orta FAB (marka gradyanı + kulaklık ikonu) */
export function FooterCustomerSupportButton({
  onClick,
  ariaLabel,
}: {
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="relative -mt-4 shrink-0 touch-manipulation cursor-pointer transition-transform hover:scale-[1.04] active:scale-95"
    >
      <CustomerSupportBadge
        className="h-[3.35rem] w-[3.35rem] shadow-[0_8px_22px_rgba(79,70,229,0.42)] ring-[3px] ring-white dark:ring-neutral-950"
        iconClassName="size-7"
      />
    </button>
  )
}
