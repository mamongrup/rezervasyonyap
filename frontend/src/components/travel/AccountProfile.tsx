'use client'

import { clearStoredAuthToken, getStoredAuthToken } from '@/lib/auth-storage'
import { clearHeroSearchUserIdCache } from '@/lib/hero-search-plan'
import {
  addComparisonItem,
  createComparisonSet,
  deleteComparisonSet,
  getAuthMe,
  listComparisonItems,
  listComparisonSets,
  listEngagementFavorites,
  listMyReservations,
  listRecentlyViewed,
  patchAuthMe,
  removeComparisonItem,
  removeEngagementFavorite,
  type ComparisonListingItem,
  type ComparisonSetSummary,
  type EngagementFavorite,
  type MyReservationRow,
  type RecentlyViewedItem,
} from '@/lib/travel-api'
import { AccountReservationsSection } from '@/components/travel/AccountReservationsSection'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { canSeeManageNavPath } from '@/lib/manage-nav-access'
import { TcKimlikWidget } from '@/components/travel/TcKimlikWidget'
import { defaultLocale, isAppLocale } from '@/lib/i18n-config'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { getMessages } from '@/utils/getT'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

type Me = Awaited<ReturnType<typeof getAuthMe>>

const MANAGE_QUICK_LINKS_PATHS = [
  { path: '/manage/admin',        key: 'manageLinkAdmin'       },
  { path: '/manage/catalog',      key: 'manageLinkCatalog'     },
  { path: '/manage/hero-menu',    key: 'manageLinkHeroMenu'    },
  { path: '/manage/i18n',         key: 'manageLinkI18n'        },
  { path: '/manage/agency/sales', key: 'manageLinkAgencySales' },
  { path: '/manage/agency',       key: 'manageLinkAgency'      },
  { path: '/manage/supplier',     key: 'manageLinkSupplier'    },
  { path: '/manage/staff',        key: 'manageLinkStaff'       },
] as const

export default function AccountProfile({ locale }: { locale: string }) {
  const router = useRouter()
  const vitrinPath = useVitrinHref()
  const loc = isAppLocale(locale) ? locale : defaultLocale
  const T = getMessages(loc).accountPage
  const [token, setToken] = useState<string | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [reservations, setReservations] = useState<MyReservationRow[]>([])
  const [favorites, setFavorites] = useState<EngagementFavorite[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([])
  const [comparisonSets, setComparisonSets] = useState<ComparisonSetSummary[]>([])
  const [expandedCmpSetId, setExpandedCmpSetId] = useState<string | null>(null)
  const [cmpItemsBySet, setCmpItemsBySet] = useState<Record<string, ComparisonListingItem[]>>({})
  const [cmpLoadingSetId, setCmpLoadingSetId] = useState<string | null>(null)
  const [cmpAddDraft, setCmpAddDraft] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [prefLocale, setPrefLocale] = useState('tr')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'err'>('idle')

  const redirectLogin = useCallback(() => {
    router.replace(vitrinPath('/login'))
  }, [router, vitrinPath])

  useEffect(() => {
    const t = getStoredAuthToken()
    setToken(t)
    if (!t) {
      setLoading(false)
      redirectLogin()
      return
    }
    let cancelled = false
    ;(async () => {
      setError(null)
      try {
        const [u, r, fav, recent, cmp] = await Promise.all([
          getAuthMe(t),
          listMyReservations(t),
          listEngagementFavorites(t).catch(() => ({ favorites: [] as EngagementFavorite[] })),
          listRecentlyViewed({ token: t }).catch(() => ({ items: [] as RecentlyViewedItem[] })),
          listComparisonSets({ token: t }).catch(() => ({ sets: [] as ComparisonSetSummary[] })),
        ])
        if (cancelled) return
        setMe(u)
        setReservations(r.reservations)
        setFavorites(fav.favorites)
        setRecentlyViewed(recent.items)
        setComparisonSets(cmp.sets)
        setDisplayName(u.display_name ?? '')
        setPrefLocale(u.preferred_locale?.trim() ? u.preferred_locale : 'tr')
      } catch (e) {
        if (cancelled) return
        clearStoredAuthToken()
        clearHeroSearchUserIdCache()
        setToken(null)
        setError(e instanceof Error ? e.message : 'load_failed')
        redirectLogin()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [redirectLogin])

  async function onRemoveFavorite(listingId: string) {
    if (!token) return
    try {
      await removeEngagementFavorite(token, listingId)
      setFavorites((prev) => prev.filter((f) => f.listing_id !== listingId))
    } catch {
      /* ignore */
    }
  }

  async function loadCmpItems(setId: string) {
    if (!token) return
    setCmpLoadingSetId(setId)
    try {
      const r = await listComparisonItems(setId, { token })
      setCmpItemsBySet((prev) => ({ ...prev, [setId]: r.items }))
    } catch {
      /* ignore */
    } finally {
      setCmpLoadingSetId(null)
    }
  }

  function toggleCmpExpand(setId: string) {
    if (expandedCmpSetId === setId) {
      setExpandedCmpSetId(null)
      return
    }
    setExpandedCmpSetId(setId)
    if (cmpItemsBySet[setId] === undefined) void loadCmpItems(setId)
  }

  async function onCreateComparisonSet() {
    if (!token) return
    try {
      const created = await createComparisonSet({ criteria_json: '{}' }, { token })
      const next = await listComparisonSets({ token })
      setComparisonSets(next.sets)
      setExpandedCmpSetId(created.id)
      setCmpAddDraft('')
    } catch {
      /* ignore */
    }
  }

  async function onDeleteComparisonSet(setId: string) {
    if (!token) return
    if (!confirm(T['Delete list'] + '?')) return
    try {
      await deleteComparisonSet(setId, { token })
      setComparisonSets((prev) => prev.filter((s) => s.id !== setId))
      setCmpItemsBySet((prev) => {
        const n = { ...prev }
        delete n[setId]
        return n
      })
      if (expandedCmpSetId === setId) setExpandedCmpSetId(null)
    } catch {
      /* ignore */
    }
  }

  async function onAddComparisonItem(setId: string) {
    if (!token) return
    const lid = cmpAddDraft.trim()
    if (!lid) return
    try {
      await addComparisonItem(setId, { listing_id: lid }, { token })
      setCmpAddDraft('')
      await loadCmpItems(setId)
    } catch {
      /* ignore */
    }
  }

  async function onRemoveComparisonItem(setId: string, listingId: string) {
    if (!token) return
    try {
      await removeComparisonItem(setId, listingId, { token })
      await loadCmpItems(setId)
    } catch {
      /* ignore */
    }
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setSaveState('saving')
    try {
      const u = await patchAuthMe(token, {
        display_name: displayName.trim(),
        preferred_locale: prefLocale.trim() || 'tr',
      })
      setMe(u)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('err')
    }
  }

  function onLogout() {
    clearStoredAuthToken()
    clearHeroSearchUserIdCache()
    router.push(vitrinPath('/login'))
    router.refresh()
  }

  if (loading) {
    return <div className="text-neutral-600 dark:text-neutral-400">…</div>
  }

  if (!token) {
    return (
      <div className="text-neutral-600 dark:text-neutral-400">
        {T['Redirecting to sign in']}
      </div>
    )
  }

  if (error || !me) {
    return <div className="text-red-600">{error ?? '—'}</div>
  }

  const perms = me.permissions ?? []
  const roles = me.roles ?? []
  const manageLinks = MANAGE_QUICK_LINKS_PATHS
    .filter((item) => canSeeManageNavPath(item.path, perms, roles))
    .map((item) => ({ path: item.path, label: T[item.key] }))

  return (
    <div>
      <h1 className="text-3xl font-semibold">{T['Account information']}</h1>
      <Divider className="my-8 w-14!" />

      {manageLinks.length > 0 ? (
        <section
          className="mb-10 max-w-3xl rounded-2xl border border-primary-200 bg-primary-50/60 p-6 dark:border-primary-800 dark:bg-primary-950/30"
          aria-label={T['managePanelAriaLabel']}
        >
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{T['managePanelTitle']}</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {T['managePanelDesc']}
          </p>
          <ul className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {manageLinks.map((item) => (
              <li key={item.path}>
                <Link
                  href={vitrinPath(item.path)}
                  className="inline-flex rounded-lg border border-primary-300 bg-white px-4 py-2 text-sm font-medium text-primary-800 shadow-sm hover:bg-primary-50 dark:border-primary-700 dark:bg-neutral-900 dark:text-primary-200 dark:hover:bg-neutral-800"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form onSubmit={onSaveProfile} className="max-w-3xl space-y-6">
        <Field>
          <Label>{T['Email']}</Label>
          <Input className="mt-1.5" readOnly value={me.email} />
        </Field>
        <Field>
          <Label>{T['Name']}</Label>
          <Input
            className="mt-1.5"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
        </Field>
        <Field>
          <Label>{T['Preferred language']}</Label>
          <Select className="mt-1.5" value={prefLocale} onChange={(e) => setPrefLocale(e.target.value)}>
            <option value="tr">Türkçe (tr)</option>
            <option value="en">English (en)</option>
          </Select>
        </Field>
        <div>
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {T.yourRoles ?? T['Your roles']}
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-neutral-600 dark:text-neutral-400">
            {me.roles?.length
              ? me.roles.map((r) => (
                  <li key={`${r.role_code}-${r.organization_id ?? 'x'}`}>
                    {r.role_code}
                    {r.organization_id ? ` · ${r.organization_id}` : ''}
                  </li>
                ))
              : '—'}
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <ButtonPrimary type="submit" disabled={saveState === 'saving'}>
            {saveState === 'saving' ? '…' : T['Update information']}
          </ButtonPrimary>
          {saveState === 'saved' ? (
            <span className="text-sm text-green-600 dark:text-green-400">{T['Profile saved']}</span>
          ) : null}
          {saveState === 'err' ? <span className="text-sm text-red-600">{T['saveError']}</span> : null}
          <button
            type="button"
            onClick={onLogout}
            className="text-sm font-medium text-neutral-600 underline dark:text-neutral-400"
          >
            {T['Log out']}
          </button>
        </div>
      </form>

      <Divider className="my-12" />

      {/* ── TC Kimlik Doğrulama ──────────────────────────────────────────── */}
      <section id="tc-kimlik" className="mb-12 max-w-3xl">
        <h2 className="mb-4 text-2xl font-semibold">{T['identityVerification']}</h2>
        <TcKimlikWidget />
      </section>

      <Divider className="my-12" />

      <section id="favorites" className="mb-12">
        <h2 className="text-2xl font-semibold">{T.Favorites}</h2>
        {favorites.length === 0 ? (
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">—</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-3 font-medium">{T.Listing}</th>
                  <th className="px-4 py-3 font-medium">{T['Listing status']}</th>
                  <th className="px-4 py-3 font-medium">{T['Date added']}</th>
                  <th className="px-4 py-3 font-medium w-28" />
                </tr>
              </thead>
              <tbody>
                {favorites.map((f) => (
                  <tr key={f.listing_id} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-3">
                      {f.slug.trim() ? (
                        <Link
                          href={vitrinPath(`/stay-listings/${encodeURIComponent(f.slug)}`)}
                          className="font-medium text-primary-600 underline dark:text-primary-400"
                        >
                          {f.slug}
                        </Link>
                      ) : (
                        <span className="text-neutral-500">{T['Listing unavailable']}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{f.status || '—'}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{f.created_at}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void onRemoveFavorite(f.listing_id)}
                        className="text-sm font-medium text-red-600 underline dark:text-red-400"
                      >
                        {T.Remove}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="recently-viewed" className="mb-12">
        <h2 className="text-2xl font-semibold">{T['Recently viewed']}</h2>
        {recentlyViewed.length === 0 ? (
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">—</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-3 font-medium">{T.Listing}</th>
                  <th className="px-4 py-3 font-medium">{T['Listing status']}</th>
                  <th className="px-4 py-3 font-medium">{T['Last viewed']}</th>
                </tr>
              </thead>
              <tbody>
                {recentlyViewed.map((rv) => (
                  <tr key={`${rv.listing_id}-${rv.viewed_at}`} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-3">
                      {rv.slug.trim() ? (
                        <Link
                          href={vitrinPath(`/stay-listings/${encodeURIComponent(rv.slug)}`)}
                          className="font-medium text-primary-600 underline dark:text-primary-400"
                        >
                          {rv.slug}
                        </Link>
                      ) : (
                        <span className="text-neutral-500">{T['Listing unavailable']}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{rv.status || '—'}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{rv.viewed_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="comparison-lists" className="mb-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">{T['Comparison lists']}</h2>
          <button
            type="button"
            onClick={() => void onCreateComparisonSet()}
            className="text-sm font-medium text-primary-600 underline dark:text-primary-400"
          >
            {T['New list']}
          </button>
        </div>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          {T['Comparison hint']}
        </p>
        {comparisonSets.length === 0 ? (
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">—</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {comparisonSets.map((s) => {
              const open = expandedCmpSetId === s.id
              const items = cmpItemsBySet[s.id]
              return (
                <li
                  key={s.id}
                  className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700 dark:bg-neutral-900/20"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-neutral-500">{s.id}</p>
                      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                        {T.Criteria}:{' '}
                        <span className="break-all font-mono">{s.criteria_json.slice(0, 160)}</span>
                        {s.criteria_json.length > 160 ? '…' : ''}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">{s.created_at}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCmpExpand(s.id)}
                        className="text-sm font-medium text-primary-600 underline dark:text-primary-400"
                      >
                        {open ? T['Hide items'] : T['Show items']}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteComparisonSet(s.id)}
                        className="text-sm font-medium text-red-600 underline dark:text-red-400"
                      >
                        {T['Delete list']}
                      </button>
                    </div>
                  </div>
                  {open ? (
                    <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                      <div className="flex flex-wrap items-end gap-2">
                        <Field className="min-w-[12rem] flex-1">
                          <Label className="text-xs">{T['Add listing']} (UUID)</Label>
                          <Input
                            className="mt-1 font-mono text-xs"
                            value={cmpAddDraft}
                            onChange={(e) => setCmpAddDraft(e.target.value)}
                            placeholder="00000000-0000-0000-0000-000000000000"
                            autoComplete="off"
                          />
                        </Field>
                        <ButtonPrimary type="button" onClick={() => void onAddComparisonItem(s.id)}>
                          {T['Add listing']}
                        </ButtonPrimary>
                      </div>
                      {cmpLoadingSetId === s.id || items === undefined ? (
                        <p className="mt-3 text-sm text-neutral-500">…</p>
                      ) : items.length === 0 ? (
                        <p className="mt-3 text-sm text-neutral-500">—</p>
                      ) : (
                        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                          <table className="min-w-full text-left text-sm">
                            <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
                              <tr>
                                <th className="px-3 py-2 font-medium">{T.Listing}</th>
                                <th className="px-3 py-2 font-medium">{T['Listing status']}</th>
                                <th className="px-3 py-2 w-24" />
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((it) => (
                                <tr key={it.listing_id} className="border-t border-neutral-100 dark:border-neutral-800">
                                  <td className="px-3 py-2">
                                    {it.slug.trim() ? (
                                      <Link
                                        href={vitrinPath(`/stay-listings/${encodeURIComponent(it.slug)}`)}
                                        className="font-mono text-xs text-primary-600 underline dark:text-primary-400"
                                      >
                                        {it.slug}
                                      </Link>
                                    ) : (
                                      <span className="font-mono text-xs text-neutral-500">{it.listing_id}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400">
                                    {it.status || '—'}
                                  </td>
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => void onRemoveComparisonItem(s.id, it.listing_id)}
                                      className="text-xs font-medium text-red-600 underline dark:text-red-400"
                                    >
                                      {T.Remove}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Divider className="my-12" />

      <AccountReservationsSection
        locale={loc}
        reservations={reservations}
        vitrinHref={vitrinPath}
        T={T}
      />
    </div>
  )
}
