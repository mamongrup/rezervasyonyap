import { readFile } from 'node:fs/promises'

function dayKey(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value ?? '').slice(0, 10)
}

export async function loadBravoCollisionBundle(filePath) {
  const parsed = JSON.parse(await readFile(filePath, 'utf8'))
  if (parsed?.version !== 1 || !Array.isArray(parsed.events) || !Array.isArray(parsed.spaces)) {
    throw new Error(`Gecersiz Bravo collision bundle: ${filePath}`)
  }
  return parsed
}

export function createBundleMysql(bundle) {
  const media = new Map((bundle.media ?? []).map((row) => [Number(row.id), row]))
  const locations = new Map((bundle.locations ?? []).map((row) => [Number(row.id), row]))
  const terms = new Map(Object.entries(bundle.termsBySpace ?? {}))
  const dates = new Map(Object.entries(bundle.datesBySpace ?? {}))

  return {
    async query(sql, params = []) {
      const normalized = String(sql).replace(/\s+/g, ' ').trim().toLowerCase()
      if (normalized.includes(' from media_files ')) {
        return [params.map((id) => media.get(Number(id))).filter(Boolean)]
      }
      if (normalized.includes(' from bravo_locations ')) {
        const row = locations.get(Number(params[0]))
        return [row ? [{ name: row.name }] : []]
      }
      if (normalized.includes(' from bravo_space_term ')) {
        return [terms.get(String(params[0])) ?? []]
      }
      if (normalized.includes(' from bravo_space_dates ')) {
        const rows = (dates.get(String(params[0])) ?? []).map((row) => ({
          ...row,
          day: dayKey(row.day),
        }))
        return [rows]
      }
      throw new Error(`Bundle tarafindan desteklenmeyen Bravo sorgusu: ${normalized.slice(0, 160)}`)
    },
    async end() {},
  }
}
