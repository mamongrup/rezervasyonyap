import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import {
  EMPTY_POPUPS_CONFIG,
  popupMatchesPageAndLocale,
  sanitizePopupsConfig,
  type PopupItem,
  type PopupsConfig,
} from '@/lib/popups-types'

/**
 * GET /api/popups/active?page=<key>&locale=<code>
 *
 * Genel kullanıcı endpoint'i. Sayfa anahtarına ve dile göre eligible popup'ları
 * (etkin + sayfa hedef + dil hedef + takvim aktif) döner. Cihaz / kitle / sıklık
 * istemcide değerlendirilir (localStorage + auth çerezi vb.).
 */

const CONFIG_FILE = path.join(process.cwd(), 'public', 'popups', 'config.json')

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

function safeKey(raw: string | null): string {
  if (!raw) return ''
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96)
}

function safeLocale(raw: string | null): string {
  if (!raw) return ''
  const v = raw.trim().toLowerCase()
  return /^[a-z]{2}(-[a-z0-9]{1,8})?$/i.test(v) ? v : ''
}

export async function GET(req: NextRequest) {
  const pageKey = safeKey(req.nextUrl.searchParams.get('page')) || 'homepage'
  const locale = safeLocale(req.nextUrl.searchParams.get('locale')) || 'tr'

  const config = await readConfigFromDisk()
  const now = Date.now()

  const eligible: PopupItem[] = config.popups
    .filter((p) => popupMatchesPageAndLocale(p, { pageKey, locale, now }))
    .sort((a, b) => b.priority - a.priority)

  return NextResponse.json(
    { ok: true, popups: eligible, locale, pageKey },
    {
      headers: {
        // Yeni içerikler hızla yansısın diye CDN cache'i kısa tutuyoruz.
        'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
      },
    },
  )
}
