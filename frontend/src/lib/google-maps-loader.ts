/**
 * Singleton Google Maps script loader.
 * Both MapPicker and PlacesAutocompleteInput use this — guarantees the
 * script is only injected once regardless of how many components mount.
 */

declare global {
  interface Window {
    google?: any
    __gmapsInitCallback?: () => void
    gm_authFailure?: () => void
  }
}

let scriptLoaded = false
let scriptLoading = false
let authFailed = false
const readyCallbacks: (() => void)[] = []
const authFailListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.gm_authFailure = () => {
    authFailed = true
    scriptLoading = false
    authFailListeners.forEach((fn) => fn())
    authFailListeners.clear()
  }
}

export function loadGoogleMaps(apiKey: string, onReady: () => void, onAuthFail?: () => void): void {
  if (typeof window === 'undefined') return

  if (onAuthFail) authFailListeners.add(onAuthFail)

  if (authFailed) {
    onAuthFail?.()
    return
  }
  if (scriptLoaded) {
    onReady()
    return
  }

  readyCallbacks.push(onReady)
  if (scriptLoading) return

  scriptLoading = true
  window.__gmapsInitCallback = () => {
    scriptLoaded = true
    scriptLoading = false
    readyCallbacks.forEach((fn) => fn())
    readyCallbacks.length = 0
  }

  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=__gmapsInitCallback`
  script.async = true
  script.defer = true
  script.onerror = () => {
    authFailed = true
    scriptLoading = false
    authFailListeners.forEach((fn) => fn())
    authFailListeners.clear()
  }
  document.head.appendChild(script)
}

export function isGoogleMapsAuthFailed(): boolean {
  return authFailed
}

export function isGoogleMapsLoaded(): boolean {
  return scriptLoaded
}

export function onGoogleMapsAuthFail(fn: () => void): () => void {
  if (authFailed) { fn(); return () => undefined }
  authFailListeners.add(fn)
  return () => authFailListeners.delete(fn)
}
