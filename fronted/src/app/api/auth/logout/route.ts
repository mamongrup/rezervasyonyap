import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { apiOriginForFetch } from '@/lib/api-origin'
import { AUTH_COOKIE_NAME, authCookieClearOptions } from '@/lib/auth-cookie'

/**
 * Tam temiz çıkış:
 *  1. Sunucu tarafı HttpOnly cookie sıfırlanır → tarayıcı artık otomatik
 *     `Authorization` cookie'si göndermez.
 *  2. Backend `DELETE /api/v1/auth/session` çağrılır → DB'deki
 *     `user_sessions` kaydı silinir → token başka bir yerde çalınmış
 *     olsa bile artık geçersizdir.
 *
 * Backend çağrısı **fire-and-forget** mantığında değildir; ama herhangi
 * bir hata kullanıcının çıkışını engellemez (sessizce geçilir, sonraki
 * adımda cookie zaten silinir).
 */
export async function POST() {
  const jar = await cookies()
  const token = jar.get(AUTH_COOKIE_NAME)?.value

  // Tarayıcı cookie'sini her durumda sıfırla
  jar.set(AUTH_COOKIE_NAME, '', authCookieClearOptions())

  if (token) {
    const base = apiOriginForFetch()
    if (base) {
      try {
        await fetch(`${base}/api/v1/auth/session`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
      } catch {
        // Backend ulaşılmazsa bile cookie silindi; client-side state temizlenir.
      }
    }
  }

  return NextResponse.json({ ok: true })
}
