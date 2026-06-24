import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { resolveOpenAiApiKeyForManage } from '@/lib/manage-deepseek-config'
import { verifyAdminMediaToken } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Quality = 'low' | 'medium' | 'high'

type Body = {
  listing?: {
    id?: string
    slug?: string
    title?: string
    category_code?: string
    theme_codes?: string
  }
  quality?: Quality
  design_theme?: string
  prompt_hint?: string
}

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads')

function safeSegment(raw: string | undefined, fallback: string): string {
  return (raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || fallback
}

function normalizeQuality(raw: unknown): Quality {
  return raw === 'low' || raw === 'high' ? raw : 'medium'
}

function promptFor(body: Body, quality: Quality): string {
  const listing = body.listing ?? {}
  const title = (listing.title ?? 'Tatil ilanı').trim()
  const category = (listing.category_code ?? '').trim()
  const theme = (body.design_theme ?? 'luxury').replace(/_/g, ' ')
  const themeCodes = (listing.theme_codes ?? '').trim()
  const hint = (body.prompt_hint ?? '').trim()
  return [
    'Create a premium square social media cover image for a Turkish travel reservation website.',
    'The design must be a finished marketing poster, not a mockup.',
    `Listing title: ${title}`,
    `Category: ${category || 'holiday home / villa'}`,
    `Design theme: ${theme}`,
    themeCodes ? `Listing theme codes: ${themeCodes}` : '',
    hint ? `Extra design direction: ${hint}` : '',
    `Quality tier requested by user: ${quality}.`,
    'Use a luxury travel advertising style with a clean composition, strong photo-realistic villa/travel atmosphere, elegant typography spaces, and Turkish market taste.',
    'Leave safe space for brand logo, title, region, guest/room/bathroom facts, website, phone and TURSAB number.',
    'Do not invent unreadable text blocks. Do not include random logos, QR codes, watermarks, fake phone numbers or malformed brand names.',
    'Prefer a unique composition for this listing based on the design theme, not a generic template.',
  ].filter(Boolean).join('\n')
}

async function openAiImage(apiKey: string, prompt: string, quality: Quality): Promise<Buffer> {
  if (!apiKey) throw new Error('openai_api_key_missing')
  const model = process.env.OPENAI_SOCIAL_IMAGE_MODEL?.trim() || 'gpt-image-1'
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      size: '1024x1024',
      quality,
      n: 1,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('[social-generate-cover] openai', res.status, text)
    throw new Error(`openai_image_${res.status}`)
  }
  const data = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> }
  const first = data.data?.[0]
  if (first?.b64_json) return Buffer.from(first.b64_json, 'base64')
  if (first?.url) {
    const img = await fetch(first.url)
    if (!img.ok) throw new Error(`openai_image_download_${img.status}`)
    return Buffer.from(await img.arrayBuffer())
  }
  throw new Error('openai_image_empty')
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('travel_auth_token')?.value
  const auth = await verifyAdminMediaToken(token)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.status === 403 ? 'forbidden' : 'unauthorized' }, { status: auth.status })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const listing = body.listing ?? {}
  const slug = safeSegment(listing.slug || listing.title, 'listing')
  const quality = normalizeQuality(body.quality)
  const prompt = promptFor(body, quality)

  try {
    const apiKey = await resolveOpenAiApiKeyForManage(token ?? '')
    if (!apiKey) throw new Error('openai_api_key_missing')
    const raw = await openAiImage(apiKey, prompt, quality)
    const avif = await sharp(raw)
      .resize({ width: 1080, height: 1080, fit: 'cover' })
      .avif({ quality: quality === 'high' ? 88 : quality === 'medium' ? 78 : 64, effort: 6 })
      .toBuffer()

    const dir = path.join(UPLOADS_ROOT, 'social-covers', slug)
    await fs.mkdir(dir, { recursive: true })
    const name = `ai-cover-${Date.now()}-${quality}.avif`
    const abs = path.join(dir, name)
    await fs.writeFile(abs, Uint8Array.from(avif))
    const storageKey = `uploads/social-covers/${slug}/${name}`
    return NextResponse.json({
      ok: true,
      url: `/${storageKey}`,
      storage_key: storageKey,
      quality,
      design_theme: body.design_theme ?? 'luxury',
    })
  } catch (err) {
    const code = err instanceof Error ? err.message : 'cover_generate_failed'
    const status = code === 'openai_api_key_missing' ? 400 : 502
    return NextResponse.json({ error: code }, { status })
  }
}
