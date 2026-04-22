/**
 * Serbest tuval banner — yüzde tabanlı yerleşim (0–1), export için URL yer tutucu.
 */

export type FreeformLayer = {
  id: string
  /** Tuval içinde sol üst köşe x (0–1) */
  x: number
  y: number
  /** Genişlik / yükseklik oranı tuvalin 0–1 aralığında */
  w: number
  h: number
  /** object-position % (kırpma / odak) */
  focusX: number
  focusY: number
  /** Önizleme (blob:); kalıcı URL yoksa boş */
  src: string
}

/** Katman / kesim kılavuz çizgileri — koordinatlar tuval oranında 0–1 */
export type FreeformGuides = {
  horizontal: number[]
  vertical: number[]
}

export type FreeformBannerDocV2 = {
  version: 2
  outerAspect: '16/9' | '21/9' | '2/1' | '4/3'
  layers: Array<{
    id: string
    x: number
    y: number
    w: number
    h: number
    focusX: number
    focusY: number
    src?: string
    /** Hangi galeri sırası (0,1,2) — yoksa katman indeksi kullanılır */
    slotIndex?: number
  }>
  /** İsteğe bağlı: yatay = y konumu, dikey = x konumu (iç çizgiler, 0 ve 1 değil) */
  guides?: FreeformGuides
}

/** Varsayılan snap eşiği (normalize tuval birimi, ~%1.5) */
export const SNAP_THRESHOLD = 0.015

/** Tek kenarı en yakın kılavuza yapıştırır (eşik içindeyse). */
export function snapEdgeToGuides(val: number, guides: number[], th: number): number {
  for (const g of guides) {
    if (Math.abs(val - g) <= th) return g
  }
  return val
}

/** Taşıma: önce sol kenar, yoksa sağ kenarı hizalar. */
export function snapMoveBox1D(pos: number, len: number, guides: number[], th: number): number {
  const sl = snapEdgeToGuides(pos, guides, th)
  if (sl !== pos) return clamp01(Math.min(sl, 1 - len))
  const srEdge = pos + len
  const sr = snapEdgeToGuides(srEdge, guides, th)
  if (sr !== srEdge) return clamp01(Math.max(0, sr - len))
  return clamp01(pos)
}

/** Boyutlandırma sonrası dört kenarı kılavuzlara yapıştırır. */
export function snapResizeBox(
  x: number,
  y: number,
  w: number,
  h: number,
  vGuides: number[],
  hGuides: number[],
  th: number,
  min = 0.06,
): { x: number; y: number; w: number; h: number } {
  const x2 = x + w
  const y2 = y + h
  let nx = snapEdgeToGuides(x, vGuides, th)
  let nx2 = snapEdgeToGuides(x2, vGuides, th)
  let ny = snapEdgeToGuides(y, hGuides, th)
  let ny2 = snapEdgeToGuides(y2, hGuides, th)
  if (nx2 <= nx) {
    nx = x
    nx2 = x2
  }
  if (ny2 <= ny) {
    ny = y
    ny2 = y2
  }
  let nw = Math.max(min, nx2 - nx)
  let nh = Math.max(min, ny2 - ny)
  nx = clamp01(nx)
  ny = clamp01(ny)
  if (nx + nw > 1) nw = 1 - nx
  if (ny + nh > 1) nh = 1 - ny
  return { x: nx, y: ny, w: nw, h: nh }
}

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

export function docToJson(doc: FreeformBannerDocV2): string {
  return JSON.stringify(doc, null, 2)
}

export function parseFreeformDoc(raw: unknown): FreeformBannerDocV2 | null {
  if (raw == null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.version !== 2) return null
  const outerAspect = o.outerAspect
  if (outerAspect !== '16/9' && outerAspect !== '21/9' && outerAspect !== '2/1' && outerAspect !== '4/3') {
    return null
  }
  if (!Array.isArray(o.layers)) return null
  const layers = o.layers.map((L, i) => {
    const l = L as Record<string, unknown>
    const si = l.slotIndex
    const slotIndex =
      typeof si === 'number' && Number.isFinite(si) ? Math.min(2, Math.max(0, Math.round(si))) : undefined
    return {
      id: typeof l.id === 'string' && l.id.trim() !== '' ? l.id : `layer-import-${i}`,
      x: clamp01(Number(l.x)),
      y: clamp01(Number(l.y)),
      w: clamp01(Number(l.w)),
      h: clamp01(Number(l.h)),
      focusX: Math.min(100, Math.max(0, Number(l.focusX))),
      focusY: Math.min(100, Math.max(0, Number(l.focusY))),
      src: typeof l.src === 'string' ? l.src : '',
      ...(slotIndex !== undefined ? { slotIndex } : {}),
    }
  })
  let guides: FreeformGuides | undefined
  if (o.guides != null && typeof o.guides === 'object') {
    const g = o.guides as Record<string, unknown>
    const h = Array.isArray(g.horizontal) ? g.horizontal.map((n) => clamp01(Number(n))) : []
    const v = Array.isArray(g.vertical) ? g.vertical.map((n) => clamp01(Number(n))) : []
    if (h.length > 0 || v.length > 0) {
      guides = {
        horizontal: [...new Set(h)].filter((p) => p > 0.02 && p < 0.98).sort((a, b) => a - b),
        vertical: [...new Set(v)].filter((p) => p > 0.02 && p < 0.98).sort((a, b) => a - b),
      }
    }
  }

  return { version: 2, outerAspect, layers, ...(guides ? { guides } : {}) }
}

export function freeformToReactSnippet(aspect: FreeformBannerDocV2['outerAspect']): string {
  const ar = aspect.replace('/', ' / ')
  return `'use client'

import Image from 'next/image'

/** freeform-banner JSON (version 2) ile aynı \`layers\` — src'leri kendi URL'lerinizle doldurun */
const LAYERS = [
  { id: '1', x: 0.1, y: 0.1, w: 0.35, h: 0.8, focusX: 50, focusY: 50, src: '/banner-1.jpg' },
] as const

export function FreeformBanner({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{ aspectRatio: '${ar}' }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-neutral-100">
        {LAYERS.map((layer) => (
          <div
            key={layer.id}
            className="absolute overflow-hidden"
            style={{
              left: \`\${layer.x * 100}%\`,
              top: \`\${layer.y * 100}%\`,
              width: \`\${layer.w * 100}%\`,
              height: \`\${layer.h * 100}%\`,
            }}
          >
            <Image
              src={layer.src}
              alt=""
              fill
              className="object-cover"
              style={{ objectPosition: \`\${layer.focusX}% \${layer.focusY}%\` }}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
`
}
