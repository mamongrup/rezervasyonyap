'use client'

import { useParams, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ManageSubnav } from './ManageSubnav'
import ManagePanelTopBar from './ManagePanelTopBar'
import { useManageAccess } from '@/lib/use-manage-access'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import Link from 'next/link'

/**
 * Site geneli `ApplicationLayout` ile aynı Header / Footer korunur; burada yalnızca panel yan menüsü + içerik alanı var.
 * İkinci savunma katmanı: middleware geçmişse de burada token/rol kontrolü yapılır.
 */
export default function ManageShellClient({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const en = locale.toLowerCase().startsWith('en')
  const [mobileOpen, setMobileOpen] = useState(false)
  const access = useManageAccess()

  useEffect(() => {
    setMobileOpen(false)
  }, [locale, pathname])

  if (access.kind === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex items-center gap-2 text-neutral-400">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">{en ? 'Loading…' : 'Yükleniyor…'}</span>
        </div>
      </div>
    )
  }

  if (access.kind === 'no_token') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 dark:bg-neutral-950 px-4 text-center">
        <svg className="h-12 w-12 text-neutral-300 dark:text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <p className="text-base font-medium text-neutral-700 dark:text-neutral-300">
          {en ? 'Please log in to access the management panel.' : 'Yönetim paneline erişmek için giriş yapın.'}
        </p>
        <Link
          href={`${vitrinPath('/login')}?redirect=${encodeURIComponent(pathname ?? vitrinPath('/manage'))}`}
          className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          {en ? 'Go to Login' : 'Giriş Sayfasına Git'}
        </Link>
      </div>
    )
  }

  if (access.kind === 'forbidden') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 dark:bg-neutral-950 px-4 text-center">
        <svg className="h-12 w-12 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="text-base font-medium text-red-600 dark:text-red-400">
          {en ? 'You do not have permission to access this page.' : 'Bu sayfaya erişim izniniz yok.'}
        </p>
      </div>
    )
  }

  const menuLabel = en ? 'Panel menu' : 'Panel menüsü'

  return (
    <div className="manage-shell flex min-h-[min(100vh,100dvh)] bg-[color:var(--manage-page-bg)] text-[color:var(--manage-text)] transition-colors duration-200">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-black/45 lg:hidden"
          aria-label={en ? 'Close menu' : 'Menüyü kapat'}
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={[
          'fixed left-0 z-50 flex w-[min(100%,16.5rem)] shrink-0 flex-col border-r border-[color:var(--manage-sidebar-border)] pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur-xl transition-transform duration-200 ease-out lg:static lg:z-0 lg:h-auto lg:min-h-[min(100vh,100dvh)] lg:w-64 lg:translate-x-0 lg:pb-0 lg:shadow-none',
          'bg-[color:var(--manage-sidebar-bg)]',
          /* Mobil: ApplicationLayout üst şeridinin (h-20) altında — site header ile çakışmasın */
          'top-20 h-[calc(100dvh-5rem)] lg:top-0 lg:h-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Sidebar header */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[color:var(--manage-sidebar-border)] px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--manage-primary)] text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[color:var(--manage-text)]">Yönetim Paneli</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-4 pt-2 lg:pt-3">
          <ManageSubnav onNavLinkClick={() => setMobileOpen(false)} />
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col lg:pl-0">
        {/* Mobil: site header’ının altında küçük FAB — ikinci bir tam genişlik header yok */}
        <button
          type="button"
          className="fixed left-4 top-[5.25rem] z-30 flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--manage-sidebar-border)] bg-[color:var(--manage-sidebar-bg)] text-[color:var(--manage-text)] shadow-md lg:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-label={menuLabel}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            {mobileOpen ? (
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            )}
          </svg>
        </button>

        <ManagePanelTopBar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
