#!/usr/bin/env node
/**
 * Yolcu360 günlük araç import — rota listesinden fiyat/görsel güncelleme.
 * (import-yolcu360-cars.mjs ile aynı; zamanlayıcı hedefi)
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const importScript = path.join(__dirname, 'import-yolcu360-cars.mjs')
const extra = process.argv.slice(2)

const child = spawn(process.execPath, [importScript, ...extra], {
  stdio: 'inherit',
  env: process.env,
})

child.on('close', (code) => process.exit(code ?? 1))
