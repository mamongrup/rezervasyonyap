#!/usr/bin/env node
// Travel monorepo — migration drift checker.
//
// Kontroller:
//   1. backend/priv/sql/modules/*.sql içinde olup install_order.txt'te olmayan dosya var mı?
//   2. install_order.txt içinde olup diskte olmayan dosya var mı?
//   3. Numara çakışması var mı? (örn. iki tane 252_*.sql)
//
// Hata bulursa exit code 1 ile çıkar — pre-commit hook bunu commit'i durdurmak için kullanır.

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.join(import.meta.dirname, '..'))
const MODULES_DIR = path.join(ROOT, 'backend', 'priv', 'sql', 'modules')
const ORDER_FILE = path.join(ROOT, 'backend', 'priv', 'sql', 'install_order.txt')

function fail(msg) {
  console.error(`\n✖ migration-drift: ${msg}`)
  process.exit(1)
}

if (!fs.existsSync(MODULES_DIR)) fail(`Modules klasörü yok: ${MODULES_DIR}`)
if (!fs.existsSync(ORDER_FILE)) fail(`install_order.txt yok: ${ORDER_FILE}`)

const onDisk = fs
  .readdirSync(MODULES_DIR)
  .filter((f) => f.toLowerCase().endsWith('.sql'))
  .map((f) => `modules/${f}`)
  .sort()

const orderRaw = fs.readFileSync(ORDER_FILE, 'utf8').split(/\r?\n/)
const inOrder = orderRaw
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))

const setDisk = new Set(onDisk)
const setOrder = new Set(inOrder)

const missingFromOrder = [...setDisk].filter((f) => !setOrder.has(f))
const missingFromDisk = [...setOrder].filter((f) => !setDisk.has(f))

if (missingFromOrder.length > 0) {
  console.error('\nDiskte var ama install_order.txt\'te eksik:')
  for (const f of missingFromOrder) console.error(`  + ${f}`)
}

if (missingFromDisk.length > 0) {
  console.error('\ninstall_order.txt\'te var ama diskte yok:')
  for (const f of missingFromDisk) console.error(`  - ${f}`)
}

// Numara çakışması: yalnızca uyarı (mevcut dosyalar production'da çalıştırılmış olabilir).
const seenNum = new Map()
for (const f of onDisk) {
  const m = /^modules\/(\d+)_/.exec(f)
  if (!m) continue
  const n = m[1]
  if (seenNum.has(n)) {
    console.warn(`! migration-drift uyarı: numara çakışması ${n} → ${seenNum.get(n)} ve ${f}`)
  } else {
    seenNum.set(n, f)
  }
}

if (missingFromOrder.length || missingFromDisk.length) {
  fail('install_order.txt ile diski senkronize edin.')
}

console.log(`✓ migration-drift: ${onDisk.length} migration sırada.`)
