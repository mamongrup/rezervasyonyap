'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { useState } from 'react'

type Props = {
  title: string
  placeholder: string
  buttonLabel: string
}

export default function FooterNewsletter({ title, placeholder, buttonLabel }: Props) {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setBusy(true)
    try {
      const r = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (r.ok) {
        setMsg('Teşekkürler — kaydınız alındı.')
        setEmail('')
      } else {
        setMsg(j.error ?? 'Gönderilemedi.')
      }
    } catch {
      setMsg('Bağlantı hatası.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-700 dark:bg-neutral-800/50">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
        Erken rezervasyon ve kampanyalardan haberdar olun (çift onay e-posta servisinize bağlandığında tamamlanır).
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder={placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="sm:min-w-[220px] sm:flex-1"
        />
        <ButtonPrimary type="submit" disabled={busy} className="shrink-0">
          {busy ? '…' : buttonLabel}
        </ButtonPrimary>
      </form>
      {msg ? <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">{msg}</p> : null}
    </div>
  )
}
