'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { isFullAdminUser } from '@/lib/manage-nav-access'
import {
  getAuthMe,
  listCampaigns,
  type Campaign,
  type RoleAssignment,
} from '@/lib/travel-api'
import { CloseButton, Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Notification01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Building2,
  Calendar,
  ExternalLink,
  Gift,
  LogIn,
  MapPin,
  Megaphone,
  Package,
  Settings,
  Star,
  Tag,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { type ElementType, FC, useEffect, useState } from 'react'

// ─── Tip tanımları ────────────────────────────────────────────────────────────

type UserRole = 'admin' | 'staff' | 'agency' | 'supplier' | 'customer' | 'guest'

interface StaticNotif {
  id: string
  title: string
  desc: string
  href: string
  icon: ElementType
  color: string
  badge?: string
}

// ─── Rol tespiti ──────────────────────────────────────────────────────────────

function detectRole(roles: RoleAssignment[], permissions: string[]): UserRole {
  if (isFullAdminUser(permissions, roles)) return 'admin'
  if (
    roles.some((r) => r.role_code === 'staff') ||
    permissions.some((p) => p.startsWith('staff.'))
  )
    return 'staff'
  if (
    roles.some((r) => r.role_code === 'agency') ||
    permissions.includes('agency.portal')
  )
    return 'agency'
  if (
    roles.some((r) => r.role_code === 'supplier') ||
    permissions.includes('supplier.portal')
  )
    return 'supplier'
  return 'customer'
}

// ─── Rol bazlı statik bildirimler ─────────────────────────────────────────────

const NOTIFICATIONS_BY_ROLE: Record<UserRole, StaticNotif[]> = {
  admin: [
    {
      id: 'ann-megamenu',
      title: 'Mega Menüyü Düzenle',
      desc: 'Ana navigasyon mega menüsünde gösterilecek linkleri yönetin.',
      href: '/manage/content/mega-menu',
      icon: Settings,
      color: '#8b5cf6',
    },
    {
      id: 'ann-seo',
      title: 'SEO İçeriklerini Güncelle',
      desc: 'Sayfa, ilan ve blog için meta başlık ve açıklamaları optimize edin.',
      href: '/manage/seo',
      icon: ExternalLink,
      color: '#3b82f6',
    },
  ],
  staff: [
    {
      id: 'staff-reservations',
      title: 'Bekleyen Rezervasyonlar',
      desc: 'Onay bekleyen rezervasyonları inceleyin ve işlem yapın.',
      href: '/manage/staff/reservations',
      icon: Calendar,
      color: '#f59e0b',
      badge: 'Yeni',
    },
    {
      id: 'staff-tasks',
      title: 'Görev Listem',
      desc: 'Size atanan aktif görevleri ve son tarihleri görüntüleyin.',
      href: '/manage/staff',
      icon: Star,
      color: '#10b981',
    },
  ],
  agency: [
    {
      id: 'agency-new-requests',
      title: 'Yeni Talepler',
      desc: 'Müşterilerinizden gelen rezervasyon taleplerini inceleyin.',
      href: '/manage/agency/reservations',
      icon: Building2,
      color: '#6366f1',
      badge: 'Kontrol Et',
    },
    {
      id: 'agency-catalog',
      title: 'Ürün Kataloğunuz',
      desc: 'İlan ve fiyat listelerinizi güncel tutun.',
      href: '/manage/catalog',
      icon: Tag,
      color: '#f97316',
    },
    {
      id: 'agency-portal',
      title: 'Acente Portalı',
      desc: 'Tüm acente yönetim araçlarına hızlıca erişin.',
      href: '/manage/agency',
      icon: ExternalLink,
      color: '#3b82f6',
    },
  ],
  supplier: [
    {
      id: 'supplier-pending',
      title: 'Onay Bekleyen Rezervasyonlar',
      desc: 'Müsaitlik ve fiyat onayı gereken rezervasyonlar var.',
      href: '/manage/supplier/reservations',
      icon: Package,
      color: '#ef4444',
      badge: 'Acil',
    },
    {
      id: 'supplier-availability',
      title: 'Müsaitlik Güncelle',
      desc: 'Ürün ve hizmet müsaitlik takviminizi güncelleyin.',
      href: '/manage/catalog',
      icon: Calendar,
      color: '#10b981',
    },
    {
      id: 'supplier-portal',
      title: 'Tedarikçi Portalı',
      desc: 'Tüm tedarikçi yönetim araçlarına hızlıca erişin.',
      href: '/manage/supplier',
      icon: ExternalLink,
      color: '#3b82f6',
    },
  ],
  customer: [
    {
      id: 'customer-reservations',
      title: 'Rezervasyonlarım',
      desc: 'Aktif ve geçmiş rezervasyonlarınızı görüntüleyin.',
      href: '/account/reservations',
      icon: Calendar,
      color: '#6366f1',
    },
    {
      id: 'customer-offers',
      title: 'Size Özel Teklifler',
      desc: 'Profilinize göre seçilmiş kampanya ve indirimler.',
      href: '/campaigns',
      icon: Gift,
      color: '#f59e0b',
      badge: 'Yeni',
    },
    {
      id: 'customer-explore',
      title: 'Yeni Destinasyonlar',
      desc: 'Bu sezon öne çıkan seyahat rotalarını keşfedin.',
      href: '/listings',
      icon: MapPin,
      color: '#10b981',
    },
  ],
  guest: [
    {
      id: 'guest-register',
      title: 'Ücretsiz Üye Ol',
      desc: 'Kayıt ol, özel indirimlerden ve erken erişim fırsatlarından yararlan.',
      href: '/signup',
      icon: UserPlus,
      color: '#6366f1',
      badge: 'Fırsat',
    },
    {
      id: 'guest-deals',
      title: 'Haftanın Fırsatları',
      desc: 'Bu haftaya özel seyahat kampanyaları ve son dakika indirimleri.',
      href: '/listings',
      icon: Gift,
      color: '#f59e0b',
    },
    {
      id: 'guest-destinations',
      title: 'Popüler Destinasyonlar',
      desc: 'En çok tercih edilen tatil bölgelerini keşfetmeye başlayın.',
      href: '/listings',
      icon: MapPin,
      color: '#10b981',
    },
    {
      id: 'guest-login',
      title: 'Giriş Yap',
      desc: 'Hesabınıza giriş yaparak kişiselleştirilmiş önerilere ulaşın.',
      href: '/login',
      icon: LogIn,
      color: '#3b82f6',
    },
  ],
}

// ─── Footer linkleri (role göre) ──────────────────────────────────────────────

function getFooterLink(role: UserRole): { label: string; href: string; icon: ElementType } {
  switch (role) {
    case 'admin':
      return { label: 'Kampanya yönetimine git', href: '/manage/campaigns', icon: Megaphone }
    case 'staff':
      return { label: 'Personel paneline git', href: '/manage/staff', icon: Star }
    case 'agency':
      return { label: 'Acente paneline git', href: '/manage/agency', icon: Building2 }
    case 'supplier':
      return { label: 'Tedarikçi paneline git', href: '/manage/supplier', icon: Package }
    case 'customer':
      return { label: 'Tüm kampanyaları gör', href: '/campaigns', icon: Megaphone }
    case 'guest':
      return { label: 'Üye ol ve avantajları kazan', href: '/signup', icon: UserPlus }
  }
}

// ─── Bölüm başlıkları ─────────────────────────────────────────────────────────

const SECTION_LABELS: Record<UserRole, string> = {
  admin: 'Hızlı Eylemler',
  staff: 'Personel Bildirimleri',
  agency: 'Acente Bildirimleri',
  supplier: 'Tedarikçi Bildirimleri',
  customer: 'Hesabım',
  guest: 'Sizin İçin Öneriler',
}

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
