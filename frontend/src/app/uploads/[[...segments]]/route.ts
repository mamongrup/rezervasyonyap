import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads')

const MIME: Record<string, string> = {
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
}

function resolvedFileUnderUploads(segments: string[]): string | null {
  if (segments.length === 0) return null
  if (segments.some((s) => s === '' || s === '.' || s === '..')) return null
  const joined = path.join(UPLOADS_ROOT, ...segments)
  const resolved = path.resolve(joined)
  const rootResolved = path.resolve(UPLOADS_ROOT)
  const prefix = rootResolved.endsWith(path.sep) ? rootResolved : `${rootResolved}${path.sep}`
  if (resolved !== rootResolved && !resolved.startsWith(prefix)) return null
  return resolved
}

/**
 * `[locale]` dinamik segmenti `/uploads/...` yollarını yanlışlıkla locale sanıp 404 üretiyordu.
 * Sabit `uploads` segmenti öncelikli eşleşir; dosya `public/uploads/**` altından okunur.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ segments?: string[] }> },
) {
  const { segments } = await context.params
  const parts = segments ?? []
  const filePath = resolvedFileUnderUploads(parts)
  if (!filePath) return new NextResponse(null, { status: 404 })

  try {
    const buf = await readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME[ext] ?? 'application/octet-stream'
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
