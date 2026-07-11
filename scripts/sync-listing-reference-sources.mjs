/** Kullanıcı tanımlı ilan kaynaklarından fiyatları periyodik yeniler. Müsaitlik ICS adresleri kayıt sırasında ical_feeds'e bağlanır. */
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { createPgClient } from './lib/pg-client.mjs'

const privateIp = (ip) => /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(ip)
async function safeUrl(raw) {
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('unsafe_url')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (!addresses.length || addresses.some(({ address }) => privateIp(address))) throw new Error('private_address')
  return url
}
async function fetchHtml(raw) {
  let url = await safeUrl(raw)
  for (let n = 0; n < 4; n += 1) {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'RezervasyonYap-SourceSync/1.0' } })
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location'); if (!location) throw new Error('bad_redirect')
      url = await safeUrl(new URL(location, url).toString()); continue
    }
    if (!res.ok) throw new Error(`http_${res.status}`)
    if (!(res.headers.get('content-type') || '').includes('text/html')) throw new Error('not_html')
    if (Number(res.headers.get('content-length') || 0) > 2_000_000) throw new Error('too_large')
    return (await res.text()).slice(0, 2_000_000)
  }
  throw new Error('too_many_redirects')
}
function priceFromHtml(html) {
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]); const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        const offer = Array.isArray(item?.offers) ? item.offers[0] : item?.offers
        const value = Number(String(offer?.price ?? offer?.lowPrice ?? '').replace(',', '.'))
        if (Number.isFinite(value) && value > 0) return { value, currency: String(offer?.priceCurrency || 'TRY') }
      }
    } catch { /* bozuk JSON-LD atlanır */ }
  }
  const m = html.match(/(?:product:price:amount|itemprop=["']price["'])[^>]+content=["']([0-9.,]+)/i)
  const value = Number(String(m?.[1] || '').replace(',', '.'))
  return Number.isFinite(value) && value > 0 ? { value, currency: 'TRY' } : null
}

const pg = createPgClient(); await pg.connect()
let ok = 0; let failed = 0
try {
  const { rows } = await pg.query(`SELECT l.id::text AS id, lm.value_json AS meta FROM listings l JOIN listing_attributes lm ON lm.listing_id=l.id AND lm.group_code='listing_meta' AND lm.key='v1' WHERE COALESCE(lm.value_json->>'source_price_url', lm.value_json->>'source_reference_url', '') <> ''`)
  for (const row of rows) {
    const source = row.meta.source_price_url || row.meta.source_reference_url
    try {
      const price = priceFromHtml(await fetchHtml(source)); if (!price) throw new Error('price_not_found')
      await pg.query(`DELETE FROM listing_price_rules WHERE listing_id=$1::uuid AND rule_json->>'source'='listing_reference'`, [row.id])
      await pg.query(`INSERT INTO listing_price_rules(listing_id,rule_json,valid_from,valid_to) VALUES($1::uuid,$2::jsonb,NULL,NULL)`, [row.id, JSON.stringify({ base_nightly: String(price.value), base_price: String(price.value), currency: price.currency, source: 'listing_reference', source_url: source, synced_at: new Date().toISOString() })])
      await pg.query(`UPDATE listing_attributes SET value_json=value_json || $2::jsonb WHERE listing_id=$1::uuid AND group_code='listing_meta' AND key='v1'`, [row.id, JSON.stringify({ source_last_sync_at: new Date().toISOString(), source_last_sync_status: 'ok' })])
      ok += 1
    } catch (error) {
      await pg.query(`UPDATE listing_attributes SET value_json=value_json || $2::jsonb WHERE listing_id=$1::uuid AND group_code='listing_meta' AND key='v1'`, [row.id, JSON.stringify({ source_last_sync_at: new Date().toISOString(), source_last_sync_status: 'error', source_last_sync_error: String(error?.message || error).slice(0, 300) })])
      failed += 1
    }
  }
  console.log(`[listing-reference] ok=${ok} failed=${failed}`)
} finally { await pg.end() }
