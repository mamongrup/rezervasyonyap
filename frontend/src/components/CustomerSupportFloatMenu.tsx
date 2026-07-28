'use client'

import { useFloatingWidgetsSuppressed } from '@/components/aside/aside'
import { DeskPhoneBadge } from '@/components/DeskPhoneBadge'
import { phoneToTelHref, resolveDisplayPhone } from '@/lib/site-phone'
import { getSitePublicConfig, mergeBrandingIntoEnvContact } from '@/lib/site-public-config'
import {
  ensureTawkScriptLoaded,
  hideTawkWidget,
  isTawkConfigured,
  openTawkWidget,
  setTawkRuntimeConfig,
  syncTawkCurrentPage,
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
  const [phoneDisplay, setPhoneDisplay] = useState(() => resolveDisplayPhone(getSitePublicConfig().phone))
  const [tawkReady, setTawkReady] = useState(() => isTawkConfigured())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hideOnManage) {
      hideTawkWidget()
      return
    }
    let cancelled = false
    // LCP / PSI: tawk embed (lab’de sık 403) ilk boyayı kirletmesin.
    // İzleme için idle + uzun gecikme; kullanıcı “Canlı Destek”e basınca hemen yüklenir.
    let warmTimer: ReturnType<typeof setTimeout> | undefined
    let idleId: number | undefined
    void fetchSitePublicConfig(undefined)
      .then((pub) => {
        if (cancelled) return
        setTawkRuntimeConfig(pub.branding ?? null)
        const ready = isTawkConfigured()
        setTawkReady(ready)
        const merged = mergeBrandingIntoEnvContact(getSitePublicConfig(), pub.branding)
        setWhatsapp(merged.whatsappE164)
        setPhoneDisplay(resolveDisplayPhone(merged.phone))
        if (!ready) return
        const warm = () => {
          if (cancelled) return
          void ensureTawkScriptLoaded()
        }
        const scheduleWarm = () => {
          warmTimer = setTimeout(warm, 8000)
        }
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          idleId = window.requestIdleCallback(scheduleWarm, { timeout: 12000 })
        } else {
          scheduleWarm()
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (warmTimer) clearTimeout(warmTimer)
      if (idleId != null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      }
    }
  }, [hideOnManage])

  // Soft navigate: Monitoring — debounce (çift setAttributes main-thread kasması)
  useEffect(() => {
    if (hideOnManage || !tawkReady) return
    if (typeof window === 'undefined' || !window.Tawk_API?.setAttributes) return
    const id = window.setTimeout(() => syncTawkCurrentPage(), 400)
    return () => window.clearTimeout(id)
  }, [pathname, hideOnManage, tawkReady])

  // Overlay: body MutationObserver soft-nav DOM churn’ünde ana iş parçacığını
  // kilitlemesin — kısa zaman aşımı ile birleştir.
  useEffect(() => {
    let timer = 0
    const detectOverlay = () => {
      if (timer) return
      timer = window.setTimeout(() => {
        timer = 0
        const active = Boolean(
          document.querySelector(
            '[role="dialog"], .react-datepicker-popper, [data-vitrin-overlay="true"]',
          ),
        )
        setPageOverlayOpen(active)
        if (active) setOpen(false)
      }, 120)
    }
    detectOverlay()
    const observer = new MutationObserver(detectOverlay)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (hideOnManage || suppressed || pageOverlayOpen) return null

  const phoneTel = phoneToTelHref(phoneDisplay)

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
          {phoneTel ? (
            <a
              href={phoneTel}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
            >
              <DeskPhoneBadge className="size-10 rounded-xl" iconClassName="size-5" />
              {phoneDisplay}
            </a>
          ) : null}
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
