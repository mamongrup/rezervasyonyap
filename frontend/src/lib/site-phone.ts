/** Görünen telefon metninden `tel:` bağlantısı üretir. */
export function phoneToTelHref(phone: string): string {
  const raw = phone.trim()
  if (!raw) return ''
  // Birden fazla numara ("0850 … - 0532 …") ise ilkini ara
  const first = raw.split(/\s*[-–—|/]\s*/)[0]?.trim() || raw
  const digits = first.replace(/[^\d+]/g, '')
  if (!digits) return ''
  return `tel:${digits}`
}

/** Vitrin telefonu — env/branding boşsa üretimde kullanılan yedek. */
export function resolveDisplayPhone(phone: string | null | undefined): string {
  const t = (phone ?? '').trim()
  if (t) return t
  return '0850 466 0464'
}
