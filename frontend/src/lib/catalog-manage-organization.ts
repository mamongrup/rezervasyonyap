/**
 * Katalog yönetim ekranlarında yönetici için seçilen `organization_id`.
 * - Tenant rolleri: `user_roles.organization_id` (auth/me)
 * - Saf platform yöneticisi: backend `platform_org_id` ile aynı sabit
 * - Tarayıcıda saklama: e-posta başına ayrı anahtar (hesap değişince karışmaz)
 */

import type { RoleAssignment } from '@/lib/travel-api'

export const CATALOG_MANAGE_ORG_STORAGE_KEY = 'catalog_manage_organization_id'

/** `identity_http.platform_org_id` / SQL seed ile uyumlu platform kurumu */
export const PLATFORM_MANAGE_ORGANIZATION_ID = 'a0000000-0000-4000-8000-000000000001'

export function isManageCatalogAdmin(roles: RoleAssignment[], permissions: string[]): boolean {
  return (
    roles.some((r) => r.role_code === 'admin') ||
    permissions.some((p) => p === 'admin.users.read' || p.startsWith('admin.'))
  )
}

export function firstRoleOrganizationId(roles: RoleAssignment[]): string | null {
  const r = roles.find((x) => x.organization_id && String(x.organization_id).trim())
  const id = r?.organization_id
  return id ? String(id).trim() : null
}

/** Önerilen kurum: önce role bağlı org, yoksa tam yetkili yönetici → platform org */
export function resolveSuggestedCatalogOrganizationId(
  roles: RoleAssignment[],
  permissions: string[],
): string {
  const fromRole = firstRoleOrganizationId(roles)
  if (fromRole) return fromRole
  if (isManageCatalogAdmin(roles, permissions)) return PLATFORM_MANAGE_ORGANIZATION_ID
  return ''
}

function scopedStorageKey(email: string): string | null {
  const norm = email.trim().toLowerCase()
  return norm ? `${CATALOG_MANAGE_ORG_STORAGE_KEY}:${norm}` : null
}

export function readStoredCatalogOrganizationId(email: string): string {
  if (typeof window === 'undefined') return ''
  const scoped = scopedStorageKey(email)
  if (scoped) {
    const v = window.localStorage.getItem(scoped)
    if (v) return v
    const legacy = window.localStorage.getItem(CATALOG_MANAGE_ORG_STORAGE_KEY) ?? ''
    if (legacy) {
      window.localStorage.setItem(scoped, legacy)
      return legacy
    }
    return ''
  }
  return window.localStorage.getItem(CATALOG_MANAGE_ORG_STORAGE_KEY) ?? ''
}

export function writeStoredCatalogOrganizationId(email: string, orgId: string): void {
  const v = orgId.trim()
  if (typeof window === 'undefined' || !v) return
  const scoped = scopedStorageKey(email)
  if (scoped) window.localStorage.setItem(scoped, v)
  window.localStorage.setItem(CATALOG_MANAGE_ORG_STORAGE_KEY, v)
}

/**
 * Yönetici oturumu için başlangıç UUID: kayıtlı değer varsa o; yoksa rol/platform önerisi ve ilk kez kayda yazılır.
 */
export function initCatalogManageOrganizationFromMe(me: {
  email: string
  roles: RoleAssignment[]
  permissions: string[]
}): string {
  const roles = Array.isArray(me.roles) ? me.roles : []
  const perms = Array.isArray(me.permissions) ? me.permissions : []
  if (!isManageCatalogAdmin(roles, perms)) return ''
  const saved = readStoredCatalogOrganizationId(me.email)
  if (saved.trim()) return saved.trim()
  const suggested = resolveSuggestedCatalogOrganizationId(roles, perms)
  if (suggested) writeStoredCatalogOrganizationId(me.email, suggested)
  return suggested
}
