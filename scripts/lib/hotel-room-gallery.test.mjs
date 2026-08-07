import { classifyHotelGalleryImage, roomImagesFromGallery } from './hotel-room-gallery.mjs'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const gallery = [
  'https://bookeder.com/data/Photos/Big/1/1/1/Hotel-Restaurant.JPEG',
  'https://bookeder.com/data/Photos/Big/1/1/2/Hotel-Lobby.JPEG',
  'https://bookeder.com/data/Photos/Big/1/1/3/Hotel-Exterior.JPEG',
  'https://bookeder.com/data/Photos/Big/1/1/4/Hotel-Beach.JPEG',
  'https://bookeder.com/data/Photos/Big/1/1/5/Hotel-Room.JPEG',
  'https://bookeder.com/data/Photos/Big/1/1/6/Hotel-Room.JPEG',
  'https://bookeder.com/data/Photos/Big/1/1/7/Hotel-Suite.JPEG',
  'https://bookeder.com/data/Photos/Big/1/1/8/Hotel-Amenities.JPEG',
  'https://bookeder.com/data/Photos/Big/1/1/9/Hotel-Interior.JPEG',
]

assert(classifyHotelGalleryImage(gallery[0]) === 'reject', 'restaurant reject')
assert(classifyHotelGalleryImage(gallery[4]) === 'room', 'room hard')
assert(classifyHotelGalleryImage(gallery[8]) === 'soft', 'interior soft')

const roomImgs = roomImagesFromGallery(gallery, 'Standart Oda', 0)
assert(roomImgs.length >= 2, 'room imgs')
assert(roomImgs.every((u) => !/Restaurant|Lobby|Exterior|Beach|Amenities/i.test(u)), 'no reject in room')
assert(roomImgs.every((u) => /Room|Suite|Interior/i.test(u)), 'only roomish')

const suiteImgs = roomImagesFromGallery(gallery, 'King Süit', 1)
assert(suiteImgs.some((u) => /Suite/i.test(u)), 'suite preferred')

// TatilBudur sayısal CDN: etiketsiz fallback kapalı → boş (yanlış tesis fotoğrafı yok)
const numericCdn = [
  'https://productcdn.tatilbudur.com/Otel/gallery/12345.jpg',
  'https://productcdn.tatilbudur.com/Otel/gallery/67890.jpg',
  'https://ucdn.tatilbudur.net/Otel/855x426/11111.webp',
]
assert(
  roomImagesFromGallery(numericCdn, 'Standart Oda', 0).length === 0,
  'no unlabeled fallback by default',
)
assert(
  roomImagesFromGallery(numericCdn, 'Standart Oda', 0, { allowUnlabeledFallback: true }).length > 0,
  'opt-in unlabeled still works',
)

console.log('hotel-room-gallery.test: ok')
