import locationMap from '@/data/yacht-marina-locations.json'
import { stripStayLocationMarketingSuffix } from '@/lib/stay-location-display'

type LocEntry = { place?: string; district?: string; province?: string }

const LOCATION_MAP = locationMap as Record<string, LocEntry>

function locKey(text: string): string {
  return stripStayLocationMarketingSuffix(text)
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

function titleCaseTr(text: string): string {
  return String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1).toLocaleLowerCase('tr'))
    .join(' ')
}

export function formatYachtLocationPin(parts: LocEntry): string {
  const out: string[] = []
  const add = (v?: string) => {
    const s = stripStayLocationMarketingSuffix(String(v ?? '').trim())
    if (!s) return
    const t = titleCaseTr(s)
    if (!out.some((x) => x.toLocaleLowerCase('tr') === t.toLocaleLowerCase('tr'))) out.push(t)
  }
  add(parts.place)
  add(parts.district)
  add(parts.province)
  return out.join(', ')
}

export function lookupYachtLocation(raw: string): LocEntry | null {
  const cleaned = stripStayLocationMarketingSuffix(raw)
  if (!cleaned) return null
  const first = cleaned.split(',')[0]?.trim() ?? cleaned
  const hit = LOCATION_MAP[locKey(first)] ?? LOCATION_MAP[locKey(cleaned)]
  if (hit) return { ...hit }
  return { district: titleCaseTr(first) }
}

export function resolveYachtLocationPin(raw: string | null | undefined): string {
  const text = String(raw ?? '').trim()
  if (!text) return ''
  if (text.includes(',')) {
    const parts = text
      .split(',')
      .map((s) => stripStayLocationMarketingSuffix(s.trim()))
      .filter(Boolean)
    if (parts.length >= 2) {
      const deduped: string[] = []
      for (const p of parts) {
        const t = titleCaseTr(p)
        if (!deduped.some((x) => x.toLocaleLowerCase('tr') === t.toLocaleLowerCase('tr'))) deduped.push(t)
      }
      return deduped.join(', ')
    }
  }
  const hit = lookupYachtLocation(text)
  return hit ? formatYachtLocationPin(hit) : titleCaseTr(stripStayLocationMarketingSuffix(text))
}
