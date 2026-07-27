/**
 * Vitrinde gösterilecek turizm belge numarası.
 * Bravo aktarımında `ministry_license_ref` bazen tüm tourism JSON'u
 * (owner_phone, IBAN, TC …) olarak yazılmış — asla ham JSON/PII gösterme.
 */
export function parsePublicMinistryLicenseRef(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null

  // Ham JSON veya PII anahtarları sızmış düz metin
  const lower = s.toLowerCase()
  if (
    lower.includes('owner_phone') ||
    lower.includes('owner_tc') ||
    lower.includes('owner_iban') ||
    lower.includes('owner_bank') ||
    lower.includes('residence_address')
  ) {
    // JSON ise belge numarasını çekmeyi dene; yoksa gizle
    if (s.startsWith('{')) {
      try {
        const j = JSON.parse(s) as Record<string, unknown>
        const n = pickCertNumber(j)
        return n
      } catch {
        return null
      }
    }
    return null
  }

  if (s.startsWith('{')) {
    try {
      const j = JSON.parse(s) as Record<string, unknown>
      return pickCertNumber(j)
    } catch {
      return null
    }
  }

  // Düz belge no (07-1740 vb.)
  if (s.length > 120) return null
  return s
}

function pickCertNumber(j: Record<string, unknown>): string | null {
  for (const key of [
    'certificate_number',
    'certificateNumber',
    'belge_no',
    'license',
    'number',
    'certificate',
  ]) {
    const v = j[key]
    if (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null') {
      return v.trim()
    }
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return null
}
