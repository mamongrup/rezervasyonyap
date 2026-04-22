'use client'

import { getTranslationBundle } from '@/lib/travel-api'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

/** API bazen düz `nav.admin` anahtarları, bazen `{ nav: { admin: "..." } }` döndürebilir — ikisini de destekle */
function flattenNamespaceStrings(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') {
      out[key] = v
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenNamespaceStrings(v, key))
    }
  }
  return out
}

type ManageI18nContextValue = {
  t: (key: string) => string
  ready: boolean
}

const ManageI18nContext = createContext<ManageI18nContextValue>({
  t: (k) => k,
  ready: false,
})

export function ManageI18nProvider({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const [primary, setPrimary] = useState<Record<string, string>>({})
  const [fallback, setFallback] = useState<Record<string, string>>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)
    void (async () => {
      try {
        const p = await getTranslationBundle(locale)
        if (cancelled) return
        setPrimary(flattenNamespaceStrings(p.namespaces?.manage))
        // Fallback zinciri: istenen dil → EN → TR.
        // (Sadece istenen dil != 'en' için EN, sonra istenen dil != 'tr' için TR yüklenir.)
        const lc = (locale ?? '').trim().toLowerCase()
        const fallbackOrder = lc === 'tr' ? [] : lc === 'en' ? ['tr'] : ['en', 'tr']
        const merged: Record<string, string> = {}
        for (const fbCode of fallbackOrder) {
          try {
            const fb = await getTranslationBundle(fbCode)
            if (cancelled) return
            const flat = flattenNamespaceStrings(fb.namespaces?.manage)
            for (const [k, v] of Object.entries(flat)) {
              if (!(k in merged)) merged[k] = v
            }
          } catch {
            /* ignore single locale failure */
          }
        }
        setFallback(merged)
      } catch {
        if (!cancelled) {
          setPrimary({})
          setFallback({})
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [locale])

  const t = useCallback(
    (key: string) => {
      const v = primary[key]
      if (v) return v
      const v2 = fallback[key]
      if (v2) return v2
      return key
    },
    [primary, fallback],
  )

  const value = useMemo(() => ({ t, ready }), [t, ready])

  return <ManageI18nContext.Provider value={value}>{children}</ManageI18nContext.Provider>
}

export function useManageT() {
  return useContext(ManageI18nContext).t
}

export function useManageI18nReady() {
  return useContext(ManageI18nContext).ready
}
