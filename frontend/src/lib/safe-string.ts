/** API / JSON alanları bazen string yerine number döner — `.trim()` TypeError önlenir. */
export function safeTrim(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  return String(v).trim()
}

export function safeTrimOrNull(v: unknown): string | null {
  const s = safeTrim(v)
  return s ? s : null
}
