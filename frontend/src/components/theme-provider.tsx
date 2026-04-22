'use client'

import * as React from 'react'

const STORAGE_KEY = 'theme'

type Theme = 'light' | 'dark'

export type ThemeContextValue = {
  theme: Theme | undefined
  setTheme: (theme: string) => void
  resolvedTheme: Theme | undefined
  themes: string[]
  systemTheme?: 'light' | 'dark'
  forcedTheme?: Theme
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

function applyDomTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/**
 * React 19, `next-themes` içindeki `<script>` enjeksiyonunu reddediyor.
 * Başlangıç teması `useState` lazy initializer ile localStorage'dan okunur;
 * ayrıca mount sırasında `<html>` sınıfı güncellenir (FOUC minimumdur).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(readStoredTheme)

  React.useEffect(() => {
    applyDomTheme(theme)
  }, [theme])

  const setTheme = React.useCallback((next: string) => {
    const t: Theme = next === 'dark' ? 'dark' : 'light'
    setThemeState(t)
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {
      /* ignore */
    }
    applyDomTheme(t)
  }, [])

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme: theme,
      themes: ['light', 'dark'],
      systemTheme: undefined,
      forcedTheme: undefined,
    }),
    [theme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    return {
      theme: 'light',
      setTheme: () => {},
      resolvedTheme: 'light',
      themes: ['light', 'dark'],
      systemTheme: undefined,
      forcedTheme: undefined,
    }
  }
  return ctx
}
