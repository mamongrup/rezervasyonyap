import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-offers-'))
const feedPath = path.join(tmp, 'feed.json')
const offersPath = path.join(tmp, 'offers.json')

fs.writeFileSync(
  feedPath,
  JSON.stringify({
    hotels: [
      {
        id: 'demo-hotel',
        slug: 'demo-hotel',
        name: 'Demo Hotel',
        url: 'https://www.tatilbudur.com/demo-hotel',
        images: ['https://cdn.example/Hotel-Room.JPEG'],
        rooms: [
          {
            id: 'standart-oda-1',
            name: 'Standart Oda',
            boardType: 'Her Şey Dahil',
            image: 'https://cdn.example/Hotel-Room.JPEG',
            images: ['https://cdn.example/Hotel-Room.JPEG'],
            features: ['Balkon'],
            rates: [],
          },
        ],
      },
    ],
  }),
)

fs.writeFileSync(
  offersPath,
  JSON.stringify({
    search: {
      checkIn: '2026-08-10',
      checkOut: '2026-08-13',
      nights: 3,
      adults: 2,
      children: 0,
      currency: 'TRY',
      validFrom: '2026-08-01',
      validTo: '2026-09-30',
      pricePolicy: 'test',
    },
    hotels: [
      {
        sourceUrl: 'https://www.tatilbudur.com/demo-hotel',
        name: 'Demo Hotel',
        rooms: [
          {
            name: 'Standart Oda',
            boardType: 'Her Şey Dahil',
            totalPrice: 3000,
            features: ['Duş'],
          },
        ],
      },
    ],
  }),
)

const r = spawnSync(
  process.execPath,
  [
    path.join(ROOT, 'scripts/apply-tatilbudur-visible-offers.mjs'),
    '--feed',
    feedPath,
    '--offers',
    offersPath,
  ],
  { encoding: 'utf8' },
)
assert.equal(r.status, 0, r.stderr || r.stdout)

const feed = JSON.parse(fs.readFileSync(feedPath, 'utf8'))
const room = feed.hotels[0].rooms[0]
assert.equal(room.name, 'Standart Oda')
assert.equal(room.image, 'https://cdn.example/Hotel-Room.JPEG', 'preserve room image')
assert.deepEqual(room.images, ['https://cdn.example/Hotel-Room.JPEG'])
assert.ok(room.rates?.[0]?.nightlyPrice > 0)
assert.ok(room.features.includes('Balkon'))
assert.ok(room.features.includes('Duş'))

console.log('apply-tatilbudur-visible-offers.merge.test: ok')
