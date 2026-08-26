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
    // Aktif para birimlerini al
    const activeCurrenciesRes = await client.query(
      'SELECT upper(trim(code)) as code FROM currencies WHERE is_active = true',
    )
    const activeSet = new Set(activeCurrenciesRes.rows.map((r) => r.code))
    // Temel kurların (USD, EUR, GBP) her zaman kaydedilmesini sağla
    activeSet.add('USD')
    activeSet.add('EUR')
    activeSet.add('GBP')
    activeSet.add('CHF')
    activeSet.add('RUB')
    activeSet.add('SAR')
    activeSet.add('AED')

    let inserted = 0
    for (const { code, rate } of rates) {
      if (!activeSet.has(code)) continue

      await client.query(
        `INSERT INTO currency_rates (base_code, quote_code, rate, source, fetched_at)
         VALUES ($1::char(3), 'TRY'::char(3), $2::numeric, 'tcmb_auto', now())`,
        [code, rate],
      )
      console.log(`[tcmb-sync] 1 ${code} = ${rate.toFixed(4)} TRY kaydedildi.`)
      inserted++
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
