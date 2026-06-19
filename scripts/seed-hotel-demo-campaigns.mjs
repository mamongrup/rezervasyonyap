import { createPgClient } from './lib/pg-client.mjs'

const payload = {
  sectionTitle: { tr: "Otel'de Geçerli Kampanyalar", en: 'Valid Hotel Campaigns' },
  items: [
    {
      id: 'demo-12-taksit',
      enabled: true,
      title: { tr: 'Kredi kartına 12 taksit', en: '12 installments on credit card' },
      logoUrl: '',
      linkUrl: '',
      scope: 'all',
      listingIds: [],
      sortOrder: 0,
    },
    {
      id: 'demo-6-gece-kal',
      enabled: true,
      title: { tr: '6 gece kal, 5 gece öde', en: 'Stay 6 nights, pay for 5' },
      logoUrl: '',
      linkUrl: '',
      scope: 'all',
      listingIds: [],
      sortOrder: 1,
    },
    {
      id: 'demo-1000-puan',
      enabled: true,
      title: { tr: "1000 ₺'ye varan puan", en: 'Points worth up to ₺1,000' },
      logoUrl: '',
      linkUrl: '',
      scope: 'all',
      listingIds: [],
      sortOrder: 2,
    },
  ],
}

const client = createPgClient()
await client.connect()

try {
  const existing = await client.query(
    `SELECT id FROM site_settings WHERE organization_id IS NULL AND key = 'catalog.hotel_valid_campaigns' LIMIT 1`,
  )

  if (existing.rows.length > 0) {
    await client.query(`UPDATE site_settings SET value_json = $1::jsonb WHERE id = $2`, [
      JSON.stringify(payload),
      existing.rows[0].id,
    ])
    console.log('Updated catalog.hotel_valid_campaigns')
  } else {
    await client.query(
      `INSERT INTO site_settings (organization_id, key, value_json) VALUES (NULL, 'catalog.hotel_valid_campaigns', $1::jsonb)`,
      [JSON.stringify(payload)],
    )
    console.log('Inserted catalog.hotel_valid_campaigns')
  }
} finally {
  await client.end()
}

console.log('Published:', payload.items.map((i) => i.title.tr).join(' | '))
