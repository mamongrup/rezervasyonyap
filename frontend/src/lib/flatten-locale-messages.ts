/**
 * İç içe locale nesnesini `common.submit` gibi düz anahtarlara çevirir.
 * Dizi değerleri atlanır (ayrı çeviri satırı yok).
 */
export function flattenLocaleMessages(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  if (obj === null || typeof obj !== 'object') return out
  if (Array.isArray(obj)) return out
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') {
      out[path] = v
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(out, flattenLocaleMessages(v, path))
    }
  }
  return out
}
