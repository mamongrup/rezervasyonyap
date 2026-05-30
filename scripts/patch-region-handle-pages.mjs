import fs from 'node:fs'
import path from 'node:path'

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) walk(p, acc)
    else if (f === 'page.tsx') acc.push(p)
  }
  return acc
}

const root = path.join('frontend', 'src', 'app', '[locale]', '(app)', '(categories)')
const files = walk(root).filter((f) => {
  const c = fs.readFileSync(f, 'utf8')
  return c.includes('getRegionHeroConfig') && c.includes('handle?.[0]')
})

for (const f of files) {
  let c = fs.readFileSync(f, 'utf8')
  if (!c.includes('regionHandleFromParams')) {
    c = c.replace(
      "import { getRegionHeroConfig } from '@/data/region-hero-config'",
      "import { getRegionHeroConfig } from '@/data/region-hero-config'\nimport { regionHandleFromParams } from '@/lib/region-handle-path'",
    )
  }
  c = c.replace(
    'const currentHandle = handle?.[0]',
    'const currentHandle = regionHandleFromParams(handle)',
  )
  fs.writeFileSync(f, c)
  console.log('patched', f)
}
