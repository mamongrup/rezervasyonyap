import { getTawkConfigFromBranding } from '@/lib/site-public-config'

declare global {
  interface Window {
    Tawk_API?: {
      maximize?: () => void
      toggle?: () => void
      showWidget?: () => void
      hideWidget?: () => void
      onLoad?: () => void
      onChatMinimized?: () => void
      onChatMaximized?: () => void
      onStatusChange?: (status: string) => void
      onUnreadCountChanged?: (count: number) => void
      customStyle?: {
        visibility?: { desktop?: string; mobile?: string; [key: string]: string | undefined }
        [key: string]: unknown
      }
      setAttributes?: (
        attributes: Record<string, string>,
        callback?: (error?: unknown) => void,
      ) => void
      addEvent?: (
        eventName: string,
        metadata?: Record<string, string> | ((error?: unknown) => void),
        callback?: (error?: unknown) => void,
      ) => void
    }
    Tawk_LoadStart?: Date
  }
}

export type TawkRuntimeConfig = {
  propertyId: string
  widgetId: string
}

let runtimeConfig: TawkRuntimeConfig | null = null
let loadPromise: Promise<void> | null = null
let openRequested = false
let tawkReady = false
let tawkFailed = false
let hideTimer: ReturnType<typeof setTimeout> | undefined
let enforceTimer: ReturnType<typeof setInterval> | undefined
let hideObserver: MutationObserver | null = null

/** Tawk property/widget kimliği — bozuk/placeholder değerlerde 403 istek atma */
function isPlausibleTawkId(propertyId: string, widgetId: string): boolean {
  const p = propertyId.trim()
  const w = widgetId.trim()
  if (!p || !w) return false
  // Property: 24 hex (Mongo ObjectId benzeri)
  if (!/^[a-f0-9]{24}$/i.test(p)) return false
  // Widget: "default" veya alfanumerik kısa id
  if (w !== 'default' && !/^[a-z0-9_-]{4,32}$/i.test(w)) return false
  return true
}

function envTawkConfig(): TawkRuntimeConfig {
  return {
    propertyId: (process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID ?? '').trim(),
    widgetId: (process.env.NEXT_PUBLIC_TAWK_WIDGET_ID ?? '').trim() || 'default',
  }
}

function activeTawkConfig(): TawkRuntimeConfig {
  if (runtimeConfig?.propertyId) return runtimeConfig
  return envTawkConfig()
}

/** `/api/v1/site/public-config` branding veya env — vitrin widget yüklemesi */
export function setTawkRuntimeConfig(branding: Record<string, unknown> | null | undefined): void {
  const next = getTawkConfigFromBranding(branding)
  const prev = activeTawkConfig()
  runtimeConfig = next.propertyId ? next : null
  if (prev.propertyId !== next.propertyId || prev.widgetId !== next.widgetId) {
    loadPromise = null
    tawkReady = false
    tawkFailed = false
    stopHideEnforcement()
    document.getElementById('tawk-embed-script')?.remove()
  }
}

export function isTawkConfigured(): boolean {
  const { propertyId, widgetId } = activeTawkConfig()
  return isPlausibleTawkId(propertyId, widgetId)
}

export function isTawkLoadFailed(): boolean {
  return tawkFailed
}

/**
 * Tawk kendi balonunu (launcher) varsayılan gösterir; biz kendi birleşik destek
 * menümüzü kullandığımız için balon ASLA görünmemeli — yalnız ziyaretçi izleme
 * için gizli yüklenir. Okunmamış mesaj / status change Tawk'ı yeniden açabilir;
 * CSS + hideWidget birlikte zorunlu.
 */
function injectTawkHideStyle(): void {
  if (typeof document === 'undefined') return
  const existing = document.getElementById('tawk-hide-style')
  // display:none / off-screen translate TÜM tawk iframe’lerinde socket’i
  // öldürebilir → Monitoring’de ziyaretçi görünmez. Görünür UI’yi gizle;
  // bağlantı iframe’i layout’ta 1×1 kalsın (visibility/opacity).
  const css = `
    /* Kullanıcı «Canlı Destek»e basmadan Tawk balonu yok — Monitoring ping korunur */
    html:not(.tawk-open) #tawkchat-minified-container,
    html:not(.tawk-open) #tawkchat-minified-box,
    html:not(.tawk-open) .tawk-min-container,
    html:not(.tawk-open) .widget-visible,
    html:not(.tawk-open) div[class*="tawk-button"],
    html:not(.tawk-open) div[class*="tawk-min-"] {
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      width: 1px !important;
      height: 1px !important;
      max-width: 1px !important;
      max-height: 1px !important;
      overflow: hidden !important;
      clip: rect(0 0 0 0) !important;
      clip-path: inset(50%) !important;
    }
    html:not(.tawk-open) #tawkchat-container,
    html:not(.tawk-open) .tawkchat-container,
    html:not(.tawk-open) iframe[title="chat widget"],
    html:not(.tawk-open) iframe[title*="tawk" i] {
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `
  if (existing) {
    existing.textContent = css
    return
  }
  const style = document.createElement('style')
  style.id = 'tawk-hide-style'
  style.textContent = css
  document.head.appendChild(style)
}

function setTawkOpenClass(open: boolean): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('tawk-open', open)
}

function enforceHiddenIfClosed(): void {
  if (typeof window === 'undefined') return
  if (openRequested) return
  setTawkOpenClass(false)
  try {
    window.Tawk_API?.hideWidget?.()
  } catch {
    /* ignore */
  }
}

function stopHideEnforcement(): void {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = undefined
  }
  if (enforceTimer) {
    clearInterval(enforceTimer)
    enforceTimer = undefined
  }
  if (hideObserver) {
    hideObserver.disconnect()
    hideObserver = null
  }
}

/** Tawk DOM'a balon eklediğinde / unread ile geri getirdiğinde yeniden gizle. */
function startHideEnforcement(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  stopHideEnforcement()
  enforceHiddenIfClosed()
  // İlk saniyelerde Tawk sıkça launcher'ı yeniden koyar (özellikle unread=1).
  enforceTimer = setInterval(enforceHiddenIfClosed, 400)
  window.setTimeout(() => {
    if (enforceTimer) {
      clearInterval(enforceTimer)
      enforceTimer = undefined
    }
  }, 12_000)

  hideObserver = new MutationObserver(() => {
    if (openRequested) return
    enforceHiddenIfClosed()
  })
  hideObserver.observe(document.body, { childList: true, subtree: true })
  // Observer uzun süre main-thread yükü yaratmasın — 20 sn sonra bırak.
  window.setTimeout(() => {
    hideObserver?.disconnect()
    hideObserver = null
  }, 20_000)
}

function sanitizeTawkAttrValue(raw: string): string {
  const t = raw.trim()
  if (!t) return '-'
  return t.length > 255 ? t.slice(0, 255) : t
}

/**
 * Monitoring / ziyaretçi kartında görünen sayfa bilgisi.
 * Next App Router soft navigate’te Tawk URL’yi otomatik güncellemez —
 * her rota değişiminde attribute + event gönderilir.
 */
export function syncTawkCurrentPage(): void {
  if (typeof window === 'undefined') return
  const api = window.Tawk_API
  if (!api || (!api.setAttributes && !api.addEvent)) return

  const href = sanitizeTawkAttrValue(window.location.href)
  const path = sanitizeTawkAttrValue(window.location.pathname + window.location.search)
  const title = sanitizeTawkAttrValue(document.title || path)

  api.setAttributes?.(
    {
      'page-url': href,
      'page-path': path,
      'page-title': title,
    },
    () => {},
  )

  if (typeof api.addEvent === 'function') {
    try {
      api.addEvent(
        'page-view',
        {
          'page-url': href,
          'page-path': path,
          'page-title': title,
        },
        () => {},
      )
    } catch {
      /* ignore */
    }
  }
}

/** Tawk.to widget'ını aç / büyüt */
export function openTawkWidget(): void {
  if (typeof window === 'undefined') return
  openRequested = true
  stopHideEnforcement()
  setTawkOpenClass(true)
  const api = window.Tawk_API
  api?.showWidget?.()
  if (api?.maximize) {
    api.maximize()
    return
  }
  if (api?.toggle) {
    api.toggle()
    return
  }
  api?.showWidget?.()
}

/** Yönetim ekranlarında veya rota değişiminde yerel destek düğmesi dışında kalan Tawk arayüzünü gizle. */
export function hideTawkWidget(): void {
  if (typeof window === 'undefined') return
  openRequested = false
  setTawkOpenClass(false)
  try {
    window.Tawk_API?.hideWidget?.()
  } catch {
    /* ignore */
  }
}

/** Tawk embed script — panelden veya env ile yapılandırıldıysa */
export function ensureTawkScriptLoaded(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  const { propertyId, widgetId } = activeTawkConfig()
  if (!isPlausibleTawkId(propertyId, widgetId)) return Promise.resolve()
  if (tawkFailed) return Promise.resolve()

  if (document.getElementById('tawk-embed-script')) {
    if (tawkReady) {
      syncTawkCurrentPage()
      if (!openRequested) enforceHiddenIfClosed()
    }
    return loadPromise ?? Promise.resolve()
  }

  if (loadPromise) return loadPromise

  // Balon flash'ını önlemek için script yüklenmeden önce gizleme CSS'ini ekle.
  injectTawkHideStyle()

  loadPromise = new Promise((resolve) => {
    window.Tawk_API = window.Tawk_API || {}
    // Tawk kendi launcher'ını masaüstü/mobilde varsayılan gizli tutsun.
    window.Tawk_API.customStyle = {
      ...(window.Tawk_API.customStyle ?? {}),
      visibility: {
        desktop: 'hidden',
        mobile: 'hidden',
        ...(window.Tawk_API.customStyle?.visibility ?? {}),
      },
    }

    const prevOnLoad = window.Tawk_API.onLoad
    window.Tawk_API.onLoad = () => {
      tawkReady = true
      tawkFailed = false
      // Socket hazır olmadan setAttributes sessizce düşebiliyor — kısa gecikme.
      window.setTimeout(() => syncTawkCurrentPage(), 400)
      window.setTimeout(() => syncTawkCurrentPage(), 2000)
      if (openRequested) {
        setTawkOpenClass(true)
        window.Tawk_API?.showWidget?.()
        window.Tawk_API?.maximize?.()
      } else {
        // Monitoring ping için script yüklü kalır; UI hemen ve sürekli gizli.
        startHideEnforcement()
      }
      if (typeof prevOnLoad === 'function') {
        try {
          prevOnLoad()
        } catch {
          /* ignore */
        }
      }
    }
    window.Tawk_API.onChatMinimized = () => {
      openRequested = false
      setTawkOpenClass(false)
      startHideEnforcement()
    }
    window.Tawk_API.onUnreadCountChanged = () => {
      // Okunmamış mesaj Tawk balonunu zorla açar — kullanıcı istemediyse kapat.
      if (!openRequested) enforceHiddenIfClosed()
    }
    window.Tawk_API.onStatusChange = () => {
      if (!openRequested) enforceHiddenIfClosed()
    }
    window.Tawk_LoadStart = new Date()
    const s = document.createElement('script')
    s.id = 'tawk-embed-script'
    s.async = true
    s.defer = true
    s.src = `https://embed.tawk.to/${propertyId}/${widgetId}`
    s.charset = 'UTF-8'
    s.onload = () => resolve()
    s.onerror = () => {
      // Cloudflare/yanlış id → 403; tekrar deneme PSI ve ağ gürültüsü üretir
      tawkFailed = true
      loadPromise = null
      s.remove()
      resolve()
    }
    document.body.appendChild(s)
    window.setTimeout(() => {
      if (!tawkReady && !tawkFailed) {
        // onLoad gelmediyse (403 HTML gövdesi script sayılırsa) sessizce bırak
        resolve()
      }
    }, 4000)
  })

  return loadPromise
}
