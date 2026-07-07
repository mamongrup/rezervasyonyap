/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { isFullAdminUser } from '@/lib/manage-nav-access'
import { getStoredAuthProfile, getStoredAuthToken } from '@/lib/auth-storage'
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
const AUTH_ME_RETRY_ATTEMPTS = 3
const AUTH_ME_RETRY_DELAY_MS = 1500

function accessFromPerms(
  perms: string[],
  roles: RoleAssignment[],
  required?: ManageAccessOptions,
): AccessState {
  return matchesRequired(perms, roles, required)
    ? { kind: 'ok', permissions: perms, roles }
    : { kind: 'forbidden' }
}

/** 401/403 = gerçek yetki hatası (oturum kapat); diğerleri (timeout/5xx/ağ) geçici. */
function isAuthRejection(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status
  if (status === 401 || status === 403) return true
  const msg = err instanceof Error ? err.message : ''
  return /(^|_)(401|403|unauthorized|forbidden)$/i.test(msg)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function accessFromStoredProfile(required?: ManageAccessOptions): AccessState | null {
  const profile = getStoredAuthProfile()
  if (!profile?.permissions && !profile?.roles) return null
  return accessFromPerms(
    Array.isArray(profile.permissions) ? profile.permissions : [],
    Array.isArray(profile.roles) ? (profile.roles as RoleAssignment[]) : [],
    required,
  )
}

export function useManageAccess(required?: ManageAccessOptions): AccessState {
  // SSR ile aynı ('loading') başla; hydration mismatch olmasın. İyimser durum
  // useEffect içinde (yalnız istemci) hemen set edilir.
  const [state, setState] = useState<AccessState>({ kind: 'loading' })

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setState({ kind: 'no_token' })
      return
    }
    // İyimser: son başarılı profil varsa hemen o rolü göster. Böylece yavaş/500
    // dönen sunucuda sayfa geçişinde kullanıcı giriş ekranına atılmaz; getAuthMe
    // arka planda doğrular, yalnızca GERÇEK 401/403'te oturum kapanır.
    const optimistic = accessFromStoredProfile(required)
    if (optimistic) setState(optimistic)

    let cancelled = false

    async function verify() {
      let lastErr: unknown
      for (let attempt = 0; attempt < AUTH_ME_RETRY_ATTEMPTS; attempt++) {
        let timeoutId: ReturnType<typeof setTimeout> | undefined
        const timeoutReject = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('auth_me_timeout')), AUTH_ME_TIMEOUT_MS)
        })
        try {
          const u = await Promise.race([getAuthMe(token as string), timeoutReject])
          if (timeoutId !== undefined) clearTimeout(timeoutId)
          if (cancelled) return
          const perms = Array.isArray(u.permissions) ? u.permissions : []
          const roles = Array.isArray(u.roles) ? u.roles : []
          setState(accessFromPerms(perms, roles, required))
          return
        } catch (err) {
          if (timeoutId !== undefined) clearTimeout(timeoutId)
          if (cancelled) return
          lastErr = err
          // Gerçek yetki hatası → hemen oturum kapat, tekrar deneme.
          if (isAuthRejection(err)) {
            setState({ kind: 'no_token' })
            return
          }
          // Geçici hata: kısa bekleyip yeniden dene.
          if (attempt < AUTH_ME_RETRY_ATTEMPTS - 1) await sleep(AUTH_ME_RETRY_DELAY_MS)
        }
      }
      if (cancelled) return
      // Tüm denemeler geçici hatayla başarısız: kayıtlı profil varsa kullanıcıyı
      // dışarı atma (iyimser oturum korunur); yoksa giriş iste.
      void lastErr
      const fallback = accessFromStoredProfile(required)
      setState(fallback ?? { kind: 'no_token' })
    }

    void verify()
    return () => {
      cancelled = true
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

