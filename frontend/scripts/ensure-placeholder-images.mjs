/**
 * Şablonda referans verilen @/images/*.png dosyaları repoda yoksa 1x1 şeffaf PNG yazar.
 * `node scripts/ensure-placeholder-images.mjs` — güvenle tekrar çalıştırılabilir (var olan dosyayı ezmez).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const imagesRoot = path.join(__dirname, '..', 'src', 'images')

const MIN_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const relativePaths = [
  '404.png',
  'about-hero-right.png',
  'ads.png',
  'appRightImg.png',
  'appRightImgTree.png',
  'appstore.png',
  'BecomeAnAuthorImg.png',
  'dowloadAppBG.png',
  'googleplay.png',
  'HIW1.png',
  'HIW2.png',
  'HIW3.png',
  'hero-right.png',
  'hero-right-2.png',
  'hero-right-3.png',
  'hero-right-car.png',
  'hero-right-experience.png',
  'hero-right-flight.png',
  'our-features.png',
  'our-features-2.png',
  'svg-subcribe-2.png',
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `avatars/Image-${n}.png`),
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => `avatars/${n}.png`),
  'avatars/ql.png',
  'avatars/qr.png',
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `cars/${n}.png`),
  ...[1, 2, 3, 4].map((n) => `flights/logo${n}.png`),
  ...[1, 2, 3, 4, 5].map((n) => `logos/dark/${n}.png`),
  ...[1, 2, 3, 4, 5].map((n) => `logos/nomal/${n}.png`),
]

let created = 0
let skipped = 0
for (const rel of relativePaths) {
  const fp = path.join(imagesRoot, rel)
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  if (fs.existsSync(fp)) {
    skipped++
    continue
  }
  fs.writeFileSync(fp, MIN_PNG)
  created++
}

console.log(`images: ${created} created, ${skipped} already present (${imagesRoot})`)
