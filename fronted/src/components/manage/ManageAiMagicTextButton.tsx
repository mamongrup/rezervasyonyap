'use client'

import { MAGIC_TEXT_BTN_CLASS } from '@/lib/manage-content-ai'
import { Loader2, Wand2 } from 'lucide-react'

type Props = {
  loading?: boolean
  disabled?: boolean
  onClick: () => void
  title?: string
  children?: React.ReactNode
}

export function ManageAiMagicTextButton({
  loading,
  disabled,
  onClick,
  title,
  children = (
    <>
      <Wand2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Magic Text
    </>
  ),
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={MAGIC_TEXT_BTN_CLASS}
      title={title}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  )
}
