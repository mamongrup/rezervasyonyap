import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-dynamic'

/** `upload-image` ile aynı kökler — dışarı sızmayı engeller */
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
  site: true,
  icerik: true,
}

const IMAGE_EXT = /\.(avif|webp|jpe?g|png|gif|svg|ico)$/i

const MAX_FILES = 800
const MAX_DEPTH = 10

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads')

type MediaFileRow = {
  relPath: string
  url: string
  size: number
  mtime: string
}

function toPosixRel(p: string): string {
  return p.split(path.sep).filter(Boolean).join('/')
}

async function collectMediaFiles(): Promise<MediaFileRow[]> {
  const rows: MediaFileRow[] = []
  let count = 0

  async function walk(absDir: string, relDir: string, depth: number): Promise<void> {
    if (depth > MAX_DEPTH || count >= MAX_FILES) return

    let dirents: import('node:fs').Dirent[]
    try {
      dirents = await fs.readdir(absDir, { withFileTypes: true })
    } catch {
      return
    }

    for (const d of dirents) {
      if (d.name.startsWith('.')) continue
      const abs = path.join(absDir, d.name)
      const rel = relDir ? path.join(relDir, d.name) : d.name

      if (d.isDirectory()) {
        await walk(abs, rel, depth + 1)
        if (count >= MAX_FILES) return
        continue
      }

      if (!d.isFile()) continue
      if (!IMAGE_EXT.test(d.name)) continue

      try {
        const st = await fs.stat(abs)
        const posixRel = toPosixRel(rel)
        rows.push({
          relPath: posixRel,
          url: `/uploads/${posixRel}`,
          size: st.size,
          mtime: st.mtime.toISOString(),
        })
        count += 1
      } catch {
        /* yoksay */
      }
    }
  }

  let top: import('node:fs').Dirent[] = []
  try {
    top = await fs.readdir(UPLOADS_ROOT, { withFileTypes: true })
  } catch {
    return rows
  }

  for (const d of top) {
    if (!d.isDirectory() || d.name.startsWith('.')) continue
    if (!SAFE_FOLDERS[d.name]) continue
    const abs = path.join(UPLOADS_ROOT, d.name)
    await walk(abs, d.name, 1)
    if (count >= MAX_FILES) break
  }

  rows.sort((a, b) => b.mtime.localeCompare(a.mtime))
  return rows
}

export async function GET() {
  const cookieStore = await cookies()
  if (!cookieStore.get('travel_auth_token')?.value) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await collectMediaFiles()
    const res = NextResponse.json({
      ok: true,
      items,
      truncated: items.length >= MAX_FILES,
    })
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (err) {
    console.error('[media-library]', err)
    return NextResponse.json({ ok: false, error: 'Liste alınamadı.' }, { status: 500 })
  }
}

/**
 * `relPath` biçimi: `hero/foo.avif` veya `branding/alt/bar.webp`.
 * Yalnız `SAFE_FOLDERS` altındaki, `UPLOADS_ROOT` dışına çıkmayan görsel uzantılı
 * dosyalar silinir; sembolik bağlar ve traversal reddedilir.
 */
function resolveSafeUploadPath(relPath: string): string | null {
  if (typeof relPath !== 'string') return null
  const trimmed = relPath.replace(/^[\\/]+/, '').trim()
  if (!trimmed) return null
  if (trimmed.includes('\0')) return null
  const normalized = trimmed.split(/[\\/]+/).filter((s) => s && s !== '.' && s !== '..').join('/')
  if (!normalized) return null
  const segments = normalized.split('/')
  const top = segments[0] ?? ''
  if (!SAFE_FOLDERS[top]) return null
  if (!IMAGE_EXT.test(segments[segments.length - 1] ?? '')) return null
  const abs = path.resolve(UPLOADS_ROOT, normalized)
  const rootWithSep = UPLOADS_ROOT.endsWith(path.sep) ? UPLOADS_ROOT : UPLOADS_ROOT + path.sep
  if (!abs.startsWith(rootWithSep)) return null
  return abs
}

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies()
  if (!cookieStore.get('travel_auth_token')?.value) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Geçersiz istek.' }, { status: 400 })
  }

  const raw = (body as { relPaths?: unknown } | null)?.relPaths
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json({ ok: false, error: 'Silinecek dosya yok.' }, { status: 400 })
  }
  if (raw.length > MAX_FILES) {
    return NextResponse.json({ ok: false, error: 'Tek seferde çok fazla dosya.' }, { status: 400 })
  }

  const deleted: string[] = []
  const failed: { relPath: string; reason: string }[] = []

  for (const entry of raw) {
    const relPath = typeof entry === 'string' ? entry : ''
    const abs = resolveSafeUploadPath(relPath)
    if (!abs) {
      failed.push({ relPath, reason: 'invalid_path' })
      continue
    }
    try {
      const st = await fs.lstat(abs)
      if (!st.isFile()) {
        failed.push({ relPath, reason: 'not_a_file' })
        continue
      }
      await fs.unlink(abs)
      deleted.push(relPath)
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | null)?.code ?? ''
      if (code === 'ENOENT') {
        deleted.push(relPath)
      } else {
        console.error('[media-library:delete]', relPath, err)
        failed.push({ relPath, reason: 'unlink_failed' })
      }
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    deleted,
    failed,
  })
}

/** Yol parçalarını temizler (sadece a-z0-9_- ve `-` tireleri). */
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

/** `branding/logos` gibi bir klasör yolunu güvenli şekilde çözer. */
function resolveSafeFolderPath(relPath: string): { abs: string; norm: string } | null {
  if (typeof relPath !== 'string') return null
  const trimmed = relPath.replace(/^[\\/]+/, '').trim()
  if (!trimmed) return null
  if (trimmed.includes('\0')) return null
  const parts = trimmed
    .split(/[\\/]+/)
    .filter((s) => s && s !== '.' && s !== '..')
    .map((s) => sanitizePathSegment(s))
    .filter(Boolean)
  if (parts.length === 0) return null
  if (parts.length > 8) return null
  const top = parts[0] ?? ''
  if (!SAFE_FOLDERS[top]) return null
  const norm = parts.join('/')
  const abs = path.resolve(UPLOADS_ROOT, norm)
  const rootWithSep = UPLOADS_ROOT.endsWith(path.sep) ? UPLOADS_ROOT : UPLOADS_ROOT + path.sep
  if (!abs.startsWith(rootWithSep)) return null
  return { abs, norm }
}

/** `foo.avif` gibi dosya adını korur ama tehlikeli karakterleri temizler. */
function sanitizeFileName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('\0')) return null
  if (!IMAGE_EXT.test(trimmed)) return null
  const dot = trimmed.lastIndexOf('.')
  const stem = sanitizePathSegment(trimmed.slice(0, dot))
  const ext = trimmed.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!stem || !ext) return null
  return `${stem}.${ext}`
}

/** Hedef klasörde çakışma olursa `stem-2.ext`, `stem-3.ext`, ... dener. */
async function nextAvailableName(destDirAbs: string, fileName: string): Promise<string> {
  const dot = fileName.lastIndexOf('.')
  const stem = fileName.slice(0, dot)
  const ext = fileName.slice(dot)
  let candidate = fileName
  let n = 2
  while (true) {
    try {
      await fs.access(path.join(destDirAbs, candidate))
      candidate = `${stem}-${n}${ext}`
      n += 1
      if (n > 1000) throw new Error('too_many_collisions')
    } catch {
      return candidate
    }
  }
}

type PatchBody =
  | { kind: 'files'; relPaths: string[]; destFolder: string }
  | { kind: 'folder'; source: string; dest: string }

/**
 * PATCH: dosyaları başka klasöre taşı veya bir klasörü yeniden konumlandır.
 * Giriş örnekleri:
 *   { kind: "files", relPaths: ["hero/a.webp"], destFolder: "branding/logos" }
 *   { kind: "folder", source: "branding/eski", dest: "branding/yeni" }
 */
export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  if (!cookieStore.get('travel_auth_token')?.value) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: PatchBody | null = null
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Geçersiz istek.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || !('kind' in body)) {
    return NextResponse.json({ ok: false, error: 'Geçersiz istek.' }, { status: 400 })
  }

  if (body.kind === 'files') {
    const { relPaths, destFolder } = body
    if (!Array.isArray(relPaths) || relPaths.length === 0) {
      return NextResponse.json({ ok: false, error: 'Taşınacak dosya yok.' }, { status: 400 })
    }
    if (relPaths.length > MAX_FILES) {
      return NextResponse.json({ ok: false, error: 'Tek seferde çok fazla dosya.' }, { status: 400 })
    }
    const dest = resolveSafeFolderPath(typeof destFolder === 'string' ? destFolder : '')
    if (!dest) {
      return NextResponse.json({ ok: false, error: 'Geçersiz hedef klasör.' }, { status: 400 })
    }

    try {
      await fs.mkdir(dest.abs, { recursive: true })
    } catch (err) {
      console.error('[media-library:move] mkdir', err)
      return NextResponse.json({ ok: false, error: 'Hedef klasör oluşturulamadı.' }, { status: 500 })
    }

    const moved: { from: string; to: string }[] = []
    const failed: { relPath: string; reason: string }[] = []

    for (const entry of relPaths) {
      const src = typeof entry === 'string' ? entry : ''
      const srcAbs = resolveSafeUploadPath(src)
      if (!srcAbs) {
        failed.push({ relPath: src, reason: 'invalid_source' })
        continue
      }
      const baseName = path.basename(srcAbs)
      const cleanName = sanitizeFileName(baseName)
      if (!cleanName) {
        failed.push({ relPath: src, reason: 'invalid_name' })
        continue
      }
      if (path.dirname(srcAbs) === dest.abs) {
        moved.push({ from: src, to: src })
        continue
      }
      try {
        const targetName = await nextAvailableName(dest.abs, cleanName)
        const targetAbs = path.join(dest.abs, targetName)
        await fs.rename(srcAbs, targetAbs)
        moved.push({ from: src, to: `${dest.norm}/${targetName}` })
      } catch (err) {
        const code = (err as NodeJS.ErrnoException | null)?.code ?? ''
        if (code === 'EXDEV') {
          try {
            const targetName = await nextAvailableName(dest.abs, cleanName)
            const targetAbs = path.join(dest.abs, targetName)
            await fs.copyFile(srcAbs, targetAbs)
            await fs.unlink(srcAbs)
            moved.push({ from: src, to: `${dest.norm}/${targetName}` })
            continue
          } catch (err2) {
            console.error('[media-library:move] copy', src, err2)
          }
        }
        console.error('[media-library:move] rename', src, err)
        failed.push({ relPath: src, reason: 'move_failed' })
      }
    }

    return NextResponse.json({ ok: failed.length === 0, moved, failed })
  }

  if (body.kind === 'folder') {
    const source = resolveSafeFolderPath(typeof body.source === 'string' ? body.source : '')
    const dest = resolveSafeFolderPath(typeof body.dest === 'string' ? body.dest : '')
    if (!source || !dest) {
      return NextResponse.json({ ok: false, error: 'Geçersiz klasör yolu.' }, { status: 400 })
    }
    if (source.norm === dest.norm) {
      return NextResponse.json({ ok: true, from: source.norm, to: dest.norm })
    }
    // hedef kaynak içinde olmasın
    if ((dest.abs + path.sep).startsWith(source.abs + path.sep)) {
      return NextResponse.json({ ok: false, error: 'Hedef, kaynağın içine taşınamaz.' }, { status: 400 })
    }
    // kaynak var mı
    try {
      const st = await fs.stat(source.abs)
      if (!st.isDirectory()) {
        return NextResponse.json({ ok: false, error: 'Kaynak bir klasör değil.' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ ok: false, error: 'Kaynak klasör bulunamadı.' }, { status: 404 })
    }
    // hedef önceden var mı
    try {
      await fs.access(dest.abs)
      return NextResponse.json({ ok: false, error: 'Hedef klasör zaten var.' }, { status: 409 })
    } catch {
      /* yok, devam */
    }
    // hedefin parent'ını oluştur
    const destParent = path.dirname(dest.abs)
    try {
      await fs.mkdir(destParent, { recursive: true })
    } catch (err) {
      console.error('[media-library:move-folder] mkdir', err)
      return NextResponse.json({ ok: false, error: 'Hedef oluşturulamadı.' }, { status: 500 })
    }
    try {
      await fs.rename(source.abs, dest.abs)
      return NextResponse.json({ ok: true, from: source.norm, to: dest.norm })
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | null)?.code ?? ''
      if (code === 'EXDEV') {
        try {
          await fs.cp(source.abs, dest.abs, { recursive: true })
          await fs.rm(source.abs, { recursive: true, force: true })
          return NextResponse.json({ ok: true, from: source.norm, to: dest.norm })
        } catch (err2) {
          console.error('[media-library:move-folder] cp', err2)
        }
      }
      console.error('[media-library:move-folder] rename', err)
      return NextResponse.json({ ok: false, error: 'Klasör taşınamadı.' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: false, error: 'Desteklenmeyen işlem.' }, { status: 400 })
}
