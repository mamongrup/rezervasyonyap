import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { constants as fsConstants, promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { sanitizeFilename, verifyAdminMediaToken } from '@/lib/security'

/** Sharp + `node:fs`; Edge'de çalışmaz. */
export const runtime = 'nodejs'

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
  // Çift katmanlı koruma: önce security.ts sanitizasyonu, sonra yerel sanitizasyon
  const safe = sanitizeFilename(name)
  const base = safe.replace(/\.[^/.]+$/, '')
  return sanitizePathSegment(base) || 'gorsel'
}

function sanitizeLogoSvg(buffer: Buffer): Buffer {
  let svg = buffer.toString('utf8').replace(/^\uFEFF/, '').trim()
  if (!/<svg\b/i.test(svg)) throw new Error('Geçerli bir SVG logo dosyası seçin.')
  svg = svg
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<foreignObject\b[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/(?:href|xlink:href)\s*=\s*(["'])\s*(?:javascript:|https?:|\/\/)[\s\S]*?\1/gi, '')
  return Buffer.from(svg, 'utf8')
}

/**
 * Logo / favicon — genel `site` vitrin profilinden (cover, q60, vivid) ayrı:
 * oran korunur, renk bozulmaz, kayıpsız kalite.
 */
const LOGO_PROFILE: FolderProfile = {
  width: 1600,
  height: 800,
  fit: 'inside',
  vivid: false,
  quality: 100,
  effort: 6,
  thumb: 0,
  sharpen: false,
}

/**
 * `site` klasöründeki marka ve partner logoları.
 * `fixedStem` (brand-logo-*), `prefix=logo` veya `page-builder/partners/…` yolu.
 */
function siteBrandingUploadProfile(
  folder: string,
  fixedStem: string,
  opts?: { prefix?: string; subSegments?: string[] },
): FolderProfile | null {
  if (folder !== 'site') return null
  if (/favicon/i.test(fixedStem)) {
    return {
      width: 512,
      height: 512,
      fit: 'inside',
      vivid: false,
      quality: 100,
      effort: 6,
      thumb: 0,
      sharpen: false,
    }
  }
  if (/^brand-logo/i.test(fixedStem)) return { ...LOGO_PROFILE }
  const prefix = (opts?.prefix ?? '').toLowerCase()
  const segs = opts?.subSegments ?? []
  const isPartnerLogo =
    prefix === 'logo' || segs.some((s) => s.toLowerCase() === 'partners')
  if (isPartnerLogo) return { ...LOGO_PROFILE }
  return null
}

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads')
const MAX_SIZE = 8 * 1024 * 1024 // 8 MB
/** Giriş formatları serbest; raster çıktı her zaman `.avif` (PDF hariç). */
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg', 'ico'])
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
  /** AVIF quality (PSI/dosya dengesi; ilan galerisi yükseltildi — logo/belge 80+) */
  quality: number
  /** AVIF effort 0–9 (yüksek = daha küçük dosya, daha yavaş encode) */
  effort: number
  /** >0 ise aynı stem + `-thumb.avif` 1:1 kare üretilir (kart/grid önizleme) */
  thumb: number
  /** false: logo/grafik — unsharp mask uygulanmaz (düz renklerde artefakt önlenir) */
  sharpen?: boolean
}

/**
 * Kod-içi fallback profilleri — backend `image_upload_profiles` tablosu
 * okunamadığında devreye girer (DB indirmesi, ağ kesintisi, eski deploy).
 * Yönetim panelindeki PSI defaults ile birebir aynıdır.
 */
const FALLBACK_PROFILES: Record<string, FolderProfile> = {
  hero:           { width: 1440, height: 810,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb: 256 },
  regions:        { width: 1080, height: 720,  fit: 'cover',  vivid: true,  quality: 60, effort: 6, thumb: 256 },
  listings:       { width: 1600, height: 1200, fit: 'cover',  vivid: true,  quality: 90, effort: 6, thumb: 384 },
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

// Minimum kabul edilebilir boyut: hedefin %50'si (altı bulanık görünür)
const MIN_RATIO = 0.5

/** Buffer → Uint8Array (Node 22+ tip uyumluluğu için) */
function toUint8Array(buf: Buffer): Uint8Array {
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
}

/** SVG vektör → raster; diğer formatlar doğrudan sharp'a verilir. */
function sharpFromUploadBuffer(buffer: Buffer, originalExt: string) {
  const input = toUint8Array(buffer)
  if (originalExt === 'svg') {
    return sharp(input, { density: 220, limitInputPixels: false })
  }
  return sharp(input, { failOn: 'none', limitInputPixels: false })
}

async function processImage(
  buffer: Buffer,
  profile: FolderProfile,
  originalExt: string,
): Promise<{ output: Buffer; thumb?: Buffer; warning?: string }> {
  const meta = await sharpFromUploadBuffer(buffer, originalExt).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0

  const undersized =
    w < profile.width * MIN_RATIO || h < profile.height * MIN_RATIO
  const warning = undersized
    ? `Resim çok küçük (${w}×${h}px). Önerilen minimum ${Math.ceil(profile.width * MIN_RATIO)}×${Math.ceil(profile.height * MIN_RATIO)}px; büyütülmedi, yalnızca AVIF olarak kaydedildi.`
    : undefined

  let pipeline = sharpFromUploadBuffer(buffer, originalExt).resize(profile.width, profile.height, {
    fit: profile.fit,
    position: profile.fit === 'cover' ? 'attention' : undefined,
    /** Küçük görseller bulanık büyütülmesin; yine de çıktı her zaman AVIF. */
    withoutEnlargement: profile.fit === 'inside' || undersized,
  })

  if (profile.vivid) {
    pipeline = pipeline
      .modulate({ saturation: 1.18, brightness: 1.04 })
      .linear(1.05, -(255 * 0.05 * 0.5))
  }

  /**
   * Resize sonrası unsharp mask: küçültme işlemi görüntüyü hafifçe yumuşatır.
   * Logo/grafik profillerinde kapalı — düz renklerde hale/artefakt üretmesin.
   */
  if (profile.sharpen !== false) {
    pipeline = pipeline.sharpen({ sigma: 0.8, m1: 0, m2: 1.5 })
  }

  /**
   * quality ≥ 85 iken chroma subsampling 4:4:4 → daha doğru renk üretimi.
   * quality < 85 ise 4:2:0 (daha küçük dosya) varsayılanı kalır.
   * quality 100: lossless AVIF (logo).
   */
  const chromaSubsampling = profile.quality >= 85 ? '4:4:4' : '4:2:0'
  const avifOpts =
    profile.quality >= 100
      ? { lossless: true as const, effort: profile.effort }
      : { quality: profile.quality, effort: profile.effort, chromaSubsampling }
  const output = await pipeline.avif(avifOpts).toBuffer()

  /**
   * Thumbnail: kart/grid sayfalarında (listings, tours, events, …) ana görselin
   * yanında küçük versiyon. `attention` ile öne çıkan bölge merkez alınır.
   * 384px'te quality:90 gereksiz; 78 görsel fark yaratmaksızın dosyayı küçültür.
   */
  const thumbQuality = Math.min(profile.quality, 78)
  let thumb: Buffer | undefined
  if (profile.thumb > 0) {
    thumb = await sharpFromUploadBuffer(buffer, originalExt)
      .resize({
        width: profile.thumb,
        height: profile.thumb,
        fit: 'cover',
        position: 'attention',
        withoutEnlargement: true,
      })
      .sharpen({ sigma: 0.6, m1: 0, m2: 1.5 })
      .avif({ quality: thumbQuality, effort: profile.effort })
      .toBuffer()
  }

  return { output, thumb, warning }
}

export async function POST(req: NextRequest) {
  // JWT doğrulaması — backend /auth/me ile token geçerliliği kontrol edilir
  const cookieStore = await cookies()
  const token = cookieStore.get('travel_auth_token')?.value
  const auth = await verifyAdminMediaToken(token)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: auth.status })
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

    // Dosya adı güvenliği: orijinal adı sanitize et
    const safeFileName = sanitizeFilename(file.name)
    const fileExt = safeFileName.split('.').pop()?.toLowerCase() ?? ''
    const isImageType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXT.has(fileExt)
    const isDocType =
      folder === 'supplier-docs' && (DOC_ALLOWED_TYPES.has(file.type) || DOC_ALLOWED_EXTS.has(fileExt))

    if (!isImageType && !isDocType && file.type !== '') {
      const allowedMsg =
        folder === 'supplier-docs'
          ? 'Geçersiz dosya türü. JPEG, PNG, WebP, AVIF, GIF, SVG, ICO veya PDF yükleyin. Görseller AVIF olarak kaydedilir.'
          : 'Geçersiz dosya türü. JPEG, PNG, WebP, AVIF, GIF, SVG veya ICO yükleyin. Kayıt her zaman AVIF olur.'
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
    // Güvenli dosya adından uzantıyı al
    const originalExt = safeFileName.split('.').pop()?.toLowerCase() ?? 'bin'

    const isPdf = isDocType && (file.type === 'application/pdf' || originalExt === 'pdf')

    let outputBuffer: Buffer
    let thumbBuffer: Buffer | undefined
    let ext: string
    let warning: string | undefined

    const isBrandLogo = fixedStem === 'brand-logo-light' || fixedStem === 'brand-logo-dark'
    if (isBrandLogo && originalExt !== 'svg' && file.type !== 'image/svg+xml') {
      return NextResponse.json(
        { ok: false, error: 'Logo için yalnızca SVG dosyası yükleyebilirsiniz.' },
        { status: 400 },
      )
    }

    if (isBrandLogo) {
      outputBuffer = sanitizeLogoSvg(rawBuffer)
      ext = 'svg'
    } else if (isPdf) {
      outputBuffer = rawBuffer
      ext = 'pdf'
    } else {
      const profile =
        siteBrandingUploadProfile(folder, fixedStem, { prefix, subSegments }) ??
        (await getProfile(folder))
      try {
        const result = await processImage(rawBuffer, profile, originalExt)
        outputBuffer = result.output
        thumbBuffer = result.thumb
        warning = result.warning
        ext = 'avif'
      } catch (sharpErr) {
        /**
         * Profil pipeline başarısız olursa minimal AVIF denenir; görsel çıktı her zaman .avif olmalı.
         */
        console.error('[upload-image] sharp', sharpErr)
        try {
          outputBuffer = await sharpFromUploadBuffer(rawBuffer, originalExt)
            .rotate()
            .avif({ quality: profile.quality, effort: profile.effort })
            .toBuffer()
          thumbBuffer = undefined
          warning =
            'Görsel profil ile işlenemedi; basit AVIF dönüşümü uygulandı. (Özel format veya dosya bütünlüğü sorunu olabilir.)'
          ext = 'avif'
        } catch (fallbackErr) {
          console.error('[upload-image] sharp fallback avif', fallbackErr)
          return NextResponse.json(
            {
              ok: false,
              error:
                'Görsel AVIF formatına dönüştürülemedi. Dosyayı JPEG veya PNG olarak kaydedip tekrar deneyin.',
            },
            { status: 400 },
          )
        }
      }
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
        if (Number.isFinite(n) && n >= 1 && n <= 100) seq = n
      }
    }

    let finalStem: string
    if (fixedStem) {
      finalStem = fixedStem
    } else {
      const fromName = stemFromOriginalFilename(safeFileName)
      if (seq != null) {
        finalStem = `${stemBase}-${seq}`
      } else {
        const nextIdx = await nextSequentialIndex(uploadDir, stemBase, ext)
        finalStem = `${stemBase}-${nextIdx}`
      }
    }

    const outName = `${finalStem}.${ext}`
    const outPath = path.join(uploadDir, outName)

    // Son savunma: çıktı yolunun uploads kökü içinde olduğunu doğrula
    const resolvedOut = path.resolve(outPath)
    const relOut = path.relative(path.resolve(UPLOADS_ROOT), resolvedOut)
    if (relOut.startsWith('..') || path.isAbsolute(relOut)) {
      return NextResponse.json({ ok: false, error: 'Geçersiz dosya yolu.' }, { status: 400 })
    }

    await fs.writeFile(outPath, Uint8Array.from(outputBuffer))

    let thumbPath: string | undefined
    if (thumbBuffer) {
      const thumbName = `${finalStem}-thumb.avif`
      thumbPath = path.join(uploadDir, thumbName)
      await fs.writeFile(thumbPath, Uint8Array.from(thumbBuffer))
    }

    // Göreli yol (public/uploads/... — Next.js statik servis eder)
    const publicRel = path.relative(path.join(process.cwd(), 'public'), resolvedOut).replace(/\\/g, '/')

    const publicUrl = `/${publicRel}`
    return NextResponse.json({
      ok: true,
      path: publicUrl,
      url: publicUrl,
      thumb: thumbPath
        ? `/${path.relative(path.join(process.cwd(), 'public'), thumbPath).replace(/\\/g, '/')}`
        : undefined,
      warning,
    })
  } catch (err: any) {
    console.error('[upload-image]', err)
    return NextResponse.json(
      { ok: false, error: err?.message || 'Yükleme sırasında beklenmeyen bir hata oluştu.' },
      { status: 500 },
    )
  }
}
