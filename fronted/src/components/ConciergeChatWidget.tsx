'use client'

import { useLocaleSegment } from '@/contexts/locale-context'
import {
  createSupportChatSession,
  listSupportChatMessages,
  postSupportChatMessage,
  type SupportChatMessage,
} from '@/lib/travel-api'
import { SITE_LOCALE_CATALOG, type SiteLocaleCode } from '@/lib/i18n-catalog-locales'
import { getStoredAuthToken } from '@/lib/auth-storage'
import clsx from 'clsx'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

const AI_MODES = [
  { value: 'concierge', label: 'Concierge' },
  { value: 'sales', label: 'Satış' },
  { value: 'cross_sell', label: 'Çapraz satış' },
] as const

const ALLOWED_CHAT_LOCALES = new Set<string>(SITE_LOCALE_CATALOG.map((c) => c.code))

function normalizeChatLocale(raw: string): SiteLocaleCode {
  const l = raw.trim().toLowerCase()
  return ALLOWED_CHAT_LOCALES.has(l) ? (l as SiteLocaleCode) : 'tr'
}

export default function ConciergeChatWidget() {
  const pathname = usePathname()
  const uiLocale = normalizeChatLocale(useLocaleSegment())
  const hideOnManage = pathname?.includes('/manage')
  const [open, setOpen] = useState(false)
  const [aiMode, setAiMode] = useState<string>('concierge')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SupportChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (open) scrollToBottom()
  }, [messages, open, scrollToBottom])

  const refreshMessages = useCallback(async (sid: string) => {
    const r = await listSupportChatMessages(sid)
    setMessages(r.messages)
  }, [])

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId
    const token = getStoredAuthToken() ?? undefined
    const r = await createSupportChatSession(
      { channel_code: 'live_chat', ai_mode: aiMode, locale: uiLocale },
      token,
    )
    setSessionId(r.id)
    return r.id
  }, [sessionId, aiMode, uiLocale])

  const onOpen = useCallback(async () => {
    setOpen(true)
    setErr(null)
    setBusy(true)
    try {
      const sid = await ensureSession()
      await refreshMessages(sid)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'session_failed')
    } finally {
      setBusy(false)
    }
  }, [ensureSession, refreshMessages])

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setBusy(true)
    setErr(null)
    try {
      const sid = await ensureSession()
      await postSupportChatMessage(sid, { body: text })
      setDraft('')
      await refreshMessages(sid)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'send_failed')
    } finally {
      setBusy(false)
    }
  }

  // Mobile nav chat button dispatch'ini dinle
  useEffect(() => {
    const handler = () => void onOpen()
    window.addEventListener('open-chat', handler)
    return () => window.removeEventListener('open-chat', handler)
  }, [onOpen])

  if (hideOnManage) return null

  return (
    <>
      {/* Floating button — sadece lg+ ekranlarda görünür (mobilde bottom nav'da yer alıyor) */}
      <button
        type="button"
        onClick={() => void (open ? setOpen(false) : onOpen())}
        className="hidden lg:flex fixed bottom-6 end-6 z-[100] h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] ring-2 ring-white/20 transition-all duration-200 hover:scale-105 hover:shadow-[0_12px_32px_rgba(0,0,0,0.22)] active:scale-95 dark:from-primary-400 dark:to-primary-600"
        aria-label={open ? 'Sohbeti kapat' : 'AI asistan'}
      >
        {open ? (
          /* Kapat — X */
          <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          /* Chat balonu + AI yıldızı */
          <span className="relative flex items-center justify-center">
            <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            {/* Küçük parlayan nokta — "online" göstergesi */}
            <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-green-400 ring-1 ring-white/30" />
            </span>
          </span>
        )}
      </button>

      {open ? (
        <div className="fixed bottom-20 end-4 lg:bottom-24 lg:end-6 z-[100] flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
          <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white">
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Seyahat Asistanı</p>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500">Size nasıl yardımcı olabilirim?</p>
              </div>
            </div>
            {/* Mod seçici gizli — arka planda concierge modunda çalışır */}
            <select
              value={aiMode}
              disabled={!!sessionId}
              onChange={(e) => setAiMode(e.target.value)}
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
            >
              {AI_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="max-h-72 overflow-y-auto px-3 py-2 text-sm">
            {busy && messages.length === 0 ? (
              <p className="text-neutral-500">Yükleniyor…</p>
            ) : null}
            {err ? <p className="text-red-600 dark:text-red-400">{err}</p> : null}
            {messages.map((m) => (
              <div
                key={m.id}
                className={clsx(
                  'mb-2 rounded-xl px-3 py-2',
                  m.role === 'user'
                    ? 'ms-4 bg-primary-50 dark:bg-primary-950/40'
                    : 'me-4 bg-neutral-100 dark:bg-neutral-800',
                )}
              >
                <span className="text-[10px] uppercase text-neutral-500">{m.role}</span>
                <p className="whitespace-pre-wrap text-neutral-800 dark:text-neutral-100">{m.body}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={(e) => void onSend(e)} className="border-t border-neutral-200 p-2 dark:border-neutral-700">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="Mesajınız…"
              className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="mt-2 w-full rounded-xl bg-primary-600 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? '…' : 'Gönder'}
            </button>
          </form>
        </div>
      ) : null}
    </>
  )
}
