#!/usr/bin/env node
/**
 * Bodrum TatilBudur: oda görseli + TR yayın + rapor (tek komut).
 *
 *   node scripts/finalize-bodrum-tatilbudur.mjs
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function run(script, args = [], env = {}) {
  console.log(`==> node ${script} ${args.join(' ')}`.trim())
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
  if (r.status !== 0) process.exit(r.status || 1)
}

run('scripts/backfill-tatilbudur-room-images-from-gallery.mjs')
// TR önce — 6 dil bekleme
run('scripts/publish-ready-bodrum-tatilbudur.mjs', [], { REQUIRE_ALL_LOCALES: '0' })
run('scripts/report-tatilbudur-import-links.mjs', [
  '--file',
  'backups/tatilbudur-bodrum-public-feed.json',
  '--out',
  'backups/tatilbudur-bodrum-links.md',
])

console.log(`
[OK] Finalize tamam (TR yayın).
- Rapor: backups/tatilbudur-bodrum-links.md
- Durum sayımı:
    grep -E '\\| published \\|' backups/tatilbudur-bodrum-links.md | wc -l
- Diğer diller sonra:
    ./deploy/scripts/ai-worker-run-steps.sh 20
`)
