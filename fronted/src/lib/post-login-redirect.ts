import { canSeeManageNavPath } from '@/lib/manage-nav-access'
import type { RoleAssignment } from '@/lib/travel-api'

/**
 * İlk yönetim ekranı önceliği: yönetici → acente → tedarikçi → personel → katalog.
 * Hiçbiri yoksa müşteri hesabı.
 */
export function resolvePostLoginPath(
  permissions: string[],
  roles: RoleAssignment[],
): string {
  const order = [
    '/manage/admin',
    '/manage/agency',
    '/manage/supplier',
    '/manage/staff',
    '/manage/catalog',
  ] as const
  for (const path of order) {
    if (canSeeManageNavPath(path, permissions, roles)) {
      return path
    }
  }
  return '/account'
}
