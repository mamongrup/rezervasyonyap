import { NextResponse } from 'next/server'
import { readUploadSegmentsResponse } from '@/lib/serve-upload-file-response'

export const runtime = 'nodejs'

/** Yalnızca `public/uploads/site/**` — diğer `/uploads/` önekleri nginx üzerinden kalabilir */
export async function GET(
  _request: Request,
  context: { params: Promise<{ segments?: string[] }> },
) {
  const { segments } = await context.params
  const parts = segments ?? []
  if (parts.length === 0 || parts[0] !== 'site') {
    return new NextResponse(null, { status: 403 })
  }

  const res = await readUploadSegmentsResponse(parts)
  if (!res) return new NextResponse(null, { status: 404 })
  return res
}
