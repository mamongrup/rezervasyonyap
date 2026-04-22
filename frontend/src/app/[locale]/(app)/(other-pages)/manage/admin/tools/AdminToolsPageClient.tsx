'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { managePanelLabel } from '@/lib/manage-panel-i18n-fallback'
import { useManageT } from '@/lib/manage-i18n-context'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'

type Card = {
  title: string
  desc: string
  href: string
}

export default function AdminToolsPageClient() {
  const t = useManageT()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()

  const cards: Card[] = useMemo(() => {
    const L = (key: string) => managePanelLabel(locale, key, t)
    return [
      {
        title: L('admin.tools_card_i18n_title'),
        desc: L('admin.tools_card_i18n_desc'),
        href: vitrinPath('/manage/i18n'),
      },
      {
        title: L('admin.tools_card_hero_title'),
        desc: L('admin.tools_card_hero_desc'),
        href: vitrinPath('/manage/hero-menu'),
      },
      {
        title: L('admin.tools_card_catalog_title'),
        desc: L('admin.tools_card_catalog_desc'),
        href: vitrinPath('/manage/catalog'),
      },
      {
        title: L('admin.tools_card_seo_title'),
        desc: L('admin.tools_card_seo_desc'),
        href: vitrinPath('/manage/admin/content/seo-redirects'),
      },
      {
        title: L('admin.tools_card_audit_title'),
        desc: L('admin.tools_card_audit_desc'),
        href: vitrinPath('/manage/admin/access'),
      },
      {
        title: L('admin.tools_card_banner_layout_title'),
        desc: L('admin.tools_card_banner_layout_desc'),
        href: vitrinPath('/manage/admin/tools/banner-layout'),
      },
    ]
  }, [t, locale, vitrinPath])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
        {managePanelLabel(locale, 'admin.tools_title', t)}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[color:var(--manage-text-muted)]">
        {managePanelLabel(locale, 'admin.tools_intro', t)}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            prefetch={false}
            className="group rounded-xl border border-[color:var(--manage-sidebar-border)] bg-[color:var(--manage-sidebar-bg)] p-5 shadow-sm transition hover:border-[color:var(--manage-primary)]/40 hover:shadow-md"
          >
            <h2 className="text-base font-semibold text-[color:var(--manage-text)] group-hover:text-[color:var(--manage-primary)]">
              {c.title}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--manage-text-muted)]">{c.desc}</p>
            <span className="mt-3 inline-block text-sm font-medium text-[color:var(--manage-primary)]">
              {managePanelLabel(locale, 'admin.tools_open', t)}
            </span>
          </Link>
        ))}
      </div>

      <section className="mt-10 rounded-xl border border-dashed border-[color:var(--manage-sidebar-border)] bg-[color:var(--manage-page-bg)] p-5">
        <h2 className="text-sm font-semibold text-[color:var(--manage-text)]">
          {managePanelLabel(locale, 'admin.tools_cache_title', t)}
        </h2>
        <p className="mt-2 text-sm text-[color:var(--manage-text-muted)]">
          {managePanelLabel(locale, 'admin.tools_cache_desc', t)}
        </p>
      </section>
    </div>
  )
}
