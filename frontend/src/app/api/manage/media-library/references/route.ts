import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-dynamic'

const SCAN_DIRS: { abs: string; label: string }[] = [
  { abs: path.join(process.cwd(), 'public', 'page-builder'), label: 'page-builder' },
  { abs: path.join(process.cwd(), 'public', 'sliders'), label: 'sliders' },
]

async function loadJsonSnippets(root: string, label: string): Promise<{ id: string; text: string }[]> {
  const out: { id: string; text: string }[] = []
  let names: string[]
  try {
    names = await fs.readdir(root)
  } catch {
    return out
  }
  for (const n of names) {
    if (!n.endsWith('.json')) continue
    const fp = path.join(root, n)
    try {
      const st = await fs.stat(fp)
      if (!st.isFile()) continue
      const text = await fs.readFile(fp, 'utf-8')
      out.push({ id: `${label}: ${n}`, text })
    } catch {
      /* yoksay */
    }
  }
  return out
}

function needleForRelPath(relPath: string): string | null {
  const n = relPath.replace(/^[\\/]+/, '').trim()
  if (!n || n.length < 2) return null
  return `/uploads/${n}`
}

/**
 * POST `{ paths: string[] }` — Yerel JSON yapılandırmalarında (/uploads/…) geçen dosya yollarını tarar.
 * Şimdilik: `public/page-builder/*.json`, `public/sliders/*.json`.
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  if (!cookieStore.get('travel_auth_token')?.value) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let paths: unknown
  try {
    const body = (await req.json()) as { paths?: unknown }
    paths = body.paths
  } catch {
    return NextResponse.json({ ok: false, error: 'Geçersiz istek.' }, { status: 400 })
  }

  if (!Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ ok: false, error: 'Geçersiz istek.' }, { status: 400 })
  }
  if (paths.length > 200) {
    return NextResponse.json({ ok: false, error: 'Çok fazla dosya.' }, { status: 400 })
  }

  const normalizedPaths = paths
    .map((p) => (typeof p === 'string' ? p.replace(/^[\\/]+/, '').trim() : ''))
    .filter(Boolean)

  const files: { id: string; text: string }[] = []
  for (const { abs, label } of SCAN_DIRS) {
    files.push(...(await loadJsonSnippets(abs, label)))
  }

  const refs: Record<string, string[]> = {}
  for (const relPath of normalizedPaths) {
    const needle = needleForRelPath(relPath)
    const hits: string[] = []
    if (needle) {
      for (const f of files) {
        if (f.text.includes(needle)) {
          hits.push(f.id)
        }
      }
    }
    refs[relPath] = [...new Set(hits)].sort((a, b) => a.localeCompare(b, 'tr'))
  }

  const res = NextResponse.json({
    ok: true,
    refs,
    disclaimer:
      'Tarama yalnızca page-builder ve sliders JSON dosyalarını kapsar; veritabanı veya özel kayıtlar kontrol edilmez.',
  })
  res.headers.set('Cache-Control', 'no-store')
  return res
}
