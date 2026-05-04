/**
 * Yapay zeka HTTP upstream süreleri — yalnızca site_settings `ai` JSON (`request_timeout_sec`, `module_timeouts_sec`).
 * Next.js `/api/ai-translate` ve paneller aynı anahtarları kullanır.
 */

/** Genel süre alanı boş / geçersizse (panel varsayılanıyla uyumlu). */
export const DEFAULT_AI_TIMEOUT_SEC = 3600

/** Üst sınır (sn): backend httpc + Gleam ile aynı; uzun model yanıtlarında erken kesilmesin. */
export const MAX_AI_TIMEOUT_SEC = 10_000

/** Panel maks. süresi (ms); uzun kuyruk API çağrıları için fetch üst sınırı. */
export const MAX_AI_UPSTREAM_MS = MAX_AI_TIMEOUT_SEC * 1000

/** Saniye: güvenli aralık 5 sn – 10000 sn */
export function clampTimeoutSec(raw: number): number {
  if (!Number.isFinite(raw) || raw < 5) return 5
  if (raw > MAX_AI_TIMEOUT_SEC) return MAX_AI_TIMEOUT_SEC
  return Math.round(raw)
}

export function secToMs(sec: number): number {
  return clampTimeoutSec(sec) * 1000
}

const PROFILE_TRANSLATOR = 'translator'

function moduleTimeoutSec(
  mod: Record<string, unknown>,
  profileCode: string,
  defSec: number,
): number {
  const v = mod[profileCode]
  if (typeof v === 'number' && v > 0) return clampTimeoutSec(v)
  if (typeof v === 'string') {
    const n = Number.parseFloat(v.trim())
    if (Number.isFinite(n) && n > 0) return clampTimeoutSec(n)
  }
  if (profileCode === 'region_tourism_content') {
    return moduleTimeoutSec(mod, 'region_hierarchy', defSec)
  }
  if (profileCode === 'region_blog_writer' || profileCode === 'place_blog_writer') {
    return moduleTimeoutSec(mod, 'content_writer', defSec)
  }
  return defSec
}

/**
 * `site_settings` `ai` value_json nesnesinden modül veya varsayılan süreyi ms cinsinden döndürür.
 */
export function timeoutMsForProfile(
  settings: Record<string, unknown> | null | undefined,
  profileCode: string,
): number {
  let defSec = DEFAULT_AI_TIMEOUT_SEC
  const rt = settings?.request_timeout_sec
  if (typeof rt === 'number' && rt > 0) defSec = clampTimeoutSec(rt)
  else if (typeof rt === 'string') {
    const n = Number.parseFloat(rt.trim())
    if (Number.isFinite(n) && n > 0) defSec = clampTimeoutSec(n)
  }

  const mod = settings?.module_timeouts_sec
  if (mod && typeof mod === 'object' && mod !== null) {
    const sec = moduleTimeoutSec(mod as Record<string, unknown>, profileCode, defSec)
    return secToMs(sec)
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
  {
    profileCode: 'region_tourism_content',
    label: 'Bölge tanıtımı (toplu)',
    path: '/manage/admin/marketing/ai',
    desc: 'Pazarlama AI — bölge HTML tanıtımı — profil: region_tourism_content',
  },
  {
    profileCode: 'region_blog_writer',
    label: 'Bölge blog (toplu)',
    path: '/manage/admin/marketing/ai',
    desc: 'Pazarlama AI — gezi blog gövdesi — profil: region_blog_writer',
  },
  {
    profileCode: 'place_blog_writer',
    label: 'Mekan blog (toplu)',
    path: '/manage/admin/marketing/ai',
    desc: 'Pazarlama AI — favori mekan yazıları — profil: place_blog_writer',
  },
] as const
