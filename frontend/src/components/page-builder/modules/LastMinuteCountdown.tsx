'use client'

import { useEffect, useState } from 'react'

interface LastMinuteCountdownProps {
  endsAt: string
  locale?: string
}

const LABELS: Record<string, { d: string; h: string; m: string; s: string; ended: string }> = {
  tr: { d: 'gün', h: 'sa', m: 'dk', s: 'sn', ended: 'Süre doldu' },
  en: { d: 'd', h: 'h', m: 'm', s: 's', ended: 'Expired' },
  de: { d: 'T', h: 'Std', m: 'Min', s: 'Sek', ended: 'Abgelaufen' },
  ru: { d: 'д', h: 'ч', m: 'м', s: 'с', ended: 'Истёк' },
  zh: { d: '天', h: '时', m: '分', s: '秒', ended: '已结束' },
  fr: { d: 'j', h: 'h', m: 'm', s: 's', ended: 'Expiré' },
}

function calc(target: number) {
  const now = Date.now()
  const diff = Math.max(0, target - now)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const seconds = Math.floor((diff / 1000) % 60)
  return { diff, days, hours, minutes, seconds }
}

export default function LastMinuteCountdown({ endsAt, locale = 'tr' }: LastMinuteCountdownProps) {
  const target = new Date(endsAt).getTime()
  const [state, setState] = useState(() => calc(target))
  const labels = LABELS[locale] ?? LABELS.tr

  useEffect(() => {
    if (Number.isNaN(target)) return
    const id = setInterval(() => setState(calc(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  if (Number.isNaN(target)) return null
  if (state.diff === 0) {
    return <span className="text-sm font-semibold text-white/80">{labels.ended}</span>
  }

  const cell = (n: number, label: string) => (
    <div className="flex min-w-[3.25rem] flex-col items-center rounded-lg bg-white/15 px-3 py-2 backdrop-blur">
      <span className="text-2xl font-bold leading-none tabular-nums">{String(n).padStart(2, '0')}</span>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-white/80">{label}</span>
    </div>
  )

  return (
    <div className="flex items-center gap-2">
      {state.days > 0 && cell(state.days, labels.d)}
      {cell(state.hours, labels.h)}
      {cell(state.minutes, labels.m)}
      {cell(state.seconds, labels.s)}
    </div>
  )
}
