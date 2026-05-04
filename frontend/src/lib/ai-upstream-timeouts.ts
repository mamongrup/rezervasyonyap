/**
 * Yapay zeka HTTP upstream süreleri — yalnızca site_settings `ai` JSON (`request_timeout_sec`, `module_timeouts_sec`).
 * Next.js `/api/ai-translate` ve paneller aynı anahtarları kullanır.
 */

/** Genel süre alanı boş / geçersizse (panel varsayılanıyla uyumlu). */
export const DEFAULT_AI_TIMEOUT_SEC = 3600

/** Üst sınır (sn): backend httpc + Gleam ile aynı; uzun model yanıtlarında erken kesilmesin. */
export const MAX_AI_TIMEOUT_SEC = 21_600

/** Saniye: güvenli aralık 5 sn – 6 saat */
export function clampTimeoutSec(raw: number): number {
  if (!Number.isFinite(raw) || raw < 5) return 5
  if (raw > MAX_AI_TIMEOUT_SEC) return MAX_AI_TIMEOUT_SEC
  return Math.round(raw)
}

export function secToMs(sec: number): number {
  return clampTimeoutSec(sec) * 1000
}

const PROFILE_TRANSLATOR = 'translator'

/**
 * `site_settings` `ai` value_json nesnesinden modül veya varsayılan süreyi ms cinsinden döndürür.
 */
export function timeoutMsForProfile(
  settings: Record<string, unknown> | null | undefined,
  profileCode: string,
): number {
  const defSec =
    typeof settings?.request_timeout_sec === 'number' && settings.request_timeout_sec > 0
      ? clampTimeoutSec(settings.request_timeout_sec)
      : DEFAULT_AI_TIMEOUT_SEC

  const mod = settings?.module_timeouts_sec
  if (mod && typeof mod === 'object' && mod !== null) {
    const v = (mod as Record<string, unknown>)[profileCode]
    if (typeof v === 'number' && v > 0) return secToMs(v)
    if (typeof v === 'string') {
      const n = Number.parseFloat(v.trim())
      if (Number.isFinite(n) && n > 0) return secToMs(n)
    }
  }
  return secToMs(defSec)
}

/** Blog /api/ai-translate — `translator` profili */
export function timeoutMsForTranslator(settings: Record<string, unknown> | null | undefined): number {
  return timeoutMsForProfile(settings, PROFILE_TRANSLATOR)
}

/** Geriye dönük: `timeoutMsForProfile` ile aynı. */
export function resolveUpstreamTimeoutMs(
  settings: Record<string, unknown> | null | undefined,
  profileCode: string,
): number {
  return timeoutMsForProfile(settings, profileCode)
}

/** Geriye dönük: `timeoutMsForTranslator` ile aynı. */
export function resolveTranslatorTimeoutMs(settings: Record<string, unknown> | null | undefined): number {
  return timeoutMsForTranslator(settings)
}

/** Eğitim / modül panelleri — profil kodu site_settings ile uyumlu */
export const AI_PROFILE_MODULES = [
  {
    profileCode: 'content_writer',
    label: 'İçerik oluşturucu',
    path: '/manage/ai/content',
    desc: 'Blog, sayfa, ilan metinleri — profil: content_writer',
  },
  {
    profileCode: 'region_hierarchy',
    label: 'Bölge & hiyerarşi',
    path: '/manage/ai/regions',
    desc: 'Coğrafi görevler + profil: region_hierarchy',
  },
  {
    profileCode: 'seo_writer',
    label: 'SEO oluşturucu',
    path: '/manage/ai/seo',
    desc: 'Meta başlık / açıklama — profil: seo_writer',
  },
  {
    profileCode: 'translator',
    label: 'Çeviri asistanı',
    path: '/manage/ai/translate',
    desc: 'Çok dilli içerik — profil: translator',
  },
  {
    profileCode: 'chat_sales',
    label: 'Satış sohbeti',
    path: '/manage/ai/chatbot',
    desc: 'Chatbot davranışı — profil: chat_sales',
  },
] as const
