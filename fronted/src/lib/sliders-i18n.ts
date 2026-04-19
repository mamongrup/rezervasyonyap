/**
 * Slider & banner için çoklu dilli alan yardımcıları.
 *
 * Tarihsel sebeplerle bu dosya sliders'a özel görünür ama altta yatan
 * implementasyon `lib/localized-text.ts` içinde paylaşımlıdır.
 * Yeni kod doğrudan `@/lib/localized-text`'i kullansın.
 */

export {
  hasAnyLocalized,
  normalizeLocalizedText,
  pickLocalized,
  type LocalizedText,
} from '@/lib/localized-text'
