import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getFooterSiteConfigPath } from '@/lib/footer-site-config'
import { DEFAULT_FOOTER_SITE_CONFIG } from '@/lib/footer-site-defaults'
import type { FooterSiteConfig } from '@/types/footer-site-config'

async function requireAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  if (!cookieStore.get('travel_auth_token')?.value) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

const DATA_DIR = path.join(process.cwd(), 'public', 'site-data')
const FILE = path.join(DATA_DIR, 'footer.json')

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function isFooterConfig(x: unknown): x is FooterSiteConfig {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    o.version === 1 &&
    typeof o.taglineTr === 'string' &&
    typeof o.taglineEn === 'string' &&
    Array.isArray(o.columns) &&
    Array.isArray(o.legalLinks) &&
    Array.isArray(o.trustBadges) &&
    o.trustBadges.length === 3
  )
}

/** GET — panel yüklemek için (auth ile); dosya yoksa varsayılan */
export async function GET() {
  const err = await requireAuth()
  if (err) return err

  try {
    const raw = await fs.readFile(FILE, 'utf-8')
    const parsed = JSON.parse(raw) as FooterSiteConfig
    if (!isFooterConfig(parsed)) {
      return NextResponse.json({ ok: true, config: DEFAULT_FOOTER_SITE_CONFIG, fromFile: false })
    }
    return NextResponse.json({ ok: true, config: parsed, fromFile: true })
  } catch {
    return NextResponse.json({ ok: true, config: DEFAULT_FOOTER_SITE_CONFIG, fromFile: false })
  }
}

/** POST — kaydet */
export async function POST(req: NextRequest) {
  const err = await requireAuth()
  if (err) return err

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  if (!isFooterConfig(body)) {
    return NextResponse.json({ ok: false, error: 'Invalid footer config' }, { status: 400 })
  }

  const cfg: FooterSiteConfig = {
    ...body,
    version: 1,
    updatedAt: new Date().toISOString(),
  }

  await ensureDir()
  await fs.writeFile(getFooterSiteConfigPath(), JSON.stringify(cfg, null, 2), 'utf-8')

  return NextResponse.json({ ok: true, savedAt: cfg.updatedAt })
}

/** DELETE — varsayılanlara sıfırla (dosyayı sil) */
export async function DELETE() {
  const err = await requireAuth()
  if (err) return err

  await fs.unlink(FILE).catch(() => null)
  return NextResponse.json({ ok: true })
}
