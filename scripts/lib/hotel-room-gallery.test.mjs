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

console.log('hotel-room-gallery.test: ok')
