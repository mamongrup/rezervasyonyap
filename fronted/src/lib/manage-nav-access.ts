import type { RoleAssignment } from '@/lib/travel-api'

/** Tam yönetici — tüm `/manage/*` sekmelerini görebilir (geçiş). */
export function isFullAdminUser(permissions: string[], roles: RoleAssignment[]): boolean {
  const hasPrefix = (prefix: string) => permissions.some((p) => p.startsWith(prefix))
  const hasRole = (code: string) => roles.some((r) => r.role_code === code)
  return hasPrefix('admin.') || hasRole('admin')
}

/** `/manage/*` alt menü yolu — izin veya rol ile görünürlük (API matrisi + geri uyum). */
export function canSeeManageNavPath(
  path: string,
  permissions: string[],
  roles: RoleAssignment[],
): boolean {
  const hasPerm = (code: string) => permissions.includes(code)
  const hasPrefix = (prefix: string) => permissions.some((p) => p.startsWith(prefix))
  const hasRole = (code: string) => roles.some((r) => r.role_code === code)
  const admin = isFullAdminUser(permissions, roles)

  // Acente / Tedarikçi / Personel portalları
  if (path.startsWith('/manage/agency')) return admin || hasPerm('agency.portal') || hasRole('agency')
  if (path.startsWith('/manage/supplier')) return admin || hasPerm('supplier.portal') || hasRole('supplier')
  if (path.startsWith('/manage/staff')) return admin || hasPrefix('staff.') || hasRole('staff')

  // Katalog: herkese açık (admin, acente, tedarikçi, personel)
  if (path.startsWith('/manage/catalog')) {
    return (
      admin ||
      hasPerm('supplier.portal') || hasRole('supplier') ||
      hasPrefix('staff.') || hasRole('staff') ||
      hasPerm('agency.portal') || hasRole('agency')
    )
  }

  // Tüm /manage/admin/* ve diğer tüm admin yolları
  return admin
}
