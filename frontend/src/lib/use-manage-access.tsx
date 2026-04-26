/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { isFullAdminUser } from '@/lib/manage-nav-access'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getAuthMe, type RoleAssignment } from '@/lib/travel-api'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type ManageAccessOptions = {
  permissionsAny?: string[]
  permissionsPrefixAny?: string[]
  rolesAny?: string[]
  /** Varsa: alt gruplardan herhangi biri eşleşirse erişim (AND yerine OR). */
  oneOf?: ManageAccessOptions[]
}

type AccessState =
  | { kind: 'loading' }
  | { kind: 'no_token' }
  | { kind: 'forbidden' }
  | { kind: 'ok'; permissions: string[]; roles: RoleAssignment[] }

function matchesRequired(
  perms: string[],
  roles: RoleAssignment[],
  required?: ManageAccessOptions,
): boolean {
  /** Yönetici tüm yönetim sayfalarına girebilir (panel geçişi). */
  if (isFullAdminUser(perms, roles)) return true
  if (!required) return true
  if (required.oneOf && required.oneOf.length > 0) {
    return required.oneOf.some((sub) =>
      matchesRequired(perms, roles, {
        permissionsAny: sub.permissionsAny,
        permissionsPrefixAny: sub.permissionsPrefixAny,
        rolesAny: sub.rolesAny,
      }),
    )
  }
  const hasPerm = (code: string) => perms.includes(code)
  const hasPrefix = (prefix: string) => perms.some((p) => p.startsWith(prefix))
  const hasRole = (code: string) => roles.some((r) => r.role_code === code)

  if (required.permissionsAny && required.permissionsAny.length > 0) {
    if (!required.permissionsAny.some(hasPerm)) return false
  }
  if (required.permissionsPrefixAny && required.permissionsPrefixAny.length > 0) {
    if (!required.permissionsPrefixAny.some(hasPrefix)) return false
  }
  if (required.rolesAny && required.rolesAny.length > 0) {
    if (!required.rolesAny.some(hasRole)) return false
  }
  return true
}

const AUTH_ME_TIMEOUT_MS = 25_000

export function useManageAccess(required?: ManageAccessOptions): AccessState {
  const [state, setState] = useState<AccessState>({ kind: 'loading' })

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setState({ kind: 'no_token' })
      return
    }
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const timeoutReject = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('auth_me_timeout')), AUTH_ME_TIMEOUT_MS)
    })
    void Promise.race([getAuthMe(token), timeoutReject])
      .then((u) => {
        if (timeoutId !== undefined) clearTimeout(timeoutId)
        if (cancelled) return
        const perms = Array.isArray(u.permissions) ? u.permissions : []
        const roles = Array.isArray(u.roles) ? u.roles : []
        if (!matchesRequired(perms, roles, required)) {
          setState({ kind: 'forbidden' })
        } else {
          setState({ kind: 'ok', permissions: perms, roles })
        }
      })
      .catch(() => {
        if (timeoutId !== undefined) clearTimeout(timeoutId)
        if (!cancelled) setState({ kind: 'no_token' })
      })
    return () => {
      cancelled = true
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [])

  return state
}

type GuardProps = {
  required?: ManageAccessOptions
  children: React.ReactNode
  featureHint?: string
}

export function ManageAccessGuard({ required, children, featureHint }: GuardProps) {
  const vitrinPath = useVitrinHref()
  const state = useManageAccess(required)

  if (state.kind === 'loading') {
    return (
      <div className="container max-w-2xl py-10">
        <p className="text-neutral-700 dark:text-neutral-300">Yükleniyor…</p>
      </div>
    )
  }

  if (state.kind === 'no_token') {
    return (
      <div className="container max-w-2xl py-10">
        <p className="text-neutral-700 dark:text-neutral-300">
          Bu yönetim sayfasına erişmek için önce giriş yapın.
        </p>
        <Link
          href={vitrinPath('/login')}
          className="mt-4 inline-block font-medium text-primary-600 underline dark:text-primary-400"
        >
          Giriş sayfası
        </Link>
      </div>
    )
  }

  if (state.kind === 'forbidden') {
    return (
      <div className="container max-w-2xl py-10">
        <p className="text-red-700 dark:text-red-300">
          Bu sayfa için gerekli rol veya izinlere sahip değilsiniz.
          {featureHint ? ` (${featureHint})` : null}
        </p>
      </div>
    )
  }

  return <>{children}</>
}

