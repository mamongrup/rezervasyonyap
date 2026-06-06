import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/security'

const AUTH_COOKIE = 'travel_auth_token'

/**
 * Yönetim paneli API'leri için JWT doğrulama + izin kontrolü.
 * Çerez yoksa veya backend /auth/me reddederse 401/403 döner.
 */
export async function requireAdminPermission(
  requiredPermission = 'admin.users.read',
): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE)?.value
  const auth = await verifyAdminToken(token, requiredPermission)
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.status === 403 ? 'forbidden' : 'unauthorized' },
      { status: auth.status },
    )
  }
  return null
}

/**
 * @deprecated Yeni kod `requireAdminPermission()` kullanmalı.
 * Geriye uyumluluk: `admin.users.read` ile doğrular.
 */
export async function requireAdminCookie(): Promise<NextResponse | null> {
  return requireAdminPermission('admin.users.read')
}
