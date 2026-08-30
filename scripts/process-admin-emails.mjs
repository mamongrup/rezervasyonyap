import { createPgClient } from './lib/pg-client.mjs'
import { processAdminEmails } from './lib/admin-email-worker.mjs'

const db = createPgClient()
try {
  await db.connect()
  if (process.argv.includes('--check')) {
    const result = await db.query(`SELECT
      EXISTS(SELECT 1 FROM site_settings WHERE key='integrations' AND organization_id IS NULL
        AND nullif(trim(value_json->>'resend_api_key'),'') IS NOT NULL) AS db_key,
      (SELECT count(*)::int FROM admin_email_outbox WHERE status='pending') AS pending,
      (SELECT count(*)::int FROM admin_email_outbox WHERE status='failed') AS failed`)
    const { db_key, ...counts } = result.rows[0]
    const configured = db_key || !!process.env.RESEND_API_KEY?.trim()
    console.log(JSON.stringify({ configured, recipient: 'ino@rezervasyonyap.com.tr', ...counts }))
    if (!configured || counts.failed) process.exitCode = 1
  } else {
    const summary = await processAdminEmails(db)
    console.log(JSON.stringify(summary))
    if (summary.failed || summary.retrying) process.exitCode = 1
  }
} catch {
  // Avoid printing connection strings, credentials or message bodies.
  console.error('Admin email worker failed. Check database connectivity, migration 436 and Resend configuration.')
  process.exitCode = 1
} finally {
  await db.end()
}
