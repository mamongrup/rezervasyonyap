import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { ADMIN_EMAIL, buildRequest, sendAdminEmail, processAdminEmails } from './lib/admin-email-worker.mjs'

const config = { key: 'test-key', from: 'notifications@example.com' }
const job = { id: 'test-id', recipient: ADMIN_EMAIL, subject: 'Yeni mesaj\r\nTest', body: 'Merhaba', reply_to: 'visitor@example.com' }

test('uses the exact approved recipient and safe Reply-To', () => {
  assert.deepEqual(buildRequest(job, config.from), { from: config.from, to: [ADMIN_EMAIL], subject: 'Yeni mesaj Test', text: 'Merhaba', reply_to: 'visitor@example.com' })
  assert.equal(buildRequest({ ...job, reply_to: 'a@b.com\r\nBcc: other@example.com' }, config.from).reply_to, undefined)
  assert.throws(() => buildRequest({ ...job, recipient: 'other@example.com' }, config.from))
})

test('provider acceptance requires an id and uses a stable idempotency key', async () => {
  const requests = []
  const fake = async (url, init) => { requests.push({ url, ...init }); return Response.json({ id: 'provider-id' }) }
  assert.deepEqual(await sendAdminEmail(job, config, fake), { ok: true, id: 'provider-id' })
  await sendAdminEmail(job, config, fake)
  assert.equal(requests[0].headers['Idempotency-Key'], requests[1].headers['Idempotency-Key'])
  assert.equal(requests[0].body, requests[1].body)
  assert.equal(requests[0].url, 'https://api.resend.com/emails')
  assert.equal((await sendAdminEmail(job, config, async () => Response.json({}))).ok, false)
})

test('retries temporary errors but rejects permanent provider errors', async () => {
  for (const status of [429, 500, 503]) assert.equal((await sendAdminEmail(job, config, async () => new Response('', { status }))).retry, true)
  for (const status of [400, 401, 403, 422]) assert.equal((await sendAdminEmail(job, config, async () => new Response('', { status }))).retry, false)
  assert.equal((await sendAdminEmail(job, config, async () => { throw new Error('secret error') })).error, 'provider_network_or_timeout')
  await assert.rejects(sendAdminEmail(job, { ...config, key: '' }))
})

test('retry keeps the original sender and payload if configuration changes', async () => {
  const request_json = buildRequest(job, config.from)
  await sendAdminEmail({ ...job, request_json }, { ...config, from: 'changed@example.com' }, async (_url, init) => {
    assert.deepEqual(JSON.parse(init.body), request_json)
    return Response.json({ id: 'id' })
  })
})

test('PostgreSQL triggers and durable delivery', { skip: process.env.ADMIN_EMAIL_TEST_DB !== '1' }, async (t) => {
  // Deliberately fixed local test port. Never use application DB environment.
  let pg
  try { pg = createRequire(new URL('./package.json', import.meta.url))('pg') }
  catch { pg = createRequire(new URL('../frontend/package.json', import.meta.url))('pg') }
  const { Client } = pg
  const db = new Client({ host: '127.0.0.1', port: 55436, user: 'postgres', database: 'postgres' })
  await db.connect()
  const schema = `mail_test_${Date.now()}`
  await db.query(`CREATE SCHEMA ${schema}`)
  await db.query(`SET search_path TO ${schema},public`)
  const migration = await readFile(new URL('../backend/priv/sql/modules/436_admin_email_notifications.sql', import.meta.url), 'utf8')
  try {
    await db.query(`
      CREATE TABLE site_settings(key text, organization_id uuid, value_json jsonb);
      CREATE TABLE users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), is_guest boolean DEFAULT false, display_name text, email text, phone text, preferred_locale text, password_hash text, tc_kimlik_no text);
      CREATE TABLE reservations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),public_code text,status text,payment_status text,guest_name text,guest_email text,guest_phone text,starts_on date,ends_on date,listing_id uuid);
      CREATE TABLE support_channels(id serial PRIMARY KEY,code text);
      CREATE TABLE chat_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),channel_id int REFERENCES support_channels);
      CREATE TABLE chat_messages(id bigserial PRIMARY KEY,session_id uuid REFERENCES chat_sessions,role text,body text,meta_json jsonb DEFAULT '{}');
      CREATE TABLE support_tickets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),public_code text,subject text,guest_name text,guest_email text,priority text);
      CREATE TABLE support_ticket_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),ticket_id uuid REFERENCES support_tickets,author_type text,is_internal boolean DEFAULT false,body text);
      CREATE TABLE reservation_escalations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),reservation_id uuid,reason text,status text);
    `)
    await db.query(migration)
    await db.query(migration) // reinstall must not duplicate triggers or events
    const count = async (type) => Number((await db.query('SELECT count(*) FROM admin_email_outbox WHERE event_type=$1', [type])).rows[0].count)
    await t.test('registration excludes guests and secrets; guest conversion emits once', async () => {
      await db.query("INSERT INTO users(display_name,email,password_hash,tc_kimlik_no) VALUES('Test','test@example.com','SECRET_PASSWORD','SECRET_ID')")
      await db.query("INSERT INTO users(is_guest,email) VALUES(true,'guest@example.com')")
      assert.equal(await count('registration'), 1)
      await db.query("UPDATE users SET is_guest=false WHERE email='guest@example.com'")
      await db.query('UPDATE users SET is_guest=false')
      assert.equal(await count('registration'), 2)
      const rows = await db.query('SELECT body FROM admin_email_outbox')
      assert.ok(rows.rows.every((row) => !row.body.includes('SECRET')))
    })
    await t.test('reservation creation and genuine status/payment changes emit once per change', async () => {
      await db.query("INSERT INTO reservations(public_code,status,payment_status) VALUES('TEST-1','pending','unpaid')")
      await db.query("UPDATE reservations SET status='pending'")
      assert.equal(await count('reservation_updated'), 0)
      await db.query("UPDATE reservations SET status='confirmed',payment_status='paid'")
      assert.equal(await count('reservation_created'), 1)
      assert.equal(await count('reservation_updated'), 1)
      await db.query("UPDATE reservations SET status='pending'")
      await db.query("UPDATE reservations SET status='confirmed'")
      assert.equal(await count('reservation_updated'), 3)
    })
    await t.test('only contact-channel user messages produce contact emails', async () => {
      await db.query("INSERT INTO support_channels(code) VALUES('contact'),('live_chat')")
      await db.query('INSERT INTO chat_sessions(channel_id) SELECT id FROM support_channels')
      await db.query("INSERT INTO chat_messages(session_id,role,body,meta_json) SELECT s.id,'user','İletişim testi','{\"email\":\"visitor@example.com\"}' FROM chat_sessions s")
      await db.query("INSERT INTO chat_messages(session_id,role,body) SELECT id,'agent','Yanıt' FROM chat_sessions")
      assert.equal(await count('contact'), 1)
      assert.equal((await db.query("SELECT reply_to FROM admin_email_outbox WHERE event_type='contact'")).rows[0].reply_to, 'visitor@example.com')
    })
    await t.test('support and escalation events; internal messages excluded', async () => {
      await db.query("INSERT INTO support_tickets(public_code,subject) VALUES('TKT-test','Yardım')")
      await db.query("INSERT INTO support_ticket_messages(ticket_id,author_type,body) SELECT id,'customer','Mesaj' FROM support_tickets")
      await db.query("INSERT INTO support_ticket_messages(ticket_id,author_type,is_internal,body) SELECT id,'customer',true,'Dahili' FROM support_tickets")
      await db.query("INSERT INTO reservation_escalations(reason,status) VALUES('overbooking','open')")
      assert.equal(await count('support_ticket'), 1)
      assert.equal(await count('support_reply'), 1)
      assert.equal(await count('escalation'), 1)
    })
    await t.test('rolled-back events leave no email and repeated enqueue is idempotent', async () => {
      const before = await count('registration')
      await db.query('BEGIN')
      await db.query("INSERT INTO users(email) VALUES('rollback@example.com')")
      await db.query('ROLLBACK')
      assert.equal(await count('registration'), before)
      await db.query("SELECT queue_admin_email('dedup','test','Subject','Body')")
      await db.query("SELECT queue_admin_email('dedup','test','Subject','Body')")
      assert.equal(await count('test'), 1)
    })
    const options = { env: { RESEND_API_KEY: 'test-key' }, pause: async () => {} }
    await t.test('parallel worker exits without sending while the lock is held', async () => {
      const other = new Client({ host: '127.0.0.1', port: 55436, user: 'postgres', database: 'postgres' })
      await other.connect()
      try {
        await other.query('SELECT pg_advisory_lock(436,1)')
        assert.deepEqual(await processAdminEmails(db, { ...options, fetchImpl: async () => assert.fail('concurrent send') }), { busy: true })
      } finally { await other.end() }
    })
    await t.test('missing credentials retain pending jobs; provider error never marks accepted', async () => {
      await assert.rejects(processAdminEmails(db, { ...options, env: {} }), /resend_not_configured/)
      const summary = await processAdminEmails(db, { ...options, fetchImpl: async () => new Response('', { status: 503 }) })
      assert.ok(summary.retrying > 0)
      assert.equal(Number((await db.query("SELECT count(*) FROM admin_email_outbox WHERE status='accepted'")).rows[0].count), 0)
      assert.equal(Number((await db.query('SELECT min(attempts) AS n FROM admin_email_outbox')).rows[0].n), 1)
    })
    await t.test('retry succeeds, preserves the key and does not resend accepted records', async () => {
      await db.query("UPDATE admin_email_outbox SET next_attempt_at=now()")
      const keys = []
      const fetchImpl = async (_url, init) => { keys.push(init.headers['Idempotency-Key']); return Response.json({ id: 'accepted-id' }) }
      const result = await processAdminEmails(db, { ...options, fetchImpl })
      assert.ok(result.accepted > 0)
      assert.equal(new Set(keys).size, keys.length)
      assert.equal((await processAdminEmails(db, { ...options, fetchImpl })).accepted, 0)
      assert.ok((await db.query('SELECT recipient FROM admin_email_outbox')).rows.every((row) => row.recipient === ADMIN_EMAIL))
    })
    await t.test('expired uncertain deliveries stop for manual review', async () => {
      await db.query("SELECT queue_admin_email('expired','test','Subject','Body')")
      await db.query("UPDATE admin_email_outbox SET first_attempt_at=now()-interval '24 hours' WHERE event_key='expired'")
      await processAdminEmails(db, { ...options, fetchImpl: async () => { assert.fail('must not send expired job') } })
      assert.equal((await db.query("SELECT status FROM admin_email_outbox WHERE event_key='expired'")).rows[0].status, 'failed')
    })
    await t.test('a database failure after provider acceptance retries with identical request and key', async () => {
      await db.query("SELECT queue_admin_email('crash','test','Subject','Body')")
      const requests = []
      const fetchImpl = async (_url, init) => { requests.push(init); return Response.json({ id: 'provider-crash-id' }) }
      const brokenDb = { query: (sql, params) => {
        if (sql.includes("SET status='accepted'")) throw new Error('simulated database failure')
        return db.query(sql, params)
      } }
      await assert.rejects(processAdminEmails(brokenDb, { ...options, fetchImpl }), /simulated database failure/)
      await db.query("UPDATE admin_email_outbox SET next_attempt_at=now() WHERE event_key='crash'")
      await processAdminEmails(db, { ...options, env: { RESEND_API_KEY: 'test-key', SUPPLIER_NOTIFY_FROM: 'new@example.com' }, fetchImpl })
      assert.equal(requests.length, 2)
      assert.equal(requests[0].body, requests[1].body)
      assert.equal(requests[0].headers['Idempotency-Key'], requests[1].headers['Idempotency-Key'])
    })
    await t.test('permanent errors stop retrying and retain an actionable error code', async () => {
      await db.query("SELECT queue_admin_email('permanent','test','Subject','Body')")
      const result = await processAdminEmails(db, { ...options, fetchImpl: async () => new Response('', { status: 403 }) })
      assert.equal(result.failed, 1)
      const row = (await db.query("SELECT status,error_message FROM admin_email_outbox WHERE event_key='permanent'")).rows[0]
      assert.deepEqual(row, { status: 'failed', error_message: 'provider_http_403' })
    })
  } finally {
    await db.query(`DROP SCHEMA ${schema} CASCADE`)
    await db.end()
  }
})
