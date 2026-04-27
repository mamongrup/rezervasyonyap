'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PopupItem } from '@/lib/popups-types'
import PopupView from './PopupView'
import {
  audienceMatches,
  isFirstVisit,
  markVisited,
  popupCanShowNow,
  recordDismissForever,
  recordPopupShown,
} from './popup-frequency'
import { pathnameIsAdminLike, popupPageKeyFromPathname } from './popup-page-key'

/**
 * Site geneli popup koordinatörü.
 *
 * - `/api/popups/active` ile sayfa+dile uygun (etkin + takvim aktif) popup'ları çeker
 * - Cihaz, hedef kitle ve sıklık (oturum / ziyaretçi / N gün) kurallarını
 *   istemcide uygular
 * - Tetikleyiciye (load / delay / scroll / exit-intent) göre en yüksek öncelikli
 *   uygun popup'ı tek bir gösterir
 *
 * Yönetim panelinde / login / checkout sayfalarında çalışmaz.
 */
export default function SitePopupsRenderer({ locale }: { locale: string }) {
  const pathname = usePathname() ?? '/'
  const isAdminLike = pathnameIsAdminLike(pathname)
  const pageKey = useMemo(() => popupPageKeyFromPathname(pathname), [pathname])

  const [popups, setPopups] = useState<PopupItem[]>([])
  const [activePopup, setActivePopup] = useState<PopupItem | null>(null)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  /**
   * Bir popup tetiklendiğinde aynı sayfa yüklemesi içinde yenisini denemeyiz —
   * kullanıcıya peş peşe popup açma.
   */
  const triggeredOnceRef = useRef(false)

  // Cihaz tespiti (md breakpoint <768)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setDevice(mq.matches ? 'mobile' : 'desktop')
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Eligible popup listesini sayfa/dile göre çek
  useEffect(() => {
    if (isAdminLike) {
      setPopups([])
      return
    }
    let cancelled = false
    const url = `/api/popups/active?page=${encodeURIComponent(pageKey)}&locale=${encodeURIComponent(locale)}`
    fetch(url)
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then((data: { ok?: boolean; popups?: PopupItem[] }) => {
        if (cancelled) return
        if (data.ok && Array.isArray(data.popups)) setPopups(data.popups)
        else setPopups([])
      })
      .catch(() => {
        if (!cancelled) setPopups([])
      })
    return () => {
      cancelled = true
    }
  }, [isAdminLike, pageKey, locale])

  // İstemci tarafı eligibility filtreleme
  const candidates = useMemo(() => {
    if (popups.length === 0) return []
    return popups.filter((p) => {
      if (p.targeting.device !== 'all' && p.targeting.device !== device) return false
      if (!audienceMatches(p.targeting.audience)) return false
      if (!popupCanShowNow(p)) return false
      return true
    })
  }, [popups, device])

  // En yüksek öncelikli adayı tetikleyiciye göre göster
  useEffect(() => {
    if (candidates.length === 0 || activePopup || isAdminLike) return
    if (triggeredOnceRef.current) return
    const target = candidates[0]
    const cleanup: Array<() => void> = []

    const show = () => {
      if (activePopup || triggeredOnceRef.current) return
      triggeredOnceRef.current = true
      setActivePopup(target)
      recordPopupShown(target)
      markVisited()
    }

    switch (target.trigger.type) {
      case 'load': {
        const ms = Math.max(0, target.trigger.delayMs || 0)
        const t = window.setTimeout(show, ms)
        cleanup.push(() => window.clearTimeout(t))
        break
      }
      case 'delay': {
        const t = window.setTimeout(show, Math.max(500, target.trigger.delayMs))
        cleanup.push(() => window.clearTimeout(t))
        break
      }
      case 'scroll': {
        let scrollRaf = 0
        /** Her scroll’da `scrollHeight` okumak forced reflow üretir; kısa TTL ile önbellekle. */
        let cachedMaxPx = -1
        let cacheAtMs = 0
        const CACHE_MS = 320
        const invalidateMaxScrollCache = () => {
          cachedMaxPx = -1
        }
        const maxScrollPx = (): number => {
          const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
          if (cachedMaxPx < 0 || now - cacheAtMs > CACHE_MS) {
            const doc = document.documentElement
            cachedMaxPx = Math.max(0, (doc.scrollHeight || 0) - (window.innerHeight || 0))
            cacheAtMs = now
          }
          return cachedMaxPx
        }
        const onScroll = () => {
          if (scrollRaf) return
          scrollRaf = window.requestAnimationFrame(() => {
            scrollRaf = 0
            const max = maxScrollPx()
            const ratio = max > 0 ? (window.scrollY / max) * 100 : 0
            if (ratio >= target.trigger.scrollPercent) {
              show()
              window.removeEventListener('scroll', onScroll)
              window.removeEventListener('resize', invalidateMaxScrollCache)
            }
          })
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', invalidateMaxScrollCache, { passive: true })
        cleanup.push(() => {
          window.removeEventListener('scroll', onScroll)
          window.removeEventListener('resize', invalidateMaxScrollCache)
          if (scrollRaf) window.cancelAnimationFrame(scrollRaf)
        })
        break
      }
      case 'exit_intent': {
        const onLeave = (e: MouseEvent) => {
          // Sadece ekranın üst kenarından çıkışta tetikle
          if (e.clientY <= 0) {
            show()
            document.removeEventListener('mouseout', onLeave)
          }
        }
        // Mobilde exit-intent zayıf çalışır → ek olarak 30 sn'lik bir fallback
        document.addEventListener('mouseout', onLeave)
        const t = window.setTimeout(show, 30_000)
        cleanup.push(() => {
          document.removeEventListener('mouseout', onLeave)
          window.clearTimeout(t)
        })
        break
      }
    }

    // İlk ziyaret işaretini ileride first_visit audience kuralı için bırak
    if (isFirstVisit()) {
      // 5 sn sonra "ziyaret edildi" → tek seferlik first_visit popup'ları bir
      // sonraki sayfada returning sayılır
      const t = window.setTimeout(markVisited, 5000)
      cleanup.push(() => window.clearTimeout(t))
    }

    return () => {
      for (const fn of cleanup) fn()
    }
  }, [candidates, activePopup, isAdminLike])

  // Sayfa değişince mevcut popup'ı ve tetik bayrağını sıfırla
  useEffect(() => {
    setActivePopup(null)
    triggeredOnceRef.current = false
  }, [pageKey])

  if (isAdminLike || !activePopup) return null

  return (
    <PopupView
      popup={activePopup}
      locale={locale}
      onClose={() => setActivePopup(null)}
      onDismissForever={() => {
        recordDismissForever(activePopup)
        setActivePopup(null)
      }}
    />
  )
}
