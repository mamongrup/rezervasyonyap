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
export function setTawkRuntimeConfig(
  branding: Record<string, unknown> | null | undefined,
): void {
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

/** Tawk.to widget'ını aç / büyüt */
export function openTawkWidget(): void {
  if (typeof window === 'undefined') return
  openRequested = true
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

/** Tawk embed script — panelden veya env ile yapılandırıldıysa */
export function ensureTawkScriptLoaded(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  const { propertyId, widgetId } = activeTawkConfig()
  if (!propertyId) return Promise.resolve()

  if (document.getElementById('tawk-embed-script')) {
    return Promise.resolve()
  }

  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve) => {
    window.Tawk_API = window.Tawk_API || {}
    window.Tawk_API.onLoad = () => {
      if (openRequested) {
        window.Tawk_API?.showWidget?.()
        window.Tawk_API?.maximize?.()
      } else {
        window.Tawk_API?.hideWidget?.()
      }
    }
    window.Tawk_API.onChatMinimized = () => {
      openRequested = false
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
