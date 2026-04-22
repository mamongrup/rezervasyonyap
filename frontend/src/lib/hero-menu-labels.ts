/**
 * `menu_items.label_key` → önyüz metni (API menüsü için yedek çeviri).
 */
const HERO_TAB: Record<string, { en: string; tr: string }> = {
  'hero.tab.hotel':    { en: 'Hotel',    tr: 'Otel' },
  'hero.tab.villa':    { en: 'Villa',    tr: 'Villa' },
  'hero.tab.yacht':    { en: 'Yacht',    tr: 'Yat' },
  'hero.tab.tour':     { en: 'Tour',     tr: 'Tur' },
  'hero.tab.activity': { en: 'Activity', tr: 'Aktivite' },
  'hero.tab.visa':     { en: 'Visa',     tr: 'Vize' },
  'hero.tab.flight':   { en: 'Flight',   tr: 'Uçuş' },
  'hero.tab.car':      { en: 'Car',      tr: 'Araç' },
  'hero.tab.ferry':    { en: 'Ferry',    tr: 'Feribot' },
  'hero.tab.transfer': { en: 'Transfer', tr: 'Transfer' },
}

export function heroMenuItemLabel(locale: string, labelKey: string): string {
  const row = HERO_TAB[labelKey]
  if (!row) return labelKey
  return locale.toLowerCase().startsWith('tr') ? row.tr : row.en
}
