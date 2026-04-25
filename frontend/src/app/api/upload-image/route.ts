import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { constants as fsConstants, promises as fs } from 'node:fs'
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

/** "ilanlar/oteller/otel-slug" veya "icerik/blog/yazi-slug" */
function parseSubPathSegments(raw: string | null): string[] | null {
  if (!raw || !String(raw).trim()) return null
  const parts = String(raw)
    .split(/[/\\]+/)
    .map((p) => sanitizePathSegment(p))
    .filter((p) => p.length > 0)
  if (parts.length === 0) return null
  if (parts.length > 8) return null
  return parts
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** `{stem}-{n}.{ext}` için bir sonraki boş sıra numarası (1–100). */
async function nextSequentialIndex(uploadDir: string, stem: string, ext: string): Promise<number> {
  let files: string[] = []
  try {
    files = await fs.readdir(uploadDir)
  } catch {
    return 1
  }
  const re = new RegExp(`^${escapeRegExp(stem)}-(\\d+)\\.${escapeRegExp(ext)}$`, 'i')
  let max = 0
  for (const f of files) {
    const m = re.exec(f)
    if (m) {
      const n = Number.parseInt(m[1] ?? '', 10)
      if (Number.isFinite(n)) max = Math.max(max, n)
    }
  }
  const next = max + 1
  if (next > 100) {
    throw new Error('Bu klasörde en fazla 100 sıralı görsel desteklenir.')
  }
  return next
}

function stemFromOriginalFilename(name: string): string {
  const base = name.replace(/\.[^/.]+$/, '')
  return sanitizePathSegment(base) || 'gorsel'
}

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads')
const MAX_SIZE = 8 * 1024 * 1024 // 8 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
/** Tedarikçi belgeleri için ek izinli MIME — PDF/dokuman; yalnızca `folder=supplier-docs`. */
const DOC_ALLOWED_TYPES = new Set(['application/pdf'])
const DOC_ALLOWED_EXTS = new Set(['pdf'])

const SAFE_FOLDERS: Record<string, true> = {
  hero: true,
  branding: true,
  general: true,
  regions: true,
  listings: true,
  blog: true,
  pages: true,
  tours: true,
  events: true,
  travel_ideas: true,
  'supplier-docs': true,
  /** Logo, favicon, anasayfa / kategori / bölge vitrin görselleri */
  site: true,
  /** Blog ve CMS sayfa içerik görselleri */
  icerik: true,
}

type FolderProfile = {
  width: number
  height: number
  /** cover: tam boyuta kırp (fotoğraf). inside: oranı koru, kırpma yok (belge). */
  fit: 'cover' | 'inside'
  /** Seyahat fotoğrafları için saturation/brightness boost */
  vivid: boolean
  /** AVIF quality (PSI/dosya boyutu dengesi: fotoğraf 60, logo/belge 80–85) */
  quality: number
  /** AVIF effort 0–9 (yüksek = daha küçük dosya, daha yavaş encode) */
  effort: number
  /** >0 ise aynı stem + `-thumb.avif` 1:1 kare üretilir (kart/grid önizleme) */
  thumb: number
}

/**
 * Kod-içi fallback profilleri — backend `image_upload_profiles` tablosu
 * okunamadığında devreye girer (DB indirmesi, ağ kesintisi, eski deploy).
 * Yönetim panelindeki PSI defaults ile birebir aynıdır.
 */
const FALLBACK_PROFILES: Record<string, FolderProfile> = {
  hero:           { width: 1440, height: 810,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb: 256 },
  regions:        { width: 1080, height: 720,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb: 256 },
  listings:       { width: 800,  height: 600,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb: 256 },
  tours:          { width: 800,  height: 600,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb: 256 },
  events:         { width: 800,  height: 600,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb: 256 },
  travel_ideas:   { width: 800,  height: 600,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb: 256 },
  blog:           { width: 1080, height: 566,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb: 0 },
  pages:          { width: 1080, height: 720,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb: 0 },
  branding:       { width: 800,  height: 600,  fit: 'inside', vivid: false, quality: 82, effort: 6, thumb: 0 },
  site:           { width: 1440, height: 810,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb: 0 },
  icerik:         { width: 1080, height: 720,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb: 0 },
  'supplier-docs':{ width: 1400, height: 2000, fit: 'inside', vivid: false, quality: 82, effort: 6, thumb: 0 },
  general:        { width: 1080, height: 810,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb: 0 },
}

/**
 * In-memory cache: backend HTTP'den profil tablosunu 60 saniyede bir tazeler.
 * Panel'den profil değiştirildiğinde değişiklik en geç 1 dakikada yansır.
 */
const PROFILE_TTL_MS = 60_000
let profileCache: { data: Record<string, FolderProfile>; expiresAt: number } | null = null

async function loadProfilesFromBackend(): Promise<Record<string, FolderProfile>> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL
  if (!apiBase) return FALLBACK_PROFILES
  try {
    const res = await fetch(`${apiBase}/api/v1/media/image-profiles`, { cache: 'no-store' })
    if (!res.ok) return FALLBACK_PROFILES
    const rows: Array<{
      folder: string
      width: number
      height: number
      fit: string
      vivid: boolean
      quality: number
      effort: number
      thumb_size: number
    }> = await res.json()
    const out: Record<string, FolderProfile> = {}
    for (const r of rows) {
      out[r.folder] = {
        width: r.width,
        height: r.height,
        fit: r.fit === 'inside' ? 'inside' : 'cover',
        vivid: !!r.vivid,
        quality: r.quality,
        effort: r.effort,
        thumb: r.thumb_size,
      }
    }
    return Object.keys(out).length > 0 ? out : FALLBACK_PROFILES
  } catch {
    return FALLBACK_PROFILES
  }
}

async function getProfile(folder: string): Promise<FolderProfile> {
  const now = Date.now()
  if (!profileCache || profileCache.expiresAt < now) {
    profileCache = {
      data: await loadProfilesFromBackend(),
      expiresAt: now + PROFILE_TTL_MS,
    }
  }
  return profileCache.data[folder] ?? profileCache.data.general ?? FALLBACK_PROFILES.general!
}

// SVG ve ICO: sharp ile işlenmez, olduğu gibi kaydedilir.
const PASSTHROUGH_TYPES = new Set(['image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'])

// Minimum kabul edilebilir boyut: hedefin %50'si (altı bulanık görünür)
const MIN_RATIO = 0.5

async function processImage(
  buffer: Buffer,
  profile: FolderProfile,
): Promise<{ output: Buffer; thumb?: Buffer; warning?: string }> {
  const meta = await sharp(buffer).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0

  if (w < profile.width * MIN_RATIO || h < profile.height * MIN_RATIO) {
    return {
      output: buffer,
      warning: `Resim çok küçük (${w}×${h}px). En az ${Math.ceil(profile.width * MIN_RATIO)}×${Math.ceil(profile.height * MIN_RATIO)}px yükleyin. İşlem uygulanmadı.`,
    }
  }

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

  const output = await pipeline.avif({ quality: profile.quality, effort: profile.effort }).toBuffer()

  /**
   * Thumbnail: kart/grid sayfalarında (listings, tours, events, …) ana görselin
   * yanında küçük versiyon. `attention` ile öne çıkan bölge merkez alınır.
   */
  let thumb: Buffer | undefined
  if (profile.thumb > 0) {
    thumb = await sharp(buffer)
      .resize({
        width: profile.thumb,
        height: profile.thumb,
        fit: 'cover',
        position: 'attention',
        withoutEnlargement: true,
      })
      .avif({ quality: profile.quality, effort: profile.effort })
      .toBuffer()
  }

  return { output, thumb }
}

export async function POST(req: NextRequest) {
  // Auth guard — middleware zaten yakalamalı; bu ikinci savunma katmanı
  const cookieStore = await cookies()
  if (!cookieStore.get('travel_auth_token')?.value) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ ok: false, error: 'Dosya bulunamadı.' }, { status: 400 })
    }

    let rawFolder = String(formData.get('folder') ?? formData.get('variant') ?? 'general')
    if (rawFolder === 'branding') {
      rawFolder = 'site'
    }
    const folder = SAFE_FOLDERS[rawFolder] ? rawFolder : 'general'

    const fileExt = file.name.split('.').pop()?.toLowerCase() ?? ''
    const isImageType = ALLOWED_TYPES.includes(file.type) || ['svg', 'ico'].includes(fileExt)
    const isDocType =
      folder === 'supplier-docs' && (DOC_ALLOWED_TYPES.has(file.type) || DOC_ALLOWED_EXTS.has(fileExt))

    if (!isImageType && !isDocType && file.type !== '') {
      const allowedMsg =
        folder === 'supplier-docs'
          ? 'Geçersiz dosya türü. JPEG, PNG, WebP, AVIF, SVG, ICO veya PDF yükleyin.'
          : 'Geçersiz dosya türü. JPEG, PNG, WebP, AVIF, SVG veya ICO yükleyin.'
      return NextResponse.json({ ok: false, error: allowedMsg }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: 'Dosya 8 MB sınırını aşıyor.' }, { status: 400 })
    }
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
    } else if (folder === 'icerik') {
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

    // Build output — anlamlı dosya adı; rastgele zaman damgası kullanılmaz
    const rawPrefix = String(formData.get('prefix') ?? formData.get('category') ?? '')
    const prefix = sanitizePathSegment(rawPrefix) || 'gorsel'
    const rawFileBase = String(formData.get('fileBase') ?? '').trim()
    const fileBase = rawFileBase ? sanitizePathSegment(rawFileBase) : ''
    const rawFixedStem = String(formData.get('fixedStem') ?? '').trim()
    const fixedStem = rawFixedStem ? sanitizePathSegment(rawFixedStem) : ''
    const lastSeg =
      subSegments.length > 0 ? subSegments[subSegments.length - 1] ?? '' : ''
    const stemBase = fileBase || prefix || lastSeg || 'gorsel'

    const rawBuffer = Buffer.from(await file.arrayBuffer())
    const originalExt = file.name.split('.').pop()?.toLowerCase() ?? 'bin'

    const isPdf = isDocType && (file.type === 'application/pdf' || originalExt === 'pdf')
    const isPassthrough =
      isPdf || PASSTHROUGH_TYPES.has(file.type) || ['svg', 'ico'].includes(originalExt)

    let outputBuffer: Buffer
    let thumbBuffer: Buffer | undefined
    let ext: string
    let warning: string | undefined

    if (isPdf) {
      outputBuffer = rawBuffer
      ext = 'pdf'
    } else if (isPassthrough) {
      outputBuffer = rawBuffer
      ext = originalExt === 'ico' ? 'ico' : 'svg'
    } else {
      const profile = await getProfile(folder)
      const result = await processImage(rawBuffer, profile)
      outputBuffer = result.output
      thumbBuffer = result.thumb
      warning = result.warning
      ext = warning ? originalExt : 'avif'
    }

    let seq: number | null = null
    const explicitIdx = formData.get('index') ?? formData.get('imageIndex')
    if (explicitIdx != null && String(explicitIdx).trim() !== '') {
      const n = Number.parseInt(String(explicitIdx), 10)
      if (Number.isFinite(n) && n >= 1 && n <= 100) seq = n
    } else {
      const sl = formData.get('slot')
      if (sl != null && String(sl).trim() !== '') {
        const n = Number.parseInt(String(sl), 10)
        if (Number.isFinite(n) && n >= 0 && n <= 99) seq = n + 1
      }
    }

    const useOriginalStem =
      String(formData.get('useOriginalStem') ?? '') === '1' ||
      String(formData.get('useOriginalStem') ?? '') === 'true'

    let filename: string
    if (fixedStem) {
      filename = `${fixedStem}.${ext}`
    } else if (seq != null) {
      filename = `${stemBase}-${seq}.${ext}`
    } else if (useOriginalStem) {
      const fromName = stemFromOriginalFilename(file.name)
      const direct = `${fromName}.${ext}`
      const directPath = path.join(uploadDir, direct)
      try {
        await fs.access(directPath, fsConstants.F_OK)
        const next = await nextSequentialIndex(uploadDir, fromName, ext)
        filename = `${fromName}-${next}.${ext}`
      } catch {
        filename = direct
      }
    } else {
      const next = await nextSequentialIndex(uploadDir, stemBase, ext)
      filename = `${stemBase}-${next}.${ext}`
    }
    await fs.writeFile(
      path.join(uploadDir, filename),
      new Uint8Array(outputBuffer.buffer, outputBuffer.byteOffset, outputBuffer.byteLength),
    )

    /**
     * Aynı stem + `-thumb.avif`: kart/grid'lerde tek bir küçük dosya yüklenir,
     * büyük görsel sadece detay sayfasında istenir.
     */
    let thumbUrl: string | undefined
    if (thumbBuffer && ext === 'avif') {
      const stem = filename.replace(/\.avif$/i, '')
      const thumbName = `${stem}-thumb.avif`
      await fs.writeFile(
        path.join(uploadDir, thumbName),
        new Uint8Array(thumbBuffer.buffer, thumbBuffer.byteOffset, thumbBuffer.byteLength),
      )
      const thumbParts = [folder, ...subSegments, thumbName].filter(Boolean)
      thumbUrl = `/uploads/${thumbParts.join('/')}`
    }

    const relParts = [folder, ...subSegments, filename].filter(Boolean)
    const publicUrl = `/uploads/${relParts.join('/')}`
    return NextResponse.json({
      ok: true,
      url: publicUrl,
      ...(thumbUrl ? { thumbUrl } : {}),
      ...(warning ? { warning } : {}),
    })
  } catch (err) {
    console.error('[upload-image]', err)
    return NextResponse.json({ ok: false, error: 'Yükleme sırasında bir hata oluştu.' }, { status: 500 })
  }
}
