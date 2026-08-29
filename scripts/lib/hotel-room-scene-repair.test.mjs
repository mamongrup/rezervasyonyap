import assert from 'node:assert/strict'
import { repairHotelRoomImageSets } from './hotel-room-scene-repair.mjs'

const rooms = [
  { id: 'a', meta_json: { images: ['/pool.avif', '/bed-a.avif', '/shared-bed.avif'] } },
  { id: 'b', meta_json: { images: ['/lobby.avif', '/bed-b.avif', '/shared-bed.avif'] } },
]
const gallery = [
  { storage_key: 'pool.avif', scene_code: 'pool' },
  { storage_key: 'lobby.avif', scene_code: 'living' },
  { storage_key: 'bed-a.avif', scene_code: 'bedroom' },
  { storage_key: 'bed-b.avif', scene_code: 'bedroom' },
  { storage_key: 'shared-bed.avif', scene_code: 'bedroom' },
]
const repaired = repairHotelRoomImageSets(rooms, gallery)
assert.deepEqual(repaired[0].after, ['/bed-a.avif'])
assert.deepEqual(repaired[1].after, ['/bed-b.avif'])
assert.equal(repaired[0].meta.image, '/bed-a.avif')
console.log('hotel-room-scene-repair tests passed')
