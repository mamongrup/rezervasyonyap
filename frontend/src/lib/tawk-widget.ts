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
    document.getElementById('tawk-embed-script')?.remove()
  }
}

export function isTawkConfigured(): boolean {
  return activeTawkConfig().propertyId !== ''
}

/**
 * Tawk kendi balonunu (launcher) varsayılan gösterir; biz kendi birleşik destek
 * menümüzü kullandığımız için balon ASLA görünmemeli — yalnız ziyaretçi izleme
 * için gizli yüklenir. `hideWidget()` çağrısı ile onLoad arası kısa "flash"ı
 * önlemek için Tawk konteynerini CSS ile gizleriz; yalnız `html.tawk-open`
 * sınıfı varken (kullanıcı "Canlı Destek"e bastığında) görünür.
 */
function injectTawkHideStyle(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById('tawk-hide-style')) return
  const style = document.createElement('style')
  style.id = 'tawk-hide-style'
  style.textContent = `
    html:not(.tawk-open) #tawkchat-container,
    html:not(.tawk-open) #tawkchat-minified-container,
    html:not(.tawk-open) .tawkchat-container,
    html:not(.tawk-open) iframe[title="chat widget"],
    html:not(.tawk-open) iframe[title*="tawk" i] {
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `
  document.head.appendChild(style)
}

function setTawkOpenClass(open: boolean): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('tawk-open', open)
}

/** Tawk.to widget'ını aç / büyüt */
export function openTawkWidget(): void {
  if (typeof window === 'undefined') return
  openRequested = true
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
  window.Tawk_API?.hideWidget?.()
}

/** Tawk embed script — panelden veya env ile yapılandırıldıysa */
export function ensureTawkScriptLoaded(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  const { propertyId, widgetId } = activeTawkConfig()
  if (!propertyId) return Promise.resolve()

  if (document.getElementById('tawk-embed-script')) {
    return Promise.resolve()
  }

  if (loadPromise) return loadPromise

  // Balon flash'ını önlemek için script yüklenmeden önce gizleme CSS'ini ekle.
  injectTawkHideStyle()

  loadPromise = new Promise((resolve) => {
    window.Tawk_API = window.Tawk_API || {}
    window.Tawk_API.onLoad = () => {
      if (openRequested) {
        setTawkOpenClass(true)
        window.Tawk_API?.showWidget?.()
        window.Tawk_API?.maximize?.()
      } else {
        // Gizli yüklendi: balon görünmesin, yalnız ziyaretçi izleme aktif olsun.
        setTawkOpenClass(false)
        window.Tawk_API?.hideWidget?.()
      }
    }
    window.Tawk_API.onChatMinimized = () => {
      openRequested = false
      setTawkOpenClass(false)
      window.Tawk_API?.hideWidget?.()
    }
    window.Tawk_LoadStart = new Date()
    const s = document.createElement('script')
    s.id = 'tawk-embed-script'
    s.async = true
    s.src = `https://embed.tawk.to/${propertyId}/${widgetId}`
    s.charset = 'UTF-8'
    s.setAttribute('crossorigin', '*')
    s.onload = () => resolve()
    s.onerror = () => resolve()
    document.body.appendChild(s)
    window.setTimeout(resolve, 2500)
  })

  return loadPromise
}
