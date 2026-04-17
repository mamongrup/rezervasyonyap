/**
 * Yönetim paneli içerik formları — /api/ai-translate ile SEO / çeviri / polish.
 */

export const MAGIC_TEXT_BTN_CLASS =
  'inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1 text-xs font-bold text-neutral-900 shadow-sm transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-neutral-950 dark:hover:bg-amber-400'

export type ManageAiContext = 'title' | 'excerpt' | 'body' | 'seo'

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
