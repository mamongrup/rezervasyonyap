/**
 * HTTP yanıtlarında bazen tek gövdede birden fazla JSON veya sondaki çöp olur
 * (proxy, hatalı backend birleştirmesi). İlk geçerli JSON değerini çıkarır.
 */

function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, '').trim()
}

function extractBalancedJson(s: string, start: number): string | null {
  const open = s[start]
  if (open !== '{' && open !== '[') return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (esc) {
      esc = false
      continue
    }
    if (inStr) {
      if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') {
      inStr = true
      continue
    }
    if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') {
      depth--
      if (depth === 0) return s.slice(start, i + 1)
    }
  }
  return null
}

function extractFirstJsonValue(s: string): string | null {
  const t = stripBom(s)
  const objStart = t.indexOf('{')
  const arrStart = t.indexOf('[')
  let start = -1
  if (objStart >= 0 && arrStart >= 0) start = Math.min(objStart, arrStart)
  else start = Math.max(objStart, arrStart)
  if (start < 0) return null
  return extractBalancedJson(t, start)
}

/** Önce tam gövde; olmazsa ilk `{`/`[` ile dengeli JSON alt dizisi. */
export function parseLenientJson(text: string): unknown {
  const t = stripBom(text)
  if (!t) throw new Error('empty_json')
  try {
    return JSON.parse(t)
  } catch (firstErr) {
    const sub = extractFirstJsonValue(t)
    if (sub) {
      try {
        return JSON.parse(sub)
      } catch {
        /* fall through */
      }
    }
    throw new Error('invalid_json', { cause: firstErr })
  }
}
