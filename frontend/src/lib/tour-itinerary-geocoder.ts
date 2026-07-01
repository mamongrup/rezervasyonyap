/**
 * Tur program HTML'inden gün bazlı şehir koordinatlarını çıkarır.
 * Wtatil gün başlıkları: "1. Gün: İSTANBUL – İPSALA – THASSOS – SELANİK"
 */

export type TourDayPin = {
  day: number
  title: string
  lat: number
  lng: number
  /** Harita marker etiketi (şehir adı veya gün başlığı) */
  place: string
}

// ─── Şehir koordinat tablosu ──────────────────────────────────────────────────
// Anahtar kelimeler küçük harf, Türkçe İ→i normalize edilmiş

const CITY_COORDS: { keys: string[]; name: string; lat: number; lng: number }[] = [
  // ── Türkiye ──────────────────────────────────────────────────────────────
  { keys: ['istanbul', 'i.stanbul', 'kadikoy', 'mecidiyekoy', 'ataköy'], name: 'İstanbul', lat: 41.0082, lng: 28.9784 },
  { keys: ['ankara', 'esenboga'], name: 'Ankara', lat: 39.9208, lng: 32.8541 },
  { keys: ['izmir', 'i.zmir', 'cesme', 'alacati', 'karsiyaka'], name: 'İzmir', lat: 38.4237, lng: 27.1428 },
  { keys: ['antalya', 'alanya', 'kemer', 'side', 'belek', 'manavgat'], name: 'Antalya', lat: 36.8969, lng: 30.7133 },
  { keys: ['bodrum'], name: 'Bodrum', lat: 37.0333, lng: 27.4333 },
  { keys: ['marmaris'], name: 'Marmaris', lat: 36.8533, lng: 28.2714 },
  { keys: ['fethiye', 'olüdeniz', 'oludeniz'], name: 'Fethiye', lat: 36.6555, lng: 29.1213 },
  { keys: ['dalaman'], name: 'Dalaman', lat: 36.7533, lng: 28.7944 },
  { keys: ['mugla', 'muğla'], name: 'Muğla', lat: 37.2153, lng: 28.3636 },
  { keys: ['bursa', 'uludağ', 'uludag'], name: 'Bursa', lat: 40.1826, lng: 29.0661 },
  { keys: ['konya'], name: 'Konya', lat: 37.8667, lng: 32.4833 },
  { keys: ['kapadokya', 'cappadocia', 'nevsehir', 'nevşehir', 'göreme', 'goreme', 'uçhisar', 'uchisar'], name: 'Kapadokya', lat: 38.6731, lng: 34.8306 },
  { keys: ['pamukkale', 'denizli', 'hierapolis'], name: 'Pamukkale', lat: 37.9222, lng: 29.1208 },
  { keys: ['efes', 'ephesus', 'selçuk', 'selcuk', 'kusadasi', 'kuşadası'], name: 'Efes', lat: 37.9397, lng: 27.3411 },
  { keys: ['bergama', 'pergamon'], name: 'Bergama', lat: 39.1211, lng: 27.1844 },
  { keys: ['trabzon'], name: 'Trabzon', lat: 40.9787, lng: 39.5342 },
  { keys: ['rize', 'uzungol', 'uzungöl'], name: 'Rize', lat: 41.0201, lng: 40.5234 },
  { keys: ['ayder'], name: 'Ayder', lat: 40.9305, lng: 41.2062 },
  { keys: ['samsun'], name: 'Samsun', lat: 41.2867, lng: 36.3300 },
  { keys: ['erzurum'], name: 'Erzurum', lat: 39.9043, lng: 41.2677 },
  { keys: ['van'], name: 'Van', lat: 38.4939, lng: 43.3800 },
  { keys: ['mardin'], name: 'Mardin', lat: 37.3129, lng: 40.7348 },
  { keys: ['gaziantep', 'antep'], name: 'Gaziantep', lat: 37.0594, lng: 37.3825 },
  { keys: ['sanlıurfa', 'şanlıurfa', 'urfa', 'sanliurfa'], name: 'Şanlıurfa', lat: 37.1591, lng: 38.7969 },
  { keys: ['nemrut', 'adıyaman', 'adiyaman'], name: 'Nemrut', lat: 37.9806, lng: 38.7408 },
  { keys: ['diyarbakir', 'diyarbakır'], name: 'Diyarbakır', lat: 37.9144, lng: 40.2306 },
  { keys: ['kars'], name: 'Kars', lat: 40.6050, lng: 43.0950 },
  { keys: ['dogubayazit', 'doğubayazıt', 'agri', 'ağrı'], name: 'Doğubayazıt', lat: 39.5523, lng: 43.3494 },
  { keys: ['edirne', 'ipsala', 'malkara', 'kesan', 'kirklareli'], name: 'Edirne', lat: 41.6767, lng: 26.5557 },
  { keys: ['canakkale', 'çanakkale', 'troy', 'troia'], name: 'Çanakkale', lat: 40.1553, lng: 26.4142 },
  { keys: ['tekirdag', 'tekirdağ'], name: 'Tekirdağ', lat: 40.9833, lng: 27.5167 },
  { keys: ['silivri'], name: 'Silivri', lat: 41.0738, lng: 28.2468 },
  { keys: ['sakarya', 'adapazari'], name: 'Sakarya', lat: 40.7732, lng: 30.3945 },
  { keys: ['bolu', 'abant'], name: 'Bolu', lat: 40.7358, lng: 31.6072 },

  // ── Balkanlar ─────────────────────────────────────────────────────────────
  { keys: ['budva'], name: 'Budva', lat: 42.2857, lng: 18.8399 },
  { keys: ['kotor'], name: 'Kotor', lat: 42.4253, lng: 18.7712 },
  { keys: ['podgorica', 'karadağ', 'karadag', 'montenegro'], name: 'Karadağ', lat: 42.4411, lng: 19.2636 },
  { keys: ['belgrad', 'beograd', 'serbia', 'sirbistan', 'sırbistan'], name: 'Belgrad', lat: 44.7866, lng: 20.4489 },
  { keys: ['novi sad'], name: 'Novi Sad', lat: 45.2671, lng: 19.8335 },
  { keys: ['saraybosna', 'sarajevo', 'bosna', 'mostar', 'bosnia'], name: 'Saraybosna', lat: 43.8519, lng: 18.3866 },
  { keys: ['mostar'], name: 'Mostar', lat: 43.3438, lng: 17.8078 },
  { keys: ['dubrovnik'], name: 'Dubrovnik', lat: 42.6507, lng: 18.0944 },
  { keys: ['split'], name: 'Split', lat: 43.5081, lng: 16.4401 },
  { keys: ['zagreb', 'hirvatistan', 'croatia'], name: 'Zagreb', lat: 45.8150, lng: 15.9819 },
  { keys: ['ljubljana', 'slovenya', 'slovenia'], name: 'Ljubljana', lat: 46.0569, lng: 14.5058 },
  { keys: ['tiran', 'arnavutluk', 'albania'], name: 'Tiran', lat: 41.3275, lng: 19.8187 },
  { keys: ['üsküp', 'uskup', 'skopje', 'makedonya', 'makedonia', 'macedonia'], name: 'Üsküp', lat: 41.9973, lng: 21.4280 },
  { keys: ['ohrid'], name: 'Ohrid', lat: 41.1231, lng: 20.8016 },
  { keys: ['pristine', 'priştine', 'kosova', 'kosovo'], name: 'Priştine', lat: 42.6629, lng: 21.1655 },
  { keys: ['sofya', 'sofia', 'bulgaristan', 'bulgaria'], name: 'Sofya', lat: 42.6977, lng: 23.3219 },
  { keys: ['bucharest', 'bükreş', 'bukres', 'romanya', 'romania'], name: 'Bükreş', lat: 44.4268, lng: 26.1025 },
  { keys: ['braşov', 'brasov', 'transylvan'], name: 'Brașov', lat: 45.6427, lng: 25.5887 },
  { keys: ['varşova', 'varsova', 'warsaw', 'polonya', 'poland'], name: 'Varşova', lat: 52.2297, lng: 21.0122 },
  { keys: ['krakow', 'krakof'], name: 'Krakow', lat: 50.0647, lng: 19.9450 },

  // ── Yunanistan ────────────────────────────────────────────────────────────
  { keys: ['atina', 'athens', 'yunanistan', 'greece'], name: 'Atina', lat: 37.9838, lng: 23.7275 },
  { keys: ['selanik', 'thessaloniki', 'salonika'], name: 'Selanik', lat: 40.6401, lng: 22.9444 },
  { keys: ['kavala'], name: 'Kavala', lat: 40.9393, lng: 24.4012 },
  { keys: ['thassos', 'tasos'], name: 'Thassos', lat: 40.6813, lng: 24.6551 },
  { keys: ['halkidiki', 'halkidhiki', 'chalkidiki'], name: 'Halkidiki', lat: 40.1987, lng: 23.3869 },
  { keys: ['rodos', 'rhodes', 'rhodos'], name: 'Rodos', lat: 36.4354, lng: 28.2174 },
  { keys: ['santorini', 'thira'], name: 'Santorini', lat: 36.3932, lng: 25.4615 },
  { keys: ['mykonos'], name: 'Mykonos', lat: 37.4415, lng: 25.3677 },
  { keys: ['korfu', 'corfu', 'kerkyra'], name: 'Korfu', lat: 39.6243, lng: 19.9217 },
  { keys: ['kipi', 'ipsala'], name: 'Sınır Kapısı', lat: 41.5264, lng: 26.3768 },

  // ── Batı Avrupa ───────────────────────────────────────────────────────────
  { keys: ['paris', 'fransa', 'france'], name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { keys: ['nice', 'niza'], name: 'Nice', lat: 43.7102, lng: 7.2620 },
  { keys: ['lyon'], name: 'Lyon', lat: 45.7640, lng: 4.8357 },
  { keys: ['marsilya', 'marseille', 'marseille'], name: 'Marsilya', lat: 43.2965, lng: 5.3698 },
  { keys: ['roma', 'rome', 'italya', 'italy'], name: 'Roma', lat: 41.9028, lng: 12.4964 },
  { keys: ['floransa', 'florence', 'firenze'], name: 'Floransa', lat: 43.7696, lng: 11.2558 },
  { keys: ['venedik', 'venice', 'venezia'], name: 'Venedik', lat: 45.4408, lng: 12.3155 },
  { keys: ['milan', 'milano'], name: 'Milano', lat: 45.4642, lng: 9.1900 },
  { keys: ['napoli', 'naples'], name: 'Napoli', lat: 40.8518, lng: 14.2681 },
  { keys: ['iskele', 'iscele'], name: 'İskele', lat: 35.2922, lng: 33.8988 },
  { keys: ['barcelona', 'barcelone', 'barselona'], name: 'Barcelona', lat: 41.3851, lng: 2.1734 },
  { keys: ['palma', 'mallorca', 'palma-de-mallorca'], name: 'Palma', lat: 39.5696, lng: 2.6502 },
  { keys: ['hellesylt'], name: 'Hellesylt', lat: 62.0918, lng: 6.8672 },
  { keys: ['kiel'], name: 'Kiel', lat: 54.3233, lng: 10.1228 },
  { keys: ['patmos'], name: 'Patmos', lat: 37.3214, lng: 26.5453 },
  { keys: ['mikonos'], name: 'Mikonos', lat: 37.4467, lng: 25.3289 },
  { keys: ['balear', 'baleares', 'balearic'], name: 'Balear Adaları', lat: 39.5696, lng: 2.6502 },
  { keys: ['madrid', 'ispanya', 'spain'], name: 'Madrid', lat: 40.4168, lng: -3.7038 },
  { keys: ['lizbon', 'lisbon', 'portekiz', 'portugal'], name: 'Lizbon', lat: 38.7223, lng: -9.1393 },
  { keys: ['amsterdam', 'hollanda', 'netherlands'], name: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
  { keys: ['brüksel', 'brusels', 'belcika', 'bruxelles', 'belgium'], name: 'Brüksel', lat: 50.8503, lng: 4.3517 },
  { keys: ['londra', 'london', 'ingiltere', 'england', 'uk'], name: 'Londra', lat: 51.5074, lng: -0.1278 },
  { keys: ['edinburgh', 'iskocya', 'scotland'], name: 'Edinburgh', lat: 55.9533, lng: -3.1883 },
  { keys: ['berlin', 'almanya', 'germany'], name: 'Berlin', lat: 52.5200, lng: 13.4050 },
  { keys: ['münih', 'munich', 'munchen'], name: 'Münih', lat: 48.1351, lng: 11.5820 },
  { keys: ['frankfurt'], name: 'Frankfurt', lat: 50.1109, lng: 8.6821 },
  { keys: ['hamburg'], name: 'Hamburg', lat: 53.5753, lng: 10.0153 },
  { keys: ['köln', 'cologne'], name: 'Köln', lat: 50.9333, lng: 6.9500 },
  { keys: ['viyana', 'vienna', 'avusturya', 'austria'], name: 'Viyana', lat: 48.2082, lng: 16.3738 },
  { keys: ['salzburg'], name: 'Salzburg', lat: 47.8095, lng: 13.0550 },
  { keys: ['innsbruck'], name: 'Innsbruck', lat: 47.2682, lng: 11.3933 },
  { keys: ['budapeşte', 'budapest', 'macaristan', 'hungary'], name: 'Budapeşte', lat: 47.4979, lng: 19.0402 },
  { keys: ['prag', 'prague', 'çek', 'cek', 'czech'], name: 'Prag', lat: 50.0755, lng: 14.4378 },
  { keys: ['zürich', 'zurich', 'isviçre', 'isvicre', 'switzerland', 'cenevre', 'geneva'], name: 'Zürih', lat: 47.3769, lng: 8.5417 },
  { keys: ['interlaken', 'luzern', 'lucerne'], name: 'Luzern', lat: 47.0502, lng: 8.3093 },
  { keys: ['brugge', 'bruges', 'belçika', 'belgika'], name: 'Brugge', lat: 51.2093, lng: 3.2247 },
  { keys: ['kopenhag', 'copenhagen', 'danimarka', 'denmark'], name: 'Kopenhag', lat: 55.6761, lng: 12.5683 },
  { keys: ['stockholm', 'isveç', 'sweden'], name: 'Stockholm', lat: 59.3293, lng: 18.0686 },
  { keys: ['oslo', 'norveç', 'norway'], name: 'Oslo', lat: 59.9139, lng: 10.7522 },
  { keys: ['helsinki', 'finlandiya', 'finland'], name: 'Helsinki', lat: 60.1699, lng: 24.9384 },
  { keys: ['riga', 'letonya', 'latvia'], name: 'Riga', lat: 56.9460, lng: 24.1059 },
  { keys: ['tallinn', 'estonya', 'estonia'], name: 'Tallinn', lat: 59.4370, lng: 24.7536 },
  { keys: ['vilnius', 'litvanya', 'lithuania'], name: 'Vilnius', lat: 54.6872, lng: 25.2797 },

  // ── Doğu Avrupa & Rusya ───────────────────────────────────────────────────
  { keys: ['moskova', 'moscow', 'rusya', 'russia'], name: 'Moskova', lat: 55.7558, lng: 37.6173 },
  { keys: ['saint petersburg', 'st. petersburg', 'leningrad'], name: 'St. Petersburg', lat: 59.9386, lng: 30.3141 },

  // ── Kafkas & Orta Asya ────────────────────────────────────────────────────
  { keys: ['bakü', 'baku', 'azerbaycan', 'azerbaijan'], name: 'Bakü', lat: 40.4093, lng: 49.8671 },
  { keys: ['tiflis', 'tbilisi', 'gürcistan', 'gorcistan', 'georgia'], name: 'Tiflis', lat: 41.6941, lng: 44.8337 },
  { keys: ['batum', 'batumi'], name: 'Batum', lat: 41.6366, lng: 41.6457 },
  { keys: ['kazbegi', 'stepantsminda'], name: 'Kazbegi', lat: 42.6524, lng: 44.6467 },
  { keys: ['erivan', 'yerevan', 'ermenistan', 'armenia'], name: 'Erivan', lat: 40.1872, lng: 44.5152 },
  { keys: ['semerkant', 'samarkand', 'özbekistan', 'uzbekistan'], name: 'Semerkant', lat: 39.6270, lng: 66.9750 },
  { keys: ['buhara', 'bukhara'], name: 'Buhara', lat: 39.7745, lng: 64.4286 },
  { keys: ['taşkent', 'tashkent'], name: 'Taşkent', lat: 41.2995, lng: 69.2401 },

  // ── Orta Doğu ─────────────────────────────────────────────────────────────
  { keys: ['dubai', 'dübai'], name: 'Dubai', lat: 25.2048, lng: 55.2708 },
  { keys: ['abu dhabi', 'abudhabi', 'bae', 'uae'], name: 'Abu Dabi', lat: 24.4539, lng: 54.3773 },
  { keys: ['doha', 'katar', 'qatar'], name: 'Doha', lat: 25.2854, lng: 51.5310 },
  { keys: ['kahire', 'cairo', 'misir', 'mısır', 'egypt'], name: 'Kahire', lat: 30.0444, lng: 31.2357 },
  { keys: ['hurgada', 'hurghada'], name: 'Hurgada', lat: 27.2579, lng: 33.8116 },
  { keys: ['şarm', 'sharm', 'el sheikh'], name: 'Şarm el Şeyh', lat: 27.9158, lng: 34.3300 },
  { keys: ['petra', 'ürdün', 'urdun', 'jordan'], name: 'Petra', lat: 30.3285, lng: 35.4444 },
  { keys: ['amman'], name: 'Amman', lat: 31.9454, lng: 35.9284 },
  { keys: ['kudüs', 'kudus', 'jerusalem', 'israil', 'israel'], name: 'Kudüs', lat: 31.7683, lng: 35.2137 },
  { keys: ['tel aviv'], name: 'Tel Aviv', lat: 32.0853, lng: 34.7818 },
  { keys: ['mekke', 'mecca', 'suudi', 'saudi'], name: 'Mekke', lat: 21.3891, lng: 39.8579 },
  { keys: ['medine', 'medina'], name: 'Medine', lat: 24.4686, lng: 39.6142 },
  { keys: ['cidde', 'jeddah'], name: 'Cidde', lat: 21.4858, lng: 39.1925 },

  // ── Uzak Doğu ─────────────────────────────────────────────────────────────
  { keys: ['tokyo', 'japonya', 'japan'], name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { keys: ['kyoto'], name: 'Kyoto', lat: 35.0116, lng: 135.7681 },
  { keys: ['osaka'], name: 'Osaka', lat: 34.6937, lng: 135.5023 },
  { keys: ['beijing', 'pekin', 'çin', 'cin', 'china'], name: 'Pekin', lat: 39.9042, lng: 116.4074 },
  { keys: ['shanghai', 'şangay'], name: 'Şangay', lat: 31.2304, lng: 121.4737 },
  { keys: ['bangkok', 'tayland', 'thailand'], name: 'Bangkok', lat: 13.7563, lng: 100.5018 },
  { keys: ['phuket'], name: 'Phuket', lat: 7.9519, lng: 98.3381 },
  { keys: ['hanoi', 'vietnam'], name: 'Hanoi', lat: 21.0285, lng: 105.8542 },
  { keys: ['ho chi minh', 'saigon'], name: 'Ho Chi Minh', lat: 10.8231, lng: 106.6297 },
  { keys: ['bali', 'endonezya', 'indonesia'], name: 'Bali', lat: -8.3405, lng: 115.0920 },
  { keys: ['seul', 'seoul', 'kore', 'korea'], name: 'Seul', lat: 37.5665, lng: 126.9780 },
  { keys: ['singapur', 'singapore'], name: 'Singapur', lat: 1.3521, lng: 103.8198 },
  { keys: ['hong kong'], name: 'Hong Kong', lat: 22.3193, lng: 114.1694 },
]

// ─── Normalizasyon ─────────────────────────────────────────────────────────

function normalizeText(t: string): string {
  return t
    .toLowerCase()
    .replace(/\u0069\u0307/g, 'i') // Türkçe İ → i (V8 toLowerCase artefaktı)
    .replace(/\u015f/g, 's')       // ş → s (fuzzy match için)
    .replace(/\u011f/g, 'g')       // ğ → g
    .replace(/\u00fc/g, 'u')       // ü → u
    .replace(/\u00f6/g, 'o')       // ö → o
    .replace(/\u00e7/g, 'c')       // ç → c
    .trim()
}

// Hazırlanmış lookup: normalize edilmiş key → {name, lat, lng}
const CITY_LOOKUP = new Map<string, { name: string; lat: number; lng: number }>(
  CITY_COORDS.flatMap(({ keys, name, lat, lng }) =>
    keys.map((k) => [normalizeText(k), { name, lat, lng }] as const),
  ),
)

export function geocodePlaceName(text: string): { name: string; lat: number; lng: number } | null {
  return findCity(text)
}

/** Metin içinde tanınan ilk/son şehir (gün başlığı veya program metni) */
export function geocodeFromText(text: string): { name: string; lat: number; lng: number } | null {
  return extractCityFromTitle(text)
}

function findCity(text: string): { name: string; lat: number; lng: number } | null {
  const norm = normalizeText(text)
  // Önce tam eşleşme
  if (CITY_LOOKUP.has(norm)) return CITY_LOOKUP.get(norm)!
  // Sonra kısmi eşleşme (ör. "İSTANBUL AVRUPA" içinde "istanbul")
  for (const [key, coords] of CITY_LOOKUP) {
    if (norm.includes(key) || key.includes(norm)) return coords
  }
  return null
}

// ─── Gün başlığı parse ─────────────────────────────────────────────────────

const DAY_HEADING_RE = /(\d+)\.\s*[Gg][üu][Nn]\s*[:\-–]?\s*(.+)/

/**
 * Gün başlığı metnindeki birinci tanınan şehri döndürür.
 * "1. Gün: İSTANBUL – İPSALA" → İstanbul
 * "2. Gün: İPSALA – THASSOS – SELANİK" → Selanik (son şehir tercih edilir)
 */
function extractCityFromTitle(title: string): { name: string; lat: number; lng: number } | null {
  // "–" veya "-" ile bölünmüş şehirleri al
  const parts = title.split(/[–\-→\/|,]+/).map((p) => p.trim()).filter(Boolean)

  // İlk geçerli şehri kullan (varış noktası olarak son şehri tercih et)
  let found: { name: string; lat: number; lng: number } | null = null
  for (const part of parts) {
    const city = findCity(part)
    if (city) {
      found = city
      // Son şehri tercih etmek için continue et (son eşleşmeyi al)
    }
  }
  return found
}

// ─── Ana export ────────────────────────────────────────────────────────────

/**
 * Tur program HTML'inden gün bazlı pin listesi çıkarır.
 * Her günün başlık kısmından tanınan şehri alır.
 * Tanınamayan günler atlanır.
 */
export function parseTourDayPins(programHtml: string): TourDayPin[] {
  if (!programHtml?.trim()) return []

  // HTML etiketlerini temizle
  const plain = programHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, ' ')

  const lines = plain.split('\n')
  const pins: TourDayPin[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    const match = DAY_HEADING_RE.exec(trimmed)
    if (!match) continue

    const day = Number(match[1])
    const title = (match[2] ?? '').trim()
    if (!title) continue

    const city = extractCityFromTitle(title)
    if (!city) continue

    // Aynı günü ikinci kez ekleme
    if (pins.some((p) => p.day === day)) continue

    pins.push({
      day,
      title,
      lat: city.lat,
      lng: city.lng,
      place: city.name,
    })
  }

  return pins.sort((a, b) => a.day - b.day)
}
