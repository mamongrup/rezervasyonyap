'use client'

import rightImg from '@/images/svg-subcribe-2.png'
import { Badge } from '@/shared/Badge'
import ButtonCircle from '@/shared/ButtonCircle'
import { Heading, Subheading } from '@/shared/Heading'
import Input from '@/shared/Input'
import { getMessages } from '@/utils/getT'
import { ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { FC, useState } from 'react'

interface Props {
  className?: string
}

const SectionSubscribe2: FC<Props> = ({ className = '' }) => {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const T = getMessages(locale).newsletter

  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) throw new Error('subscribe_failed')
      setDone(true)
      setEmail('')
    } catch {
      setError(T.errorMessage)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={`relative flex flex-col lg:flex-row lg:items-center ${className}`}>
      <div className="mb-10 shrink-0 lg:me-10 lg:mb-0 lg:w-2/5">
        <Heading>{T.title}</Heading>
        <Subheading className="mt-5">{T.subtitle}</Subheading>
        <ul className="mt-10 space-y-4">
          <li className="flex items-center gap-x-4">
            <Badge color="blue">01</Badge>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{T.benefit1}</span>
          </li>
          <li className="flex items-center gap-x-4">
            <Badge color="red">02</Badge>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{T.benefit2}</span>
          </li>
        </ul>

        {done ? (
          <div className="mt-10 flex items-center gap-2 rounded-2xl bg-green-50 px-5 py-3 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {T.successMessage}
          </div>
        ) : (
          <form className="relative mt-10 max-w-sm" onSubmit={onSubmit}>
            <Input
              required
              aria-required
              placeholder={T.emailPlaceholder}
              type="email"
              rounded="rounded-full"
              sizeClass="h-12 px-5 py-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="absolute end-1.5 top-1/2 -translate-y-1/2">
              <ButtonCircle type="submit" disabled={pending}>
                <HugeiconsIcon icon={ArrowRight02Icon} className="size-4! rtl:rotate-180" strokeWidth={1.75} />
              </ButtonCircle>
            </div>
            {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
          </form>
        )}
      </div>
      <div className="grow">
        <Image alt="newsletter" src={rightImg} />
      </div>
    </div>
  )
}

export default SectionSubscribe2
