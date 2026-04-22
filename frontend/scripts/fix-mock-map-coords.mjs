import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const filePath = path.join(__dirname, '../src/data/listings.ts')
let s = fs.readFileSync(filePath, 'utf8')
let n = 0
s = s.replace(/map: \{ lat: [\d.-]+, lng: [\d.-]+ \}/g, () => {
  const i = n++
  const lat0 = 41.0082
  const lng0 = 28.9784
  const u = ((i * 9301 + 49297) % 233280) / 233280
  const v = u * 2 * Math.PI
  const r = 0.032 + (i % 13) * 0.0035
  const lat = lat0 + Math.cos(v) * r * 0.65
  const lng = lng0 + Math.sin(v) * r * 0.85
  return `map: { lat: ${lat.toFixed(4)}, lng: ${lng.toFixed(4)} }`
})
fs.writeFileSync(filePath, s)
console.log('Updated', n, 'mock map coordinates (TR region)')
