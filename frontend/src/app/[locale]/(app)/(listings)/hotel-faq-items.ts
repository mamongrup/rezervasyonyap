/** Otel SSS maddeleri — saf veri; server ve client'tan güvenle çağrılabilir. */

export interface HotelFaqSource {
  /** "14:00–23:00" gibi serbest metin (locale ile gelir) */
  checkInLine?: string
  /** "12:00'a kadar" gibi serbest metin (locale ile gelir) */
  checkOutLine?: string
  /** Ön ödeme yüzdesi metni (örn. "%30") — boşsa gizlenir */
  prepaymentNote?: string | null
  /** İptal politikası serbest metni — boşsa gizlenir */
  cancellationText?: string | null
  /** Kültür ve Turizm Bakanlığı ruhsat numarası — boşsa gizlenir */
  ministryLicenseRef?: string | null
  /** Otelin yemek planı durumu (aksiyon ifadesi için) */
  hasBreakfastIncluded?: boolean
  /** Otele özgü "evcil hayvan kabul ediyor mu?" kuralı (rules listesinden) */
  petPolicyText?: string | null
  /** Otele özgü ek SSS maddeleri (panel) */
  customFaqItems?: Array<{ q: string; a: string }> | null
}

export function buildHotelFaqItems(
  source: HotelFaqSource,
  t: Record<string, string>,
): { q: string; a: string }[] {
  type Item = { q: string; a: string }
  const items: Item[] = []
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

  const checkInLine = str(source.checkInLine)
  const checkOutLine = str(source.checkOutLine)
  if (checkInLine || checkOutLine) {
    const parts = [checkInLine, checkOutLine].filter(Boolean)
    items.push({
      q: t.qCheckInOut ?? 'Check-in ve check-out saatleri nedir?',
      a: parts.join(' · '),
    })
  }

  if (source.hasBreakfastIncluded) {
    items.push({
      q: t.qBreakfast ?? 'Bu otelde kahvaltı sunuluyor mu?',
      a:
        t.aBreakfast ??
        'Evet, otelde kahvaltı sunulmaktadır. Detaylar yemek planı bölümünde yer alır.',
    })
  }

  const prepaymentNote = str(source.prepaymentNote)
  if (prepaymentNote) {
    items.push({
      q: t.qPrepayment ?? 'Rezervasyon için ne kadar ön ödeme alınır?',
      a: prepaymentNote,
    })
  }

  const cancellationText = str(source.cancellationText)
  if (cancellationText) {
    items.push({
      q: t.qCancellation ?? 'Rezervasyonumu nasıl iptal edebilirim?',
      a: cancellationText,
    })
  }

  const petPolicyText = str(source.petPolicyText)
  if (petPolicyText) {
    items.push({
      q: t.qPets ?? 'Evcil hayvan kabul ediyor musunuz?',
      a: petPolicyText,
    })
  }

  const ministryLicenseRef = str(source.ministryLicenseRef)
  if (ministryLicenseRef) {
    items.push({
      q: t.qLicense ?? 'Tesisin Bakanlık ruhsat numarası nedir?',
      a: ministryLicenseRef,
    })
  }

  for (const custom of source.customFaqItems ?? []) {
    const q = str(custom.q)
    const a = str(custom.a)
    if (q && a) items.push({ q, a })
  }

  return items
}
