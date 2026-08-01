/**
 * POST /api/social/meta-validate
 * Admin: Meta Page Access Token + (opsiyonel) Instagram hesabını Graph API ile doğrular.
 */
import { NextRequest, NextResponse } from 'next/server'
import { validateMetaPageCredentials } from '@/lib/social-auto-post'
import { clearWorkerMetaAuthError } from '@/lib/social-worker-loop-state'
import { verifyAdminToken } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const provided =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ?? ''
  if (!provided) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const auth = await verifyAdminToken(provided, 'admin.social.write')
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 403 ? 'forbidden' : 'unauthorized' },
      { status: auth.status },
    )
  }

  let body: {
    page_id?: string
    page_access_token?: string
    instagram_account_id?: string
  } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const result = await validateMetaPageCredentials({
    page_id: body.page_id,
    page_access_token: body.page_access_token,
    instagram_account_id: body.instagram_account_id,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? 'meta_access_token_invalid' },
      { status: 400 },
    )
  }

  // Yeni token gerçekten seçilen sayfayı temsil ediyorsa önceki worker'ın
  // kalıcı auth uyarısını kaldır. Bekleyen sosyal paylaşım işleri silinmez.
  await clearWorkerMetaAuthError()

  return NextResponse.json(result)
}
