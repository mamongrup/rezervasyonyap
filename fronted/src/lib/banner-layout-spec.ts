import type { CSSProperties } from 'react'

/**
 * Hero / banner mozaik — panelde tasarlanan düzeni JSON olarak saklamak ve
 * Tailwind/React parçacığı üretmek için tip + codegen.
 */

export type BannerLayoutPreset =
  /** [0] üst tam genişlik, [1][2] alt satır yan yana */
  | 'top_1_bottom_2'
  /** [0][1] sol sütun üst üste, [2] sağ tam yükseklik */
  | 'left_2_right_1'
  /** [0] sol tam yükseklik, [1][2] sağ sütun üst üste */
  | 'left_1_right_2'
  /** üç eşit sütun */
  | 'three_cols'
  /** üç eşit satır */
  | 'three_rows'

export type BannerLayoutSpecV1 = {
  version: 1
  preset: BannerLayoutPreset
  /** 0.15–0.85: birincil bölünme (üst yükseklik oranı veya sol genişlik oranı) */
  split: number
  /** Boşluk (px) — referans çizgileri arası */
  gap: number
  /** Dış çerçeve en-boy oranı (önizleme + kod) */
  outerAspect: '16/9' | '21/9' | '2/1' | '4/3'
}

export const DEFAULT_BANNER_SPEC: BannerLayoutSpecV1 = {
  version: 1,
  preset: 'top_1_bottom_2',
  split: 0.5,
  gap: 10,
  outerAspect: '16/9',
}

export function clampSplit(n: number): number {
  return Math.min(0.85, Math.max(0.15, n))
}

export function parseBannerLayoutSpec(raw: unknown): BannerLayoutSpecV1 | null {
  if (raw == null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.version !== 1) return null
  const preset = o.preset as BannerLayoutPreset
  const allowed: BannerLayoutPreset[] = [
    'top_1_bottom_2',
    'left_2_right_1',
    'left_1_right_2',
    'three_cols',
    'three_rows',
  ]
  if (!allowed.includes(preset)) return null
  const split = typeof o.split === 'number' ? clampSplit(o.split) : DEFAULT_BANNER_SPEC.split
  const gap = typeof o.gap === 'number' ? Math.min(32, Math.max(0, Math.round(o.gap))) : DEFAULT_BANNER_SPEC.gap
  const outerAspect =
    o.outerAspect === '16/9' ||
    o.outerAspect === '21/9' ||
    o.outerAspect === '2/1' ||
    o.outerAspect === '4/3'
      ? o.outerAspect
      : DEFAULT_BANNER_SPEC.outerAspect
  return { version: 1, preset, split, gap, outerAspect }
}

/** Önizleme ve tarayıcıda doğrudan kullanım için grid stilleri */
export function specToGridInlineStyle(spec: BannerLayoutSpecV1): CSSProperties {
  const { preset, split: s, gap } = spec
  const g = `${gap}px`
  switch (preset) {
    case 'top_1_bottom_2':
      return {
        display: 'grid',
        gap: g,
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: `${s}fr ${1 - s}fr`,
        gridTemplateAreas: '"a a" "b c"',
      }
    case 'left_2_right_1':
      return {
        display: 'grid',
        gap: g,
        gridTemplateColumns: `${s}fr ${1 - s}fr`,
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: '"a d" "b d"',
      }
    case 'left_1_right_2':
      return {
        display: 'grid',
        gap: g,
        gridTemplateColumns: `${s}fr ${1 - s}fr`,
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: '"a b" "a c"',
      }
    case 'three_cols':
      return {
        display: 'grid',
        gap: g,
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: '"a b c"',
      }
    case 'three_rows':
      return {
        display: 'grid',
        gap: g,
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 1fr 1fr',
        gridTemplateAreas: '"a" "b" "c"',
      }
    default:
      return { display: 'grid', gap: g }
  }
}

/** Slot indeksi 0,1,2 → grid-area harfi */
export function specToSlotAreas(spec: BannerLayoutSpecV1): [string, string, string] {
  switch (spec.preset) {
    case 'top_1_bottom_2':
      return ['a', 'b', 'c']
    case 'left_2_right_1':
      return ['a', 'b', 'd']
    case 'left_1_right_2':
      return ['a', 'b', 'c']
    case 'three_cols':
      return ['a', 'b', 'c']
    case 'three_rows':
      return ['a', 'b', 'c']
    default:
      return ['a', 'b', 'c']
  }
}

/**
 * İnsan tarafından okunabilir Tailwind benzeri açıklama + kritik değerler.
 * (Tam arbitrary grid-area üretimi preset’e göre uzun olduğundan snippet + JSON önerilir.)
 */
export function specToDescriptionTr(spec: BannerLayoutSpecV1): string {
  const pct = Math.round(spec.split * 100)
  switch (spec.preset) {
    case 'top_1_bottom_2':
      return `Üst bant %${pct} yükseklik, alt satır iki sütun (%${100 - pct} kalan). gap ${spec.gap}px.`
    case 'left_2_right_1':
      return `Sol sütun %${pct} genişlik (üst-alt iki görsel), sağ %${100 - pct} tek sütun. gap ${spec.gap}px.`
    case 'left_1_right_2':
      return `Sol %${pct} tek görsel, sağ %${100 - pct} iki görsel üst üste. gap ${spec.gap}px.`
    case 'three_cols':
      return `Üç eşit sütun. gap ${spec.gap}px.`
    case 'three_rows':
      return `Üç eşit satır. gap ${spec.gap}px.`
    default:
      return ''
  }
}

export function specToJson(spec: BannerLayoutSpecV1): string {
  return JSON.stringify(spec, null, 2)
}

export function specToReactSnippet(spec: BannerLayoutSpecV1): string {
  const style = specToGridInlineStyle(spec)
  const areas = specToSlotAreas(spec)
  const styleStr = JSON.stringify(style, null, 2)
  return `'use client'

import Image from 'next/image'

/** banner-layout-spec JSON ile aynı parametreler */
const gridStyle = ${styleStr}

const areas = ${JSON.stringify(areas)} as const

export function HeroBannerMosaic({ images, alt }: { images: [string, string, string]; alt: string }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl" style={{ aspectRatio: '${spec.outerAspect}' }}>
      <div className="grid h-full min-h-0 w-full" style={gridStyle}>
        {areas.map((area, i) => (
          <div
            key={area}
            className="relative min-h-0 min-w-0 overflow-hidden"
            style={{ gridArea: area }}
          >
            <Image src={images[i]} alt={\`\${alt} — \${i + 1}\`} fill className="object-cover" sizes="(max-width:768px)100vw,33vw" />
          </div>
        ))}
      </div>
    </div>
  )
}
`
}
