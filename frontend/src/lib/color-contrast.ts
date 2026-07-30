/**
 * WCAG kontrast yardımcıları — admin panelinden seçilen marka rengi (logo
 * satır rengi vb.) açık arka planda yetersiz kontrastla kalırsa, aynı tonu
 * koruyarak otomatik koyulaştırır. Panelde kayıtlı renk değişmez; yalnızca
 * ekrana çizilen değer güvenli hale getirilir.
 */

type Rgb = { r: number; g: number; b: number }
type Hsl = { h: number; s: number; l: number }

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

export function parseCssColorToRgb(value: string | undefined | null): Rgb | null {
  const v = String(value || '').trim()
  if (!v) return null

  const hexMatch = v.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hexMatch) {
    let hex = hexMatch[1]
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('')
    }
    const num = Number.parseInt(hex, 16)
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
  }

  const rgbMatch = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)$/i)
  if (rgbMatch) {
    return { r: Number(rgbMatch[1]), g: Number(rgbMatch[2]), b: Number(rgbMatch[3]) }
  }

  return null
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s, l }
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let rp = 0
  let gp = 0
  let bp = 0
  if (h < 60) [rp, gp, bp] = [c, x, 0]
  else if (h < 120) [rp, gp, bp] = [x, c, 0]
  else if (h < 180) [rp, gp, bp] = [0, c, x]
  else if (h < 240) [rp, gp, bp] = [0, x, c]
  else if (h < 300) [rp, gp, bp] = [x, 0, c]
  else [rp, gp, bp] = [c, 0, x]
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  }
}

function channelLuminance(c: number): number {
  const cs = c / 255
  return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4
}

function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function rgbToHex({ r, g, b }: Rgb): string {
  const h = (n: number) => Math.round(clamp01(n / 255) * 255).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

/**
 * `hex` rengi `background` üzerinde WCAG AA (varsayılan 4.5:1) sağlamıyorsa,
 * aynı ton (hue/saturation) korunarak koyulaştırılır. Geçersiz renk veya
 * zaten yeterli kontrast varsa girdi aynen döner.
 */
export function ensureReadableColor(
  color: string | undefined | null,
  background: string = '#ffffff',
  minRatio: number = 4.5,
): string {
  const fallback = typeof color === 'string' && color.trim() ? color.trim() : ''
  const rgb = parseCssColorToRgb(color)
  const bg = parseCssColorToRgb(background) ?? { r: 255, g: 255, b: 255 }
  if (!rgb) return fallback

  if (contrastRatio(rgb, bg) >= minRatio) return fallback || rgbToHex(rgb)

  const bgIsLight = relativeLuminance(bg) > 0.5
  const hsl = rgbToHsl(rgb)
  const passes = (l: number) => contrastRatio(hslToRgb({ ...hsl, l }), bg) >= minRatio

  // Açık arka plan → koyulaştır (L azalt); koyu arka plan → aydınlat (L artır).
  // Bir uç (0 veya 1) her zaman yeterli kontrast sağlar; orijinale en yakın
  // yeten L değeri ikili aramayla bulunur (en az görsel değişim).
  const extremeL = bgIsLight ? 0 : 1
  if (!passes(extremeL)) return rgbToHex(hslToRgb({ ...hsl, l: extremeL }))

  let passingL = extremeL
  let failingL = hsl.l
  for (let i = 0; i < 24; i++) {
    const mid = (passingL + failingL) / 2
    if (passes(mid)) passingL = mid
    else failingL = mid
  }
  return rgbToHex(hslToRgb({ ...hsl, l: passingL }))
}
