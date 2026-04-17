import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Yönetim paneli ile aynı oturum çerezi (`travel_auth_token`).
 * Page builder / yükleme API’leriyle uyumlu; rol kontrolü backend’de ayrıca yapılmalı.
 */
export async function requireAdminCookie(): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  if (!cookieStore.get('travel_auth_token')?.value) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
