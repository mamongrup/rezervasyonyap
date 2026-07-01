import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mysql = createRequire(path.join(root, 'frontend/package.json'))('mysql2/promise')
const pg = createRequire(path.join(root, 'frontend/package.json'))('pg')

const db = process.env.MYSQL_DATABASE || 'rezervasyonyapco_excalibur'
const m = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: db,
})
const p = new pg.Client({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD ?? '',
  database: process.env.PGDATABASE || 'travel',
})
await p.connect()

const [[pub]] = await m.query(
  `SELECT COUNT(*) AS c FROM bravo_spaces WHERE deleted_at IS NULL AND status='publish'`,
)
const [[dates]] = await m.query(`SELECT COUNT(*) AS c FROM bravo_space_dates`)
const { rows: hol } = await p.query(`
  SELECT COUNT(*)::int AS c FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE pc.code = 'holiday_home' AND l.status = 'published'
`)
const { rows: withCal } = await p.query(`
  SELECT COUNT(*)::int AS c FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE pc.code = 'holiday_home'
    AND EXISTS (SELECT 1 FROM listing_availability_calendar cal WHERE cal.listing_id = l.id)
`)
const [spaces] = await m.query(
  `SELECT id FROM bravo_spaces WHERE deleted_at IS NULL AND status='publish'`,
)
const { rows: refs } = await p.query(
  `SELECT external_listing_ref FROM listings WHERE external_listing_ref IS NOT NULL`,
)
const refSet = new Set(refs.map((r) => String(r.external_listing_ref)))
const missingOnPg = spaces.filter((s) => !refSet.has(String(s.id)))

console.log(
  JSON.stringify(
    {
      mysql_database: db,
      mysql_publish_spaces: Number(pub.c),
      mysql_calendar_days: Number(dates.c),
      pg_holiday_published: hol[0].c,
      pg_holiday_with_calendar: withCal[0].c,
      publish_missing_on_pg: missingOnPg.length,
      sample_missing_ids: missingOnPg.slice(0, 10).map((s) => s.id),
    },
    null,
    2,
  ),
)

await m.end()
await p.end()
