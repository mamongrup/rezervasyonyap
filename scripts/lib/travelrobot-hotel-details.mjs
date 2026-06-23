/**
 * Travelrobot Hotel API — GetHotelDetails ile galeri + vitrin zenginleştirme.
 * Static getHotels genelde tek kapak döner; GetHotelDetails HotelImages[] verir.
 */
import { getHotelDetails } from './travelrobot-api.mjs'
import { collectHotelImageUrls, hotelRef } from './travelrobot-listing-db.mjs'
import { catalogHasTravelrobotVitrinSource } from './travelrobot-hotel-vitrin-db.mjs'
import { looksLikeEnglishHotelText } from './travelrobot-hotel-vitrin.mjs'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** GetHotelDetails yanıtını mevcut otel satırına birleştirir (görsel + tesis bilgisi). */
export function mergeHotelDetails(row, detailsPayload) {
  const result = detailsPayload?.Result ?? detailsPayload?.result
  if (!result || typeof result !== 'object') return row

  const hotelImages = result.HotelImages ?? result.hotelImages
  const nested = row?.Hotel ?? row?.hotel ?? {}
  const summary =
    result.SummaryText ?? result.summaryText ?? result.Description ?? result.description ?? null
  const existingDescription = row?.Description || row?.description || null
  const preferredDescription =
    summary && !looksLikeEnglishHotelText(summary) ? summary : existingDescription

  return {
    ...row,
    Description: preferredDescription,
    ...(Array.isArray(hotelImages) && hotelImages.length
      ? { Images: hotelImages, HotelImages: hotelImages }
      : {}),
    Hotel: {
      ...nested,
      ...result,
      ...(Array.isArray(hotelImages) && hotelImages.length ? { HotelImages: hotelImages } : {}),
      SummaryText: summary ?? nested?.SummaryText,
    },
  }
}

/** @deprecated — mergeHotelDetails kullanın */
export const mergeHotelDetailsGallery = mergeHotelDetails

/**
 * Satırlarda az görsel / vitrin verisi varsa GetHotelDetails çeker.
 * opts: { minImages, delayMs, log, skipIfMany, force }
 */
export async function enrichHotelRowsWithDetailsGallery(cfg, tokenCode, rows, opts = {}) {
  if (!rows.length || !tokenCode) return rows

  const minImages = Number(opts.minImages ?? process.env.TRAVELROBOT_DETAILS_MIN_IMAGES ?? 2)
  const delayMs = Number(opts.delayMs ?? process.env.TRAVELROBOT_DETAILS_DELAY_MS ?? 250)
  const skipIfMany = opts.skipIfMany !== false && opts.force !== true
  const force = opts.force === true
  const log = opts.log ?? (() => {})

  const out = []
  let expanded = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const code = hotelRef(row)
    const beforeImages = collectHotelImageUrls(row).length
    const hasVitrin = catalogHasTravelrobotVitrinSource(row)

    if (!code) {
      out.push(row)
      continue
    }

    if (!force && skipIfMany && beforeImages >= minImages && hasVitrin) {
      out.push(row)
      skipped++
      continue
    }

    try {
      const payload = await getHotelDetails(cfg, tokenCode, code, {
        languageCode: 'tr',
        productCode: code,
      })
      if (payload?.HasError) {
        failed++
        out.push(row)
      } else {
        const merged = mergeHotelDetails(row, payload)
        const afterImages = collectHotelImageUrls(merged).length
        if (afterImages > beforeImages || catalogHasTravelrobotVitrinSource(merged)) expanded++
        out.push(merged)
      }
    } catch {
      failed++
      out.push(row)
    }

    if (delayMs > 0 && i + 1 < rows.length) await sleep(delayMs)
    if ((i + 1) % 25 === 0) await log(`Otel: GetHotelDetails ${i + 1}/${rows.length}…`)
  }

  await log(
    `Otel: GetHotelDetails — ${expanded} otelde detay genişletildi, ${skipped} atlandı, ${failed} hata/atlandı`,
  )
  return out
}
