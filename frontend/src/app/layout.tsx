import { LocaleHtmlAttributes } from '@/components/LocaleHtmlAttributes'
import SearchLoadingOverlay from '@/components/SearchLoadingOverlay'
import { ThemeProvider } from '@/components/theme-provider'
import { DirectionProvider } from '@/components/ui/direction'
import { FavoritesProvider } from '@/context/FavoritesContext'
import { defaultLocale } from '@/lib/i18n-config'
import { DEFAULT_FAVICON_PATH } from '@/lib/site-branding-seo'
import { cn } from '@/lib/utils'
import '@/styles/tailwind.css'
import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'

const themeDirection =
  process.env.NEXT_PUBLIC_THEME_DIR === 'rtl' ? ('rtl' as const) : ('ltr' as const)

/**
 * Global error/not-found build'i request store olmadan çalışır. Hostname'e bağlı,
 * çok dilli SEO metadata'sı `[locale]/layout.tsx` içinde üretilmeye devam eder;
 * kök fallback bilinçli olarak request API'lerinden bağımsızdır.
 */
export const metadata: Metadata = {
  applicationName: 'Rezervasyon Yap',
  title: {
    template: '%s - Rezervasyon Yap',
    default: 'Rezervasyon Yap',
  },
  icons: {
    icon: [{ url: DEFAULT_FAVICON_PATH }],
    apple: [{ url: DEFAULT_FAVICON_PATH }],
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#171717' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = defaultLocale
  const dir = themeDirection === 'rtl' ? ('rtl' as const) : ('ltr' as const)

  return (
    <html
      lang={lang}
      dir={dir}
      suppressHydrationWarning
      className={cn('light min-w-0 overflow-x-hidden font-sans')}
    >
      <body className="min-w-0 overflow-x-hidden bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
        <ThemeProvider>
          <DirectionProvider dir={themeDirection} direction={themeDirection}>
            <FavoritesProvider>
              <div>
                <LocaleHtmlAttributes />
                <Suspense fallback={null}>
                  <SearchLoadingOverlay />
                </Suspense>
                {children}
              </div>
            </FavoritesProvider>
          </DirectionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
