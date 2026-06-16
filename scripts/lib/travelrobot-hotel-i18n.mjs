/**
 * GetHotelDetails — ek diller (en, de, ru, zh, fr).
 */
import { getHotelDetails } from './travelrobot-api.mjs'
import { hotelRef } from './travelrobot-listing-db.mjs'

const EXTRA_LOCALES = ['en', 'de', 'ru', 'zh', 'fr']

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * @param {object} opts — { delayMs, locales, log, force, withI18n }
 */
export async function enrichHotelRowsWithI18nDetails(cfg, tokenCode, rows, opts = {}) {
  if (!rows.length || !tokenCode) return rows
  if (opts.withI18n === false) return rows

  const locales = opts.locales ?? EXTRA_LOCALES
  const delayMs = Number(opts.delayMs ?? process.env.TRAVELROBOT_I18N_DELAY_MS ?? 200)
  const log = opts.log ?? (() => {})
  const force = opts.force === true
  const out = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const code = hotelRef(row)
    if (!code || (!force && row?.I18nDetails && Object.keys(row.I18nDetails).length >= locales.length)) {
      out.push(row)
      continue
    }

    const i18n = { ...(row?.I18nDetails ?? {}) }
    for (const locale of locales) {
      if (!force && i18n[locale]) continue
      try {
        const payload = await getHotelDetails(cfg, tokenCode, code, { languageCode: locale })
        if (payload?.HasError) continue
        const result = payload?.Result ?? payload?.result
        if (result && typeof result === 'object') i18n[locale] = result
      } catch {
        /* atla */
      }
      if (delayMs > 0) await sleep(delayMs)
    }

    out.push({ ...row, I18nDetails: i18n })
    if ((i + 1) % 20 === 0) await log(`Otel: i18n GetHotelDetails ${i + 1}/${rows.length}…`)
  }

  await log(`Otel: çoklu dil detay — ${out.length} satır işlendi`)
  return out
}
