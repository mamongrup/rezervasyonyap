'use client'

import { useFloatingWidgetsSuppressed } from '@/components/aside/aside'
import { getSitePublicConfig, mergeBrandingIntoEnvContact } from '@/lib/site-public-config'
import {
  ensureTawkScriptLoaded,
  hideTawkWidget,
  isTawkConfigured,
  openTawkWidget,
  setTawkRuntimeConfig,
} from '@/lib/tawk-widget'
import { getSitePublicConfig as fetchSitePublicConfig } from '@/lib/travel-api'
import { Headset, MessageCircle, Sparkles, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function CustomerSupportFloatMenu() {
  const pathname = usePathname()
  const hideOnManage = pathname?.includes('/manage')
  const suppressed = useFloatingWidgetsSuppressed()
  const [open, setOpen] = useState(false)
  const [pageOverlayOpen, setPageOverlayOpen] = useState(false)
  const [whatsapp, setWhatsapp] = useState(() => getSitePublicConfig().whatsappE164)
  const [tawkReady, setTawkReady] = useState(() => isTawkConfigured())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hideOnManage) {
      hideTawkWidget()
      return
    }
    let cancelled = false
    void fetchSitePublicConfig(undefined)
      .then((pub) => {
        if (cancelled) return
        setTawkRuntimeConfig(pub.branding ?? null)
        setTawkReady(isTawkConfigured())
        setWhatsapp(mergeBrandingIntoEnvContact(getSitePublicConfig(), pub.branding).whatsappE164)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [hideOnManage])

  // Galeri, rezervasyon tarih/misafir seçicileri ve diğer ikincil ekranlar
  // açıldığında destek düğmesi içerik üzerinde kalmasın. Registry kullanmayan
  // eski dialogları da DOM üzerinden yakalar.
  useEffect(() => {
    const detectOverlay = () => {
      const active = Boolean(
        document.querySelector('[role="dialog"], .react-datepicker-popper, [data-vitrin-overlay="true"]')
      )
      setPageOverlayOpen(active)
      if (active) setOpen(false)
    }
    detectOverlay()
    const observer = new MutationObserver(detectOverlay)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (hideOnManage || suppressed || pageOverlayOpen) return null

  const openAssistant = () => {
    setOpen(false)
    window.dispatchEvent(new CustomEvent('open-concierge-chat'))
  }
  const openLiveSupport = async () => {
    setOpen(false)
    await ensureTawkScriptLoaded()
    openTawkWidget()
  }

  return (
    <div ref={rootRef} className="fixed end-6 bottom-6 z-[101] hidden lg:block">
      {open ? (
        <div className="absolute end-0 bottom-[4.5rem] w-64 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
          <p className="px-3 pt-1 pb-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Nasıl yardımcı olalım?
          </p>
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#25D366] text-white">
                <MessageCircle className="size-5" />
              </span>
              WhatsApp
            </a>
          ) : null}
          {tawkReady ? (
            <button
              type="button"
              onClick={() => void openLiveSupport()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-sky-600 text-white">
                <Headset className="size-5" />
              </span>
              Canlı Destek
            </button>
          ) : null}
          <button
            type="button"
            onClick={openAssistant}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white">
              <Sparkles className="size-5" />
            </span>
            Seyahat Asistanı
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Destek menüsünü kapat' : 'Müşteri hizmetleri'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] ring-2 ring-white/30 transition hover:scale-105 active:scale-95"
      >
        {open ? <X className="size-6" /> : <Headset className="size-7" />}
      </button>
    </div>
  )
}
