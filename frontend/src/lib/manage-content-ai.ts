/**
 * Yönetim paneli içerik formları — /api/ai-translate ile SEO / çeviri / polish.
 */

export const MAGIC_TEXT_BTN_CLASS =
  'inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1 text-xs font-bold text-neutral-900 shadow-sm transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-neutral-950 dark:hover:bg-amber-400'

export type ManageAiContext = 'title' | 'excerpt' | 'body' | 'seo' | 'short_label'

export async function callAiTranslate(opts: {
  text: string
  context: ManageAiContext
  sourceLocale: string
  targetLocale: string
  pageSlug?: string
}): Promise<string> {
  const t = opts.text.trim()
  if (!t) return ''
  const res = await fetch('/api/ai-translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: t,
      targetLocale: opts.targetLocale,
      sourceLocale: opts.sourceLocale,
      context: opts.context,
      ...(opts.pageSlug ? { pageSlug: opts.pageSlug } : {}),
    }),
  })
  const data = (await res.json()) as { translated?: string; error?: string; message?: string }
  if (!res.ok) throw new Error(data.message ?? data.error ?? 'AI isteği başarısız')
  return (data.translated ?? '').trim()
}

/**
 * Yönetim panelinde AI çeviri/polish hatalarını kullanıcı dostu mesaja çevirir.
 *
 * `/api/ai-translate` veya `translateOneToMany` çağrılarından `Error` yakaladığında
 * kullanın: `setMsg(aiErrorMessage(err))`.
 */
export function aiErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  const code = raw.trim().toLowerCase()
  switch (code) {
    case 'unauthorized':
      return 'AI çeviri için oturumunuz geçersiz. Lütfen tekrar giriş yapın.'
    case 'forbidden':
      return 'AI çeviri için yönetici yetkisi (admin.users.read) gerekli.'
    case 'rate_limited':
      return 'Çok fazla AI isteği gönderildi. Bir dakika bekleyip tekrar deneyin.'
    case 'ai_not_configured':
      return 'AI sağlayıcısı yapılandırılmamış. Ayarlar → Yapay Zeka bölümünde DeepSeek anahtarı tanımlayın.'
    case 'invalid_targetlocale':
    case 'invalid_sourcelocale':
      return 'Geçersiz dil kodu.'
    case 'text_required':
      return 'AI çevrilecek metin boş.'
    case 'text_too_long':
      return 'Metin çok uzun, AI ile çevrilemiyor.'
    case 'upstream_timeout':
      return 'AI sağlayıcı zaman aşımına uğradı. Tekrar deneyin.'
    case 'deepseek_error':
    case 'network_error':
      return 'AI sağlayıcısına ulaşılamadı. Birazdan tekrar deneyin.'
    case 'invalid_body':
    case 'invalid_context':
      return 'AI isteği geçersiz biçimde.'
    case '':
      return 'AI çeviri başarısız oldu.'
    default:
      return raw
  }
}

export type TranslateOneToManyResult = {
  /** Başarılı çeviriler: hedef dil → çevrilmiş metin */
  ok: Record<string, string>
  /** Boş döndüren veya hata atan diller (kullanıcıya raporlamak için) */
  failed: Array<{ locale: string; error: string }>
}

/**
 * Tek bir kaynak metni birden çok hedef dile paralel çevirir.
 * Her dil için `callAiTranslate` çağrılır; başarısız ya da boş dönen diller
 * `failed` listesine konur, başarılılar `ok` haritasında döner.
 *
 * Nedenini görmek için `aiErrorMessage()` ile çevrilmiş hata mesajını birlikte sun.
 */
export async function translateOneToMany(opts: {
  text: string
  context: ManageAiContext
  sourceLocale: string
  targetLocales: readonly string[]
  pageSlug?: string
}): Promise<TranslateOneToManyResult> {
  const text = opts.text.trim()
  if (!text || opts.targetLocales.length === 0) {
    return { ok: {}, failed: [] }
  }
  const targets = opts.targetLocales.filter(
    (lc) => lc.trim() && lc.toLowerCase() !== opts.sourceLocale.toLowerCase(),
  )
  const results = await Promise.allSettled(
    targets.map((lc) =>
      callAiTranslate({
        text,
        context: opts.context,
        sourceLocale: opts.sourceLocale,
        targetLocale: lc,
        pageSlug: opts.pageSlug,
      }).then((translated) => [lc, translated] as const),
    ),
  )
  const ok: Record<string, string> = {}
  const failed: Array<{ locale: string; error: string }> = []
  results.forEach((r, idx) => {
    const lc = targets[idx]
    if (r.status === 'fulfilled') {
      const [, translated] = r.value
      if (translated) ok[lc] = translated
      else failed.push({ locale: lc, error: 'empty_response' })
    } else {
      const err = r.reason
      const msg = err instanceof Error ? err.message : String(err ?? 'unknown')
      failed.push({ locale: lc, error: msg })
    }
  })
  return { ok, failed }
}
