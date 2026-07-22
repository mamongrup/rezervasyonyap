import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const UPLOADS_PUBLIC_ROOT = path.join(process.cwd(), 'public', 'uploads')

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

export function resolvePublicUploadFilePath(segments: string[]): string | null {
  if (segments.length === 0) return null
  if (segments.some((s) => s === '' || s === '.' || s === '..')) return null
  const joined = path.join(UPLOADS_PUBLIC_ROOT, ...segments)
  const resolved = path.resolve(joined)
  const rootResolved = path.resolve(UPLOADS_PUBLIC_ROOT)
  const prefix = rootResolved.endsWith(path.sep) ? rootResolved : `${rootResolved}${path.sep}`
  if (resolved !== rootResolved && !resolved.startsWith(prefix)) return null
  return resolved
}

/** `public/uploads/**` altından dosya okuyup uzantıya göre Content-Type ile döner */
export async function readUploadSegmentsResponse(segments: string[]): Promise<NextResponse | null> {
  const filePath = resolvePublicUploadFilePath(segments)
  if (!filePath) return null

  try {
    const buf = await readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME[ext] ?? 'application/octet-stream'
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': contentType,
        // Site logoları ve favicon gibi varlıklar admin tarafından değiştirilebilir;
        // 'immutable' yerine kısa TTL + must-revalidate kullan.
        'Cache-Control':
          'public, max-age=86400, s-maxage=2678400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return null
  }
}
