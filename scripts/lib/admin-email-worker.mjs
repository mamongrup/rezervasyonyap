// Internal operational notifications. Never copy customer auth or payment secrets.
export const ADMIN_EMAIL = 'ino@rezervasyonyap.com.tr'
const EMAIL = /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/

export function buildRequest(job, from) {
  if (job.recipient !== ADMIN_EMAIL) throw new Error('unexpected_admin_recipient')
  const request = {
    from,
    to: [ADMIN_EMAIL],
    subject: job.subject.replace(/[\r\n]+/g, ' ').slice(0, 250),
    text: job.body,
  }
  const reply = job.reply_to?.trim()
  if (reply && EMAIL.test(reply)) request.reply_to = reply
  return request
}

export async function sendAdminEmail(job, config, fetchImpl = fetch) {
  if (!config.key) throw new Error('resend_not_configured')
  // Frozen on first attempt: retries must have the same idempotency key AND body.
  const request = job.request_json ?? buildRequest(job, config.from)
  if (request.to?.length !== 1 || request.to[0] !== ADMIN_EMAIL) throw new Error('unexpected_admin_recipient')
  let response
  try {
    response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `admin-notification/${job.id}` },
      // PostgreSQL JSONB reorders keys; keep the exact wire body stable too.
      body: JSON.stringify(Object.fromEntries(Object.entries(request).sort(([a], [b]) => a.localeCompare(b)))),
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    return { ok: false, retry: true, error: 'provider_network_or_timeout' }
  }
  if (!response.ok) {
    // Do not persist raw provider responses: they can contain addresses or secrets.
    return { ok: false, retry: response.status === 429 || response.status >= 500, error: `provider_http_${response.status}` }
  }
  const result = await response.json().catch(() => ({}))
  if (typeof result.id !== 'string' || !result.id) return { ok: false, retry: true, error: 'provider_missing_id' }
  return { ok: true, id: result.id }
}

export async function processAdminEmails(db, { env = process.env, fetchImpl = fetch, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const lock = await db.query('SELECT pg_try_advisory_lock(436, 1) AS acquired')
  if (!lock.rows[0].acquired) return { busy: true }
  try {
    const settings = await db.query("SELECT value_json FROM site_settings WHERE key='integrations' AND organization_id IS NULL LIMIT 1")
    const values = settings.rows[0]?.value_json ?? {}
    const config = {
      key: values.resend_api_key?.trim() || env.RESEND_API_KEY?.trim(),
      from: values.supplier_notify_from?.trim() || env.SUPPLIER_NOTIFY_FROM?.trim() || env.INVOICE_NOTIFY_FROM?.trim() || 'rezervasyon@rezervasyonyap.com.tr',
    }
    if (!config.key) throw new Error('resend_not_configured')
    await db.query('SELECT flush_admin_email_digests()')
    // Resend retains idempotency keys for 24h. Never automatically retry uncertain
    // deliveries outside that window; an operator must reconcile them first.
    const expired = await db.query(`UPDATE admin_email_outbox SET status='failed', error_message='delivery_uncertain_manual_review'
      WHERE status='pending' AND first_attempt_at < now() - interval '23 hours'`)
    const due = await db.query(`SELECT * FROM admin_email_outbox
      WHERE status='pending' AND next_attempt_at<=now() ORDER BY created_at,id LIMIT 20`)
    const summary = { accepted: 0, retrying: 0, failed: expired.rowCount }
    for (const job of due.rows) {
      if (job.attempts >= 8) {
        await db.query("UPDATE admin_email_outbox SET status='failed', error_message='attempt_limit_manual_review' WHERE id=$1", [job.id])
        summary.failed++
        continue
      }
      let request
      try {
        request = job.request_json ?? buildRequest(job, config.from)
      } catch {
        await db.query("UPDATE admin_email_outbox SET status='failed',error_message='invalid_notification' WHERE id=$1", [job.id])
        summary.failed++
        continue
      }
      // Commit the attempt and payload before contacting the provider. A crash
      // leaves a durable pending job that the next run can safely retry.
      await db.query(`UPDATE admin_email_outbox SET attempts=attempts+1,
        first_attempt_at=coalesce(first_attempt_at,now()), request_json=$2::jsonb,
        next_attempt_at=now()+interval '1 minute' WHERE id=$1`, [job.id, JSON.stringify(request)])
      const result = await sendAdminEmail({ ...job, request_json: request }, config, fetchImpl)
      if (result.ok) {
        await db.query(`UPDATE admin_email_outbox SET status='accepted',provider_id=$2,
          accepted_at=now(),error_message=NULL WHERE id=$1`, [job.id, result.id])
        summary.accepted++
      } else {
        const retry = result.retry && job.attempts + 1 < 8
        await db.query(`UPDATE admin_email_outbox SET status=$2,error_message=$3,
          next_attempt_at=now()+($4::int * interval '1 second') WHERE id=$1`,
        [job.id, retry ? 'pending' : 'failed', result.error, Math.min(3600, 60 * 2 ** job.attempts)])
        summary[retry ? 'retrying' : 'failed']++
      }
      await pause(600)
    }
    return summary
  } finally {
    await db.query('SELECT pg_advisory_unlock(436, 1)')
  }
}
