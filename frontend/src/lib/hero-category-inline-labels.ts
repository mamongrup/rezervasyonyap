/**
 * Hero ikon şeridi kısa etiketleri — Server bileşenleri (`bolge` sekmeleri vb.) ile paylaşılır.
 * `HeroMenuCategoryBar` ile aynı metinler.
 */

const LABEL_TR: Record<string, string> = {
  oteller: 'Otel',
  'tatil-evleri': 'Villa',
  'yat-kiralama': 'Yat',
  turlar: 'Tur',
  aktiviteler: 'Aktivite',
  kruvaziyer: 'Kruvaziyer',
  'hac-umre': 'Hac & Umre',
  vize: 'Vize',
  'ucak-bileti': 'Uçuş',
  'arac-kiralama': 'Araç',
  feribot: 'Feribot',
  transfer: 'Transfer',
}

const LABEL_EN: Record<string, string> = {
  oteller: 'Hotel',
  'tatil-evleri': 'Villa',
  'yat-kiralama': 'Yacht',
  turlar: 'Tour',
  aktiviteler: 'Activity',
  kruvaziyer: 'Cruise',
  'hac-umre': 'Hajj',
  vize: 'Visa',
  'ucak-bileti': 'Flight',
  'arac-kiralama': 'Car',
  feribot: 'Ferry',
  transfer: 'Transfer',
}

const LABEL_DE: Record<string, string> = {
  oteller: 'Hotel',
  'tatil-evleri': 'Villa',
  'yat-kiralama': 'Yacht',
  turlar: 'Tour',
  aktiviteler: 'Aktivität',
  kruvaziyer: 'Kreuzfahrt',
  'hac-umre': 'Hadsch',
  vize: 'Visum',
  'ucak-bileti': 'Flug',
  'arac-kiralama': 'Auto',
  feribot: 'Fähre',
  transfer: 'Transfer',
}

const LABEL_RU: Record<string, string> = {
  oteller: 'Отель',
  'tatil-evleri': 'Вилла',
  'yat-kiralama': 'Яхта',
  turlar: 'Тур',
  aktiviteler: 'Активность',
  kruvaziyer: 'Круиз',
  'hac-umre': 'Хадж',
  vize: 'Виза',
  'ucak-bileti': 'Рейс',
  'arac-kiralama': 'Авто',
  feribot: 'Паром',
  transfer: 'Трансфер',
}

const LABEL_ZH: Record<string, string> = {
  oteller: '酒店',
  'tatil-evleri': '别墅',
  'yat-kiralama': '游艇',
  turlar: '旅游',
  aktiviteler: '活动',
  kruvaziyer: '邮轮',
  'hac-umre': '朝觐',
  vize: '签证',
  'ucak-bileti': '航班',
  'arac-kiralama': '租车',
  feribot: '渡轮',
  transfer: '接送',
}

const LABEL_FR: Record<string, string> = {
  oteller: 'Hôtel',
  'tatil-evleri': 'Villa',
  'yat-kiralama': 'Yacht',
  turlar: 'Tour',
  aktiviteler: 'Activité',
  kruvaziyer: 'Croisière',
  'hac-umre': 'Hajj',
  vize: 'Visa',
  'ucak-bileti': 'Vol',
  'arac-kiralama': 'Voiture',
  feribot: 'Ferry',
  transfer: 'Transfert',
}

const LABEL_BY_LOCALE: Record<string, Record<string, string>> = {
  tr: LABEL_TR,
  en: LABEL_EN,
  de: LABEL_DE,
  ru: LABEL_RU,
  zh: LABEL_ZH,
  fr: LABEL_FR,
}

export function heroCategoryInlineLabel(locale: string, slug: string, fallback: string): string {
  const lc = (locale || 'tr').toLowerCase().slice(0, 2)
  const map = LABEL_BY_LOCALE[lc] ?? LABEL_EN
  return map[slug] ?? LABEL_EN[slug] ?? fallback
}
