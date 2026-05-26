#!/usr/bin/env node
/** DB ortam testi — import öncesi sunucuda çalıştırın. */
import { describePgEnv, loadBackendEnvFile } from './lib/load-backend-env.mjs'
import { testPgConnection } from './lib/pg-client.mjs'

const boot = loadBackendEnvFile()
const info = describePgEnv()
console.log('backend.env:', boot.filePath, `(+${boot.loaded} anahtar)`)
console.log('pg config:', JSON.stringify(info))
if (info.mode === 'DATABASE_URL' && info.hasPassword === false) {
  console.warn('[UYARI] DATABASE_URL şifresiz — PGPASSWORD birleştirmesi denenecek.')
}

try {
  const row = await testPgConnection()
  console.log('[OK] PostgreSQL:', row.db, 'user=', row.usr)
} catch (e) {
  console.error('[FAIL]', e.message || e)
  console.error('İpucu: set -a && source /etc/rezervasyonyap/backend.env && set +a')
  process.exit(1)
}
