/**
 * Kampanya `campaign_type` kodlarının kullanıcıya gösterilecek etiketleri.
 * Ham slug/snake_case değerler vitrin veya bildirimde asla gösterilmez.
 */

const LABELS_TR: Record<string, string> = {
  card_installment: 'Kart taksiti',
  listing_discount: 'İlan indirimi',
  early_booking: 'Erken rezervasyon',
  last_minute: 'Son dakika',
  special_date: 'Özel tarih',
  birthday_member: 'Üye doğum günü',
  date_range: 'Tarih aralığı',
  custom: 'Özel kampanya',
  flash: 'Flaş kampanya',
  coupon: 'Kupon',
  package_holiday: 'Paket tatil',
}

const LABELS_EN: Record<string, string> = {
  card_installment: 'Card installments',
  listing_discount: 'Listing discount',
  early_booking: 'Early booking',
  last_minute: 'Last minute',
  special_date: 'Special date',
  birthday_member: 'Member birthday',
  date_range: 'Date range',
  custom: 'Custom campaign',
  flash: 'Flash sale',
  coupon: 'Coupon',
  package_holiday: 'Package holiday',
}

/** Bilinen tür için yerelleştirilmiş etiket; bilinmiyorsa boş (ham slug gösterme). */
export function campaignTypeLabel(type: string | null | undefined, locale = 'tr'): string {
  const key = (type ?? '').trim().toLowerCase()
  if (!key) return ''
  const lang = (locale.split('-')[0] ?? 'tr').toLowerCase()
  const table = lang === 'en' ? LABELS_EN : LABELS_TR
  return table[key] ?? ''
}
