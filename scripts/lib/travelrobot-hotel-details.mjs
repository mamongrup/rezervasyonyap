/**
 * Travelrobot Hotel API — GetHotelDetails ile galeri zenginleştirme.
 * Static getHotels genelde tek kapak döner; GetHotelDetails HotelImages[] verir.
 */
import { getHotelDetails } from './travelrobot-api.mjs'
import { collectHotelImageUrls, hotelRef } from './travelrobot-listing-db.mjs'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** GetHotelDetails yanıtını mevcut otel satırına birleştirir. */
export function mergeHotelDetailsGallery(row, detailsPayload) {
  const result = detailsPayload?.Result ?? detailsPayload?.result
  if (!result || typeof result !== 'object') return row

  const hotelImages = result.HotelImages ?? result.hotelImages
  if (!Array.isArray(hotelImages) || !hotelImages.length) return row

  const nested = row?.Hotel ?? row?.hotel ?? {}
  const summary =
    result.SummaryText ?? result.summaryText ?? result.Description ?? result.description ?? null

  return {
    ...row,
    Description: row?.Description || row?.description || summary || null,
    Images: hotelImages,
    HotelImages: hotelImages,
    Hotel: {
      ...nested,
      ...result,
      HotelImages: hotelImages,
      SummaryText: summary ?? nested?.SummaryText,
    },
  }
}

/**
 * Satırlarda az görsel varsa GetHotelDetails ile galeri çeker.
 * opts: { minImages, delayMs, log, skipIfMany }
 */
export async function enrichHotelRowsWithDetailsGallery(cfg, tokenCode, rows, opts = {}) {
  if (!rows.length || !tokenCode) return rows

  const minImages = Number(opts.minImages ?? process.env.TRAVELROBOT_DETAILS_MIN_IMAGES ?? 2)
  const delayMs = Number(opts.delayMs ?? process.env.TRAVELROBOT_DETAILS_DELAY_MS ?? 250)
  const skipIfMany = opts.skipIfMany !== false
  const log = opts.log ?? (() => {})

  const out = []
  let expanded = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const code = hotelRef(row)
    const before = collectHotelImageUrls(row).length

    if (!code || (skipIfMany && before >= minImages)) {
      out.push(row)
      if (before >= minImages) skipped++
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
        const merged = mergeHotelDetailsGallery(row, payload)
        const after = collectHotelImageUrls(merged).length
        if (after > before) expanded++
        out.push(merged)
      }
    } catch {
      failed++
      out.push(row)
    }

    if (delayMs > 0 && i + 1 < rows.length) await sleep(delayMs)
    if ((i + 1) % 25 === 0) await log(`Otel: GetHotelDetails galeri ${i + 1}/${rows.length}…`)
  }

  await log(
    `Otel: GetHotelDetails — ${expanded} otelde galeri genişletildi, ${skipped} zaten yeterli, ${failed} hata/atlandı`,
  )
  return out
}
