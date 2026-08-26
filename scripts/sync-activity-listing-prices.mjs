import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'travel',
})

async function main() {
  const client = await pool.connect()
  try {
    console.log('[sync-activity-prices] Aktivite başlangıç fiyatları ve para birimleri güncelleniyor...')

    const res = await client.query(`
      update listings l
      set
        first_charge_amount = coalesce((
          select min(f.price_amount)
          from listing_activity_session_fares f
          join listing_activity_sessions s on s.id = f.session_id
          where s.listing_id = l.id and s.is_active = true and f.fare_type = 'adult' and f.price_amount > 0
        ), l.first_charge_amount),
        currency_code = coalesce((
          select f.currency_code
          from listing_activity_session_fares f
          join listing_activity_sessions s on s.id = f.session_id
          where s.listing_id = l.id and s.is_active = true and f.fare_type = 'adult' and f.price_amount > 0
          order by s.sort_order, s.start_time limit 1
        ), l.currency_code)
      where l.category_id in (select id from product_categories where code = 'activity')
      returning l.id, l.slug, l.first_charge_amount, l.currency_code;
    `)

    console.log(`[sync-activity-prices] ${res.rowCount} aktivite kaydı seans fiyatlarıyla eşitlendi:`)
    for (const row of res.rows) {
      console.log(` - ${row.slug}: ${row.first_charge_amount} ${row.currency_code}`)
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[sync-activity-prices] Hata:', err)
  process.exit(1)
})
