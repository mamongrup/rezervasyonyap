#!/usr/bin/env node
/**
 * TCMB Günlük Döviz Kurlarını Çekip PostgreSQL currency_rates Tablosuna Yazan Otomatik Senkronizasyon Scripti.
 *
 * Çalıştırma:
 *   node scripts/sync-tcmb-currency-rates.mjs
 */

import { createPgClient } from './lib/pg-client.mjs'

const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml'

function parseTcmbXml(xmlText) {
  const rates = []
  // Currency etiketlerini ayrıştır
  const currencyRegex = /<Currency\s+[^>]*CurrencyCode="([A-Z]{3})"[^>]*>([\s\S]*?)<\/Currency>/gi
  let match

  while ((match = currencyRegex.exec(xmlText)) !== null) {
    const code = match[1].toUpperCase()
    const content = match[2]

    // ForexSelling (Efektif / Döviz Satış) veya ForexBuying
    const sellingMatch = /<ForexSelling>([^<]+)<\/ForexSelling>/i.exec(content)
    const banknoteSellingMatch = /<BanknoteSelling>([^<]+)<\/BanknoteSelling>/i.exec(content)
    const buyingMatch = /<ForexBuying>([^<]+)<\/ForexBuying>/i.exec(content)

    const rawRate =
      sellingMatch?.[1]?.trim() ||
      banknoteSellingMatch?.[1]?.trim() ||
      buyingMatch?.[1]?.trim()

    if (rawRate) {
      const parsedRate = Number.parseFloat(rawRate.replace(',', '.'))
      if (Number.isFinite(parsedRate) && parsedRate > 0) {
        rates.push({ code, rate: parsedRate })
      }
    }
  }

  return rates
}

async function main() {
  console.log(`[tcmb-sync] TCMB kurları çekiliyor: ${TCMB_URL}`)

  let xmlText = ''
  try {
    const res = await fetch(TCMB_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TravelPlatform/1.0)',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }

    xmlText = await res.text()
  } catch (err) {
    console.error(`[tcmb-sync] TCMB XML indirme hatası: ${err.message}`)
    process.exit(1)
  }

  const rates = parseTcmbXml(xmlText)
  if (rates.length === 0) {
    console.error('[tcmb-sync] XML içinde döviz kuru bulunamadı.')
    process.exit(1)
  }

  console.log(`[tcmb-sync] ${rates.length} para birimi tespit edildi. Veritabanına kaydediliyor...`)

  const client = createPgClient()
  await client.connect()

  try {
    // Standart para birimlerinin var olduğundan emin ol (foreign key hatasını önler)
    await client.query(`
      INSERT INTO currencies (code, name, symbol, decimal_places, is_active)
      VALUES 
        ('TRY', 'Turkish Lira', '₺', 2, true),
        ('USD', 'US Dollar', '$', 2, true),
        ('EUR', 'Euro', '€', 2, true),
        ('GBP', 'British Pound', '£', 2, true),
        ('CHF', 'Swiss Franc', 'CHF', 2, true),
        ('RUB', 'Russian Ruble', '₽', 2, true),
        ('SAR', 'Saudi Riyal', 'SAR', 2, true),
        ('AED', 'UAE Dirham', 'AED', 2, true)
      ON CONFLICT (code) DO NOTHING;
    `)

    // Veritabanındaki tüm kayıtlı para birimlerini al
    const existingCurrenciesRes = await client.query(
      'SELECT upper(trim(code)) as code FROM currencies',
    )
    const existingSet = new Set(existingCurrenciesRes.rows.map((r) => r.code))

    let inserted = 0
    for (const { code, rate } of rates) {
      if (!existingSet.has(code)) continue

      await client.query(
        `INSERT INTO currency_rates (base_code, quote_code, rate, source, fetched_at)
         VALUES ($1::char(3), 'TRY'::char(3), $2::numeric, 'tcmb_auto', now())`,
        [code, rate],
      )
      console.log(`[tcmb-sync] 1 ${code} = ${rate.toFixed(4)} TRY kaydedildi.`)
      inserted++
    }

    if (inserted === 0) {
      throw new Error('Aktif para birimleri için hiçbir kur yazılamadı.')
    }

    const usdFromFeed = rates.find((row) => row.code === 'USD')?.rate
    if (usdFromFeed) {
      const latestUsd = await client.query(
        `SELECT rate::float8 AS rate, fetched_at
           FROM currency_rates
          WHERE base_code = 'USD' AND quote_code = 'TRY'
          ORDER BY fetched_at DESC, id DESC
          LIMIT 1`,
      )
      const storedUsd = Number(latestUsd.rows[0]?.rate)
      if (!Number.isFinite(storedUsd) || Math.abs(storedUsd - usdFromFeed) > 0.000001) {
        throw new Error(`USD/TRY doğrulaması başarısız: feed=${usdFromFeed}, db=${storedUsd}`)
      }
      console.log(`[tcmb-sync] Doğrulandı: 1 USD = ${storedUsd.toFixed(4)} TRY.`)
    }

    console.log(`[tcmb-sync] BAŞARILI: Toplam ${inserted} kur kaydı güncellendi.`)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('[tcmb-sync] Beklenmeyen hata:', err)
  process.exit(1)
})
