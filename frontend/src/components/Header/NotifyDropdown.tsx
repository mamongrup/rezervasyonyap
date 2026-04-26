'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  detectRole,
  getFooterLink,
  NOTIFICATIONS_BY_ROLE,
  SECTION_LABELS,
  type UserRole,
} from '@/lib/notification-roles'
import { getAuthMe, listCampaigns, type Campaign } from '@/lib/travel-api'
import { CloseButton, Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Notification01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tag } from 'lucide-react'
import Link from 'next/link'
import { FC, useEffect, useState } from 'react'

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

interface Props {
  className?: string
}

const NotifyDropdown: FC<Props> = ({ className = '' }) => {
  const vitrinPath = useVitrinHref()
  const [role, setRole] = useState<UserRole>('guest')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [hasNew, setHasNew] = useState(true)

  useEffect(() => {
    const token = getStoredAuthToken()

    if (!token) {
      setRole('guest')
      setHasNew(true) // misafirler için her zaman "yeni" göster
      return
    }

    setLoading(true)

    getAuthMe(token)
      .then((u) => {
        const perms = Array.isArray(u.permissions) ? u.permissions : []
        const roles = Array.isArray(u.roles) ? u.roles : []
        const detectedRole = detectRole(roles, perms)
        setRole(detectedRole)

        // Admin ve müşteri için kampanyaları da yükle
        if (detectedRole === 'admin' || detectedRole === 'customer') {
          return listCampaigns(token).then((r) => {
            const active = r.campaigns.filter((c) => c.is_active).slice(0, 3)
            setCampaigns(active)
            setHasNew(active.length > 0)
          })
        } else {
          setHasNew(true)
        }
      })
      .catch(() => {
        setRole('guest')
        setHasNew(true)
      })
      .finally(() => setLoading(false))
  }, [])

  const staticNotifs = NOTIFICATIONS_BY_ROLE[role]
  const footer = getFooterLink(role)
  const sectionLabel = SECTION_LABELS[role]
  const totalCount = staticNotifs.length + campaigns.length

  return (
    <Popover className={className}>
      <>
        <PopoverButton
          className="relative -m-2.5 flex cursor-pointer items-center justify-center rounded-full p-2.5 hover:bg-neutral-100 focus-visible:outline-hidden dark:hover:bg-neutral-800"
          onClick={() => setHasNew(false)}
        >
          {hasNew ? (
            <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-blue-500" />
          ) : null}
          <HugeiconsIcon icon={Notification01Icon} className="h-6 w-6" strokeWidth={1.75} />
        </PopoverButton>

        <PopoverPanel
          transition
          anchor={{ to: 'bottom end', gap: 16 }}
          className="z-40 w-96 rounded-3xl shadow-lg ring-1 ring-black/5 transition duration-200 ease-in-out data-closed:translate-y-1 data-closed:opacity-0"
        >
          <div className="relative bg-white dark:bg-neutral-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-700">
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Bildirimler
                </h3>
                <p className="text-xs text-neutral-400">{totalCount} öğe</p>
              </div>
              {role !== 'guest' && (
                <CloseButton
                  as={Link}
                  href={vitrinPath(footer.href)}
                  className="flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300"
                >
                  Tümünü gör
                </CloseButton>
              )}
            </div>

            {/* Yükleniyor */}
            {loading && (
              <div className="px-5 pt-4 pb-2">
                <p className="text-sm text-neutral-400">Yükleniyor…</p>
              </div>
            )}

            {/* Kampanyalar (admin + müşteri) */}
            {campaigns.length > 0 && (
              <div className="px-5 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Aktif Kampanyalar
                </p>
                <div className="space-y-2">
                  {campaigns.map((c) => (
                    <CloseButton
                      as={Link}
                      key={c.id}
                      href={vitrinPath('/manage/campaigns')}
                      className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/20">
                        <Tag className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {c.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              c.is_active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-neutral-100 text-neutral-500'
                            }`}
                          >
                            {c.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                          <span className="text-[11px] text-neutral-400">{c.campaign_type}</span>
                          {c.ends_at && (
                            <span className="text-[11px] text-neutral-400">
                              → {new Date(c.ends_at).toLocaleDateString('tr-TR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </CloseButton>
                  ))}
                </div>
              </div>
            )}

            {/* Rol bazlı statik bildirimler */}
            <div className="px-5 pt-4 pb-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {sectionLabel}
              </p>
              <div className="space-y-2">
                {staticNotifs.map((notif) => {
                  const href =
                    role === 'guest'
                      ? notif.href
                      : vitrinPath(notif.href)

                  return (
                    <CloseButton
                      as={Link}
                      key={notif.id}
                      href={href}
                      className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${notif.color}18` }}
                      >
                        <notif.icon className="h-4 w-4" style={{ color: notif.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                            {notif.title}
                          </p>
                          {notif.badge && (
                            <span
                              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{
                                backgroundColor: `${notif.color}20`,
                                color: notif.color,
                              }}
                            >
                              {notif.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-tight text-neutral-400">
                          {notif.desc}
                        </p>
                      </div>
                    </CloseButton>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-neutral-100 px-5 py-3 dark:border-neutral-700">
              <CloseButton
                as={Link}
                href={role === 'guest' ? footer.href : vitrinPath(footer.href)}
                className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <footer.icon className="h-4 w-4" />
                {footer.label}
              </CloseButton>
            </div>
          </div>
        </PopoverPanel>
      </>
    </Popover>
  )
}

export default NotifyDropdown
