/**
 * Next.js varsayılan `polyfill-module` (Array.at, flat, trimStart, …) PSI'da
 * "Eski JavaScript" olarak işlenir; `browserslist` zaten modern (Chrome 111+,
 * Safari 16.4+). Bu dosya yalnızca Safari 16.x'te eksik olabilen `URL.canParse`
 * için ince yama — geri kalanı native.
 */
if (typeof URL !== 'undefined' && !('canParse' in URL)) {
  URL.canParse = function canParse(url, base) {
    try {
      return !!new URL(url, base)
    } catch {
      return false
    }
  }
}
