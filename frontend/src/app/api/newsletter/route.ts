import { NextResponse } from 'next/server'

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }
  const email =
    typeof body === 'object' && body !== null && 'email' in body
      ? String((body as { email: unknown }).email).trim()
      : ''
  if (!emailRx.test(email)) {
    return NextResponse.json({ error: 'Geçerli bir e-posta girin' }, { status: 400 })
  }

  // Entegrasyon: Brevo, SendGrid, CRM webhook vb.
  return NextResponse.json({ ok: true })
}
