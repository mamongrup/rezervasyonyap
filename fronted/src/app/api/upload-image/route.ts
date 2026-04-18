import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

function sanitizePathSegment(s: string): string {
  return s
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
    .slice(0, 96)
}

/** "otel/begonvil-villa" veya "blog/yazi-slug" */
function parseSubPathSegments(raw: string | null): string[] | null {
  if (!raw || !String(raw).trim()) return null
  const parts = String(raw)
    .split(/[/\\]+/)
    .map((p) => sanitizePathSegment(p))
    .filter((p) => p.length > 0)
  if (parts.length === 0) return null
  if (parts.length > 6) return null
  return parts
}

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads')
const MAX_SIZE = 8 * 1024 * 1024 // 8 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']

const SAFE_FOLDERS: Record<string, true> = {
  hero: true, branding: true, general: true,
  regions: true, listings: true, blog: true,
  pages: true, tours: true, events: true,
  travel_ideas: true, 'supplier-docs': true,
}

type FolderProfile = {
  width: number
  height: number
  /** cover: tam boyuta kırp (fotoğraf). inside: oranı koru, kırpma yok (belge). */
  fit: 'cover' | 'inside'
  /** Seyahat fotoğrafları için saturation/brightness boost */
  vivid: boolean
  /** AVIF quality */
  quality: number
}

const FOLDER_PROFILES: Record<string, FolderProfile> = {
  hero:           { width: 1920, height: 1080, fit: 'cover',  vivid: true,  quality: 72 },
  regions:        { width: 1200, height: 800,  fit: 'cover',  vivid: true,  quality: 72 },
  listings:       { width: 1000, height: 750,  fit: 'cover',  vivid: true,  quality: 72 },
  tours:          { width: 1000, height: 750,  fit: 'cover',  vivid: true,  quality: 72 },
  events:         { width: 1000, height: 750,  fit: 'cover',  vivid: true,  quality: 72 },
  travel_ideas:   { width: 1000, height: 750,  fit: 'cover',  vivid: true,  quality: 72 },
  blog:           { width: 1200, height: 630,  fit: 'cover',  vivid: true,  quality: 72 },
  pages:          { width: 1200, height: 800,  fit: 'cover',  vivid: true,  quality: 72 },
  branding:       { width: 800,  height: 600,  fit: 'inside', vivid: false, quality: 85 },
  'supplier-docs':{ width: 1400, height: 2000, fit: 'inside', vivid: false, quality: 82 },
  general:        { width: 1200, height: 900,  fit: 'cover',  vivid: true,  quality: 72 },
}

// SVG ve ICO: sharp ile işlenmez, olduğu gibi kaydedilir.
const PASSTHROUGH_TYPES = new Set(['image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'])

// Minimum kabul edilebilir boyut: hedefin %50'si (altı bulanık görünür)
const MIN_RATIO = 0.5

function buildRasterPipeline(buffer: Buffer, folder: string) {
  const profile = FOLDER_PROFILES[folder] ?? FOLDER_PROFILES.general
  let pipeline = sharp(buffer).resize(profile.width, profile.height, {
    fit: profile.fit,
    position: profile.fit === 'cover' ? 'attention' : undefined,
    withoutEnlargement: profile.fit === 'inside',
  })
  if (profile.vivid) {
    pipeline = pipeline
      .modulate({ saturation: 1.18, brightness: 1.04 })
      .linear(1.05, -(255 * 0.05 * 0.5))
  }
  return { pipeline, profile }
}

/** Windows / bazı libvips kurulumlarında AVIF üretimi düşebilir — webp/jpeg ile yedeklenir */
async function encodeRaster(
  buffer: Buffer,
  folder: string,
): Promise<{ output: Buffer; ext: 'avif' | 'webp' | 'jpg' }> {
  const { pipeline, profile } = buildRasterPipeline(buffer, folder)
  try {
    const output = await pipeline.avif({ quality: profile.quality, effort: 4 }).toBuffer()
    return { output, ext: 'avif' }
  } catch {
    try {
      const { pipeline: p2, profile: pr } = buildRasterPipeline(buffer, folder)
      const output = await p2.webp({ quality: Math.min(92, pr.quality) }).toBuffer()
      return { output, ext: 'webp' }
    } catch {
      const { pipeline: p3 } = buildRasterPipeline(buffer, folder)
      const output = await p3.jpeg({ quality: 88, mozjpeg: true }).toBuffer()
      return { output, ext: 'jpg' }
    }
  }
}

async function processImage(buffer: Buffer, folder: string): Promise<{ output: Buffer; warning?: string; ext?: string }> {
  const profile = FOLDER_PROFILES[folder] ?? FOLDER_PROFILES.general
  const meta = await sharp(buffer).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0

  if (w < profile.width * MIN_RATIO || h < profile.height * MIN_RATIO) {
    return {
      output: buffer,
      warning: `Resim çok küçük (${w}×${h}px). En az ${Math.ceil(profile.width * MIN_RATIO)}×${Math.ceil(profile.height * MIN_RATIO)}px yükleyin. İşlem uygulanmadı.`,
    }
  }

  const { output, ext } = await encodeRaster(buffer, folder)
  return { output, ext }
}

function tokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.toLowerCase().startsWith('bearer ')) {
    const t = auth.slice(7).trim()
    if (t) return t
  }
  return null
}

export async function POST(req: NextRequest) {
  // Oturum: çerez veya Authorization Bearer (çerez yazılamadıysa / eski oturumlar için)
  const cookieStore = await cookies()
  const cookieTok =
    req.cookies.get('travel_auth_token')?.value?.trim() ??
    cookieStore.get('travel_auth_token')?.value?.trim()
  const bearerTok = tokenFromRequest(req)
  if (!cookieTok && !bearerTok) {
    return NextResponse.json(
      { ok: false, error: 'Oturum gerekli. Lütfen tekrar giriş yapın.' },
      { status: 401 },
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ ok: false, error: 'Dosya bulunamadı.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type) && file.type !== '') {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext !== 'svg' && ext !== 'ico') {
        return NextResponse.json(
          { ok: false, error: 'Geçersiz dosya türü. JPEG, PNG, WebP, AVIF, SVG veya ICO yükleyin.' },
          { status: 400 },
        )
      }
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: 'Dosya 8 MB sınırını aşıyor.' }, { status: 400 })
    }

    // Determine folder
    const rawFolder = String(formData.get('folder') ?? formData.get('variant') ?? 'general')
    const folder = SAFE_FOLDERS[rawFolder] ? rawFolder : 'general'
    const baseRoot = path.resolve(UPLOADS_ROOT, folder)

    let subSegments: string[] = []
    const rawSub =
      formData.get('subPath') ?? formData.get('subpath') ?? formData.get('relativePath')
    const parsed = parseSubPathSegments(rawSub != null ? String(rawSub) : null)
    if (parsed) {
      subSegments = parsed
    } else if (folder === 'listings') {
      const cat = formData.get('categorySlug') ?? formData.get('category_slug')
      const lst = formData.get('listingSlug') ?? formData.get('listing_slug')
      if (cat != null && lst != null) {
        const a = sanitizePathSegment(String(cat))
        const b = sanitizePathSegment(String(lst))
        if (a && b) subSegments = [a, b]
      }
    } else if (folder === 'blog') {
      const page = formData.get('pageSlug') ?? formData.get('page_slug')
      if (page != null) {
        const p = sanitizePathSegment(String(page))
        if (p) subSegments = [p]
      }
    }

    let uploadDir = baseRoot
    if (subSegments.length > 0) {
      uploadDir = path.resolve(baseRoot, ...subSegments)
    }
    const relToBase = path.relative(baseRoot, uploadDir)
    if (relToBase.startsWith('..') || path.isAbsolute(relToBase)) {
      return NextResponse.json({ ok: false, error: 'Geçersiz alt yol.' }, { status: 400 })
    }

    await fs.mkdir(uploadDir, { recursive: true })

    // Build output
    const prefix =
      (String(formData.get('prefix') ?? formData.get('category') ?? ''))
        .replace(/[^a-z0-9_-]/gi, '')
        .slice(0, 96) || 'img'
    const rawBuffer = Buffer.from(await file.arrayBuffer())
    const originalExt = file.name.split('.').pop()?.toLowerCase() ?? 'bin'

    const isPassthrough = PASSTHROUGH_TYPES.has(file.type) || ['svg', 'ico'].includes(originalExt)

    let outputBuffer: Buffer
    let ext: string
    let warning: string | undefined

    if (isPassthrough) {
      outputBuffer = rawBuffer
      ext = originalExt === 'ico' ? 'ico' : 'svg'
    } else {
      const result = await processImage(rawBuffer, folder)
      outputBuffer = result.output
      warning = result.warning
      ext = warning ? originalExt : (result.ext ?? 'webp')
    }

    const idxRaw = formData.get('index') ?? formData.get('imageIndex')
    let seq: number | null = null
    if (idxRaw != null && String(idxRaw).trim() !== '') {
      const n = Number.parseInt(String(idxRaw), 10)
      if (Number.isFinite(n) && n >= 1 && n <= 999) seq = n
    }

    const filename =
      seq != null
        ? `${prefix}-${seq}.${ext}`
        : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
    await fs.writeFile(path.join(uploadDir, filename), outputBuffer)

    const relParts = [folder, ...subSegments, filename].filter(Boolean)
    const publicUrl = `/uploads/${relParts.join('/')}`
    return NextResponse.json({ ok: true, url: publicUrl, ...(warning ? { warning } : {}) })
  } catch (err) {
    console.error('[upload-image]', err)
    const detail =
      process.env.NODE_ENV === 'development' && err instanceof Error ? err.message : undefined
    return NextResponse.json(
      {
        ok: false,
        error: detail ? `Yükleme hatası: ${detail}` : 'Yükleme sırasında bir hata oluştu.',
      },
      { status: 500 },
    )
  }
}
