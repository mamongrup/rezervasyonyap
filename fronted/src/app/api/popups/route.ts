import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminCookie } from '@/lib/api-require-admin'
import {
  EMPTY_POPUPS_CONFIG,
  sanitizePopupsConfig,
  type PopupsConfig,
} from '@/lib/popups-types'

/**
 * Site popup yapılandırması — tek dosya: `public/popups/config.json`.
 * Tüm popup'lar burada listelenir; sayfa/dil/cihaz/takvim hedeflemesi popup başına
 * bireysel olarak yapılır (`PopupItem.targeting / schedule / trigger / frequency`).
 *
 * Yönetim panelinden okuma/yazma için kullanılır. Genel kullanıcıların eligibility
 * filtrelenmiş listesi için `/api/popups/active` endpoint'i vardır.
 */

const DATA_DIR = path.join(process.cwd(), 'public', 'popups')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

async function readConfigFromDisk(): Promise<PopupsConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const sanitized = sanitizePopupsConfig(parsed)
    return {
      ...sanitized,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    }
  } catch {
    return { ...EMPTY_POPUPS_CONFIG }
  }
}

/** GET /api/popups — admin: tüm popup yapılandırması */
export async function GET() {
  const config = await readConfigFromDisk()
  return NextResponse.json({ ok: true, config })
}

/** POST /api/popups — admin: tüm popup listesini değiştirir */
export async function POST(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  try {
    const body = (await req.json()) as Record<string, unknown>
    const sanitized = sanitizePopupsConfig(body)
    const config: PopupsConfig = { ...sanitized, updatedAt: new Date().toISOString() }
    await ensureDir()
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
    return NextResponse.json({ ok: true, config })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

/** DELETE /api/popups — admin: tüm popup'ları temizler */
export async function DELETE() {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr
  try {
    await fs.unlink(CONFIG_FILE)
  } catch {
    // dosya yoksa sessiz geç
  }
  return NextResponse.json({ ok: true })
}
