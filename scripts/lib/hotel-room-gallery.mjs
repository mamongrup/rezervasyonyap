/**
 * Otel galeri URL'lerinden oda görseli seçimi.
 * Bookeder/Aegean dosya adları genelde ...-Room.JPEG / ...-Restaurant.JPEG içerir.
 * Alakasız (yemekhane, lobi, plaj, dış cephe) görseller odaya ASLA düşmez.
 */

const ROOM_HARD_RE =
  /(?:^|[-_.])(room|rooms|bedroom|bedrooms|suite|suites|oda|odasi|guestroom|guestrooms|beds?)(?:[-_.]|$)/i

const ROOM_SOFT_RE =
  /(?:^|[-_.])(interior|bathroom|banyo|living|salon|junior.?suite|penthouse|villa.?interior)(?:[-_.]|$)/i

/** Oda galerisine girmemesi gereken sahne etiketleri */
const ROOM_REJECT_RE =
  /(?:^|[-_.])(restaurant|restaurants|dining|yemek|buffet|lobby|reception|bar|disco|nightclub|pool|havuz|beach|plaj|exterior|facade|amenities|facilities|business|conference|meeting|spa|wellness|gym|fitness|kids|child|children|aqua|waterpark|garden|park|terrace|skyline|aerial|map|logo|food|entertainment|animation|sport|sports|ballroom|cafe|poolside|marina)(?:[-_.]|$)/i

export function imageFileLabel(url) {
  try {
    const path = String(url || '').split('?')[0]
    return decodeURIComponent(path.split('/').pop() || '').toLowerCase()
  } catch {
    return String(url || '').toLowerCase()
  }
}

export function classifyHotelGalleryImage(url) {
  const f = imageFileLabel(url)
  if (!f) return 'other'
  const hard = ROOM_HARD_RE.test(f)
  const reject = ROOM_REJECT_RE.test(f)
  if (reject && !hard) return 'reject'
  if (hard) return 'room'
  if (ROOM_SOFT_RE.test(f) && !reject) return 'soft'
  return 'other'
}

function slugTokens(roomName) {
  return String(roomName || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .split('-')
    .filter((t) => t.length > 3)
    .slice(0, 4)
}

/**
 * @param {string[]} images facility gallery
 * @param {string} roomName
 * @param {number} [roomIndex=0] rotate among rooms so each room gets a different subset
 * @returns {string[]}
 */
export function roomImagesFromGallery(images, roomName, roomIndex = 0) {
  const list = Array.isArray(images) ? images.filter(Boolean) : []
  if (!list.length) return []

  const hard = []
  const soft = []
  for (const u of list) {
    const c = classifyHotelGalleryImage(u)
    if (c === 'room') hard.push(u)
    else if (c === 'soft') soft.push(u)
  }

  // Asla reject/other'a düşme — yemekhane/lobi oda yerine konmasın
  let pool = hard.length ? hard : soft
  if (!pool.length) return []

  const tokens = slugTokens(roomName)
  const preferSuite = /süit|suite|penthouse|villa/i.test(String(roomName || ''))
  const scored = pool.map((u, i) => {
    const f = imageFileLabel(u)
    let score = 0
    if (ROOM_HARD_RE.test(f)) score += 10
    if (preferSuite && /suite|süit|penthouse/i.test(f)) score += 5
    if (!preferSuite && /suite|süit/i.test(f) && !/room/i.test(f)) score -= 1
    for (const t of tokens) {
      if (f.includes(t)) score += 3
    }
    // Stable tie-break + rotation by room index
    score -= ((i + roomIndex * 2) % Math.max(pool.length, 1)) * 0.01
    return { u, score }
  })
  scored.sort((a, b) => b.score - a.score)

  const out = []
  const seen = new Set()
  for (const { u } of scored) {
    if (seen.has(u)) continue
    seen.add(u)
    out.push(u)
    if (out.length >= 6) break
  }
  return out
}

/** Mevcut feed JSON içindeki oda görsellerini yeniden sınıflandır. */
export function rewriteFeedRoomImages(feed) {
  const hotels = Array.isArray(feed?.hotels) ? feed.hotels : []
  let roomsFixed = 0
  let roomsEmpty = 0
  for (const hotel of hotels) {
    const gallery = Array.isArray(hotel.images) ? hotel.images : []
    const rooms = Array.isArray(hotel.rooms) ? hotel.rooms : []
    rooms.forEach((room, i) => {
      const imgs = roomImagesFromGallery(gallery, room.name || room.id || `oda-${i + 1}`, i)
      room.images = imgs
      room.image = imgs[0] || ''
      roomsFixed++
      if (!imgs.length) roomsEmpty++
    })
  }
  return { hotels: hotels.length, roomsFixed, roomsEmpty }
}
