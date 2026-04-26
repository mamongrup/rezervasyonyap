import type { ElementType } from 'react'
import { isFullAdminUser } from '@/lib/manage-nav-access'
import type { RoleAssignment } from '@/lib/travel-api'
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

export type UserRole = 'admin' | 'staff' | 'agency' | 'supplier' | 'customer' | 'guest'

export interface RoleNotif {
  id: string
  title: string
  desc: string
  href: string
  icon: ElementType
  color: string
  badge?: string
}

export function detectRole(roles: RoleAssignment[], permissions: string[]): UserRole {
  if (isFullAdminUser(permissions, roles)) return 'admin'
  if (roles.some((r) => r.role_code === 'staff') || permissions.some((p) => p.startsWith('staff.')))
    return 'staff'
  if (roles.some((r) => r.role_code === 'agency') || permissions.includes('agency.portal'))
    return 'agency'
  if (roles.some((r) => r.role_code === 'supplier') || permissions.includes('supplier.portal'))
    return 'supplier'
  return 'customer'
}

export const NOTIFICATIONS_BY_ROLE: Record<UserRole, RoleNotif[]> = {
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

export const SECTION_LABELS: Record<UserRole, string> = {
  admin: 'Hızlı Eylemler',
  staff: 'Personel Bildirimleri',
  agency: 'Acente Bildirimleri',
  supplier: 'Tedarikçi Bildirimleri',
  customer: 'Hesabım',
  guest: 'Sizin İçin Öneriler',
}

export function getFooterLink(role: UserRole): { label: string; href: string; icon: ElementType } {
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
