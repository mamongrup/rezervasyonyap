#!/usr/bin/env node
/**
 * Turna günlük uçuş rota import — zamanlayıcı hedefi (import-turna-flights.mjs ile aynı).
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const importScript = path.join(__dirname, 'import-turna-flights.mjs')
const extra = process.argv.slice(2)

const child = spawn(process.execPath, [importScript, ...extra], {
  stdio: 'inherit',
  env: process.env,
})

child.on('close', (code) => process.exit(code ?? 1))
