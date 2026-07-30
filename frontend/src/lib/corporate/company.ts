/**
 * Rezervasyon Yap / Mamon Plus Travel — kurumsal sabitler
 * Kaynak: rezervasyonyap.com.tr (şirket bilgileri); metinler yeniden yazılmıştır.
 */
export const COMPANY = {
  legalName: 'Mamon Özel Eğitim Emlak İnşaat Turizm San. ve Tic. Ltd. Şti.',
  brandName: 'Rezervasyon Yap',
  agencyName: 'Mamon Plus Travel Agency',
  foundedYear: 2010,
  tursabNo: '13127',
  tursabClass: 'A Grubu',
  email: 'info@rezervasyonyap.com.tr',
  phones: {
    reservation: ['+90 532 397 7957', '+90 533 057 7913'],
    office: ['+90 252 613 28 27', '+90 850 466 04 64'],
    accounting: ['+90 532 479 8313'],
  },
  address: {
    line: 'Kesikkapı Mahallesi, Çarşı Caddesi No:254',
    district: 'Kesikkapı',
    city: 'Fethiye',
    region: 'Muğla',
    postalCode: '48300',
    country: 'Türkiye',
    countryCode: 'TR',
    /** Google Maps / LocalBusiness geo — Fethiye Çarşı civarı */
    geo: { latitude: 36.6217, longitude: 29.1164 },
  },
  /** Google Haritalar arama / yol tarifi (GBP Place ID panelden eklenebilir) */
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=Kesikkap%C4%B1+Mahallesi+Çarşı+Caddesi+No:254+Fethiye+Muğla',
  siteUrl: 'https://rezervasyonyap.tr',
  legacySiteUrl: 'https://rezervasyonyap.com.tr',
  internationalSiteUrl: 'https://reservationinturkey.com',
  etbisNote: 'T.C. Ticaret Bakanlığı Elektronik Ticaret Bilgi Sistemi (ETBİS) kayıtlıdır.',
} as const

export function companyAddressFull(): string {
  return `${COMPANY.address.line}, ${COMPANY.address.postalCode} ${COMPANY.address.city}/${COMPANY.address.region}`
}

export function formatTursabLabel(): string {
  return `TÜRSAB ${COMPANY.tursabClass} Belge No: ${COMPANY.tursabNo}`
}

export const COMPANY_PHONE_PRIMARY = COMPANY.phones.reservation[0]
export const COMPANY_PHONE_SECONDARY = COMPANY.phones.reservation[1]
