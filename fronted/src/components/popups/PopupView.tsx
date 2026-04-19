'use client'

import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { pickLocalized } from '@/lib/localized-text'
import type { PopupItem } from '@/lib/popups-types'
import clsx from 'clsx'

/**
 * Tek bir popup'ın görünümünü render eder. Tetikleme/sıklık değil sadece UI.
 *
 * Layout'a göre farklı kabuklar (modal merkezi, banner, köşe kutusu, fullscreen)
 * üretir. İçerik (eyebrow / başlık / metin / ctaButtons / kampanya kartları)
 * tüm varyantlar arasında ortaktır.
 */

interface Props {
  popup: PopupItem
  locale: string
  onClose: () => void
  onDismissForever: () => void
}

export default function PopupView({ popup, locale, onClose, onDismissForever }: Props) {
  const eyebrow = pickLocalized(popup.eyebrow, locale)
  const title = pickLocalized(popup.title, locale)
  const body = pickLocalized(popup.body, locale)
  const ctaText = pickLocalized(popup.ctaText, locale)
  const ctaText2 = pickLocalized(popup.ctaText2, locale)

  const isLight = popup.theme === 'light'
  const accent = popup.accentColor || '#0EA5E9'

  const textAlign =
    popup.align === 'left' ? 'text-left' : popup.align === 'right' ? 'text-right' : 'text-center'

  // Banner / corner / fullscreen / modal kabuk seçimi
  switch (popup.layout) {
    case 'banner_top':
    case 'banner_bottom':
      return (
        <BannerShell
          popup={popup}
          onClose={onClose}
          onDismissForever={onDismissForever}
          position={popup.layout === 'banner_top' ? 'top' : 'bottom'}
        >
          <div className="container flex flex-col items-center gap-2 py-3 sm:flex-row sm:gap-4 sm:py-2">
            {popup.icon && <span className="text-2xl">{popup.icon}</span>}
            <div className="min-w-0 flex-1">
              {eyebrow && (
                <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-80">
                  {eyebrow}
                </span>
              )}
              {title && <h3 className="truncate text-sm font-semibold sm:text-base">{title}</h3>}
              {body && <p className="text-xs opacity-90 sm:text-sm line-clamp-2">{body}</p>}
            </div>
            <CtaButtons
              ctaText={ctaText}
              ctaHref={popup.ctaHref}
              ctaText2={ctaText2}
              ctaHref2={popup.ctaHref2}
              accent={accent}
              isLight={isLight}
              size="sm"
              onClick={onClose}
            />
          </div>
        </BannerShell>
      )

    case 'side_corner':
      return (
        <CornerShell
          popup={popup}
          onClose={onClose}
          onDismissForever={onDismissForever}
        >
          {popup.imageUrl && (
            <div className="relative h-32 w-full overflow-hidden">
              <Image
                src={popup.imageUrl}
                alt={title || popup.name}
                fill
                className="object-cover"
                unoptimized={popup.imageUrl.startsWith('/uploads/')}
              />
            </div>
          )}
          <div className={clsx('p-4', textAlign)}>
            {popup.icon && <div className="mb-1 text-2xl">{popup.icon}</div>}
            {eyebrow && (
              <span
                className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ backgroundColor: `${accent}22`, color: accent }}
              >
                {eyebrow}
              </span>
            )}
            {title && <h3 className="text-base font-semibold leading-tight">{title}</h3>}
            {body && <p className="mt-1.5 text-xs opacity-80 line-clamp-3">{body}</p>}
            <div className="mt-3">
              <CtaButtons
                ctaText={ctaText}
                ctaHref={popup.ctaHref}
                ctaText2={ctaText2}
                ctaHref2={popup.ctaHref2}
                accent={accent}
                isLight={isLight}
                size="sm"
                onClick={onClose}
                stack
              />
            </div>
          </div>
        </CornerShell>
      )

    case 'fullscreen':
      return (
        <FullscreenShell
          popup={popup}
          onClose={onClose}
          onDismissForever={onDismissForever}
        >
          <div className={clsx('mx-auto flex max-w-3xl flex-col gap-4', textAlign)}>
            {popup.icon && <div className="text-5xl">{popup.icon}</div>}
            {eyebrow && (
              <span
                className="mx-auto inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
                style={{ backgroundColor: `${accent}33`, color: '#fff' }}
              >
                {eyebrow}
              </span>
            )}
            {title && (
              <h2 className="text-3xl font-extrabold leading-tight text-white sm:text-5xl">
                {title}
              </h2>
            )}
            {body && <p className="text-base text-white/85 sm:text-lg">{body}</p>}
            {popup.cards.length > 0 && (
              <CardGrid cards={popup.cards} locale={locale} accent={accent} dark />
            )}
            <div className="mt-2 flex justify-center">
              <CtaButtons
                ctaText={ctaText}
                ctaHref={popup.ctaHref}
                ctaText2={ctaText2}
                ctaHref2={popup.ctaHref2}
                accent={accent}
                isLight={false}
                size="lg"
                onClick={onClose}
              />
            </div>
          </div>
        </FullscreenShell>
      )

    case 'modal_split':
      return (
        <ModalShell
          popup={popup}
          onClose={onClose}
          onDismissForever={onDismissForever}
          wide
        >
          <div className="grid gap-0 sm:grid-cols-2">
            <div className="relative min-h-[220px] sm:min-h-[420px]">
              {popup.imageUrl ? (
                <Image
                  src={popup.imageUrl}
                  alt={title || popup.name}
                  fill
                  className="object-cover"
                  unoptimized={popup.imageUrl.startsWith('/uploads/')}
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
                  }}
                />
              )}
              {popup.icon && (
                <div className="absolute left-4 top-4 rounded-2xl bg-white/90 px-3 py-1 text-2xl shadow">
                  {popup.icon}
                </div>
              )}
            </div>
            <div className={clsx('flex flex-col justify-center gap-3 p-6 sm:p-8', textAlign)}>
              {eyebrow && (
                <span
                  className="inline-block w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${accent}22`, color: accent }}
                >
                  {eyebrow}
                </span>
              )}
              {title && <h2 className="text-2xl font-bold leading-tight">{title}</h2>}
              {body && <p className="text-sm opacity-80 sm:text-base">{body}</p>}
              <div className="mt-2">
                <CtaButtons
                  ctaText={ctaText}
                  ctaHref={popup.ctaHref}
                  ctaText2={ctaText2}
                  ctaHref2={popup.ctaHref2}
                  accent={accent}
                  isLight={isLight}
                  size="md"
                  onClick={onClose}
                />
              </div>
            </div>
          </div>
        </ModalShell>
      )

    case 'modal_center':
    default:
      return (
        <ModalShell popup={popup} onClose={onClose} onDismissForever={onDismissForever}>
          <div className={clsx('p-6 sm:p-8', textAlign)}>
            {popup.imageUrl && (
              <div className="relative mb-4 aspect-[16/9] w-full overflow-hidden rounded-xl">
                <Image
                  src={popup.imageUrl}
                  alt={title || popup.name}
                  fill
                  className="object-cover"
                  unoptimized={popup.imageUrl.startsWith('/uploads/')}
                />
              </div>
            )}
            {popup.icon && <div className="mb-2 text-4xl">{popup.icon}</div>}
            {eyebrow && (
              <span
                className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: `${accent}22`, color: accent }}
              >
                {eyebrow}
              </span>
            )}
            {title && <h2 className="text-xl font-bold leading-tight sm:text-2xl">{title}</h2>}
            {body && <p className="mt-2 text-sm opacity-80 sm:text-base">{body}</p>}
            {popup.cards.length > 0 && (
              <div className="mt-4">
                <CardGrid cards={popup.cards} locale={locale} accent={accent} />
              </div>
            )}
            <div className="mt-4 flex justify-center">
              <CtaButtons
                ctaText={ctaText}
                ctaHref={popup.ctaHref}
                ctaText2={ctaText2}
                ctaHref2={popup.ctaHref2}
                accent={accent}
                isLight={isLight}
                size="md"
                onClick={onClose}
              />
            </div>
          </div>
        </ModalShell>
      )
  }
}

// ─── Shells ────────────────────────────────────────────────────────────────

function ModalShell({
  popup,
  onClose,
  onDismissForever,
  wide,
  children,
}: {
  popup: PopupItem
  onClose: () => void
  onDismissForever: () => void
  wide?: boolean
  children: React.ReactNode
}) {
  const isLight = popup.theme === 'light'
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`popup-${popup.id}-title`}
    >
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 cursor-default"
        style={{ background: `rgba(0,0,0,${popup.overlay / 100})` }}
        onClick={onClose}
      />
      <div
        className={clsx(
          'relative max-h-[90vh] w-full overflow-hidden overflow-y-auto rounded-2xl shadow-2xl',
          wide ? 'max-w-3xl' : 'max-w-lg',
          isLight ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white',
        )}
      >
        <CloseButton onClose={onClose} dark={!isLight} />
        {children}
        {popup.allowDismissForever && (
          <button
            type="button"
            onClick={onDismissForever}
            className="block w-full bg-neutral-100 py-2 text-center text-[11px] font-medium text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            Bir daha gösterme
          </button>
        )}
      </div>
    </div>
  )
}

function BannerShell({
  popup,
  onClose,
  onDismissForever,
  position,
  children,
}: {
  popup: PopupItem
  onClose: () => void
  onDismissForever: () => void
  position: 'top' | 'bottom'
  children: React.ReactNode
}) {
  const isLight = popup.theme === 'light'
  return (
    <div
      className={clsx(
        'fixed inset-x-0 z-[70] shadow-2xl',
        position === 'top' ? 'top-0' : 'bottom-0',
        isLight ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white',
      )}
      role="region"
      aria-label="Bildirim çubuğu"
      style={{ borderBottom: position === 'top' ? `3px solid ${popup.accentColor}` : undefined, borderTop: position === 'bottom' ? `3px solid ${popup.accentColor}` : undefined }}
    >
      <div className="relative">
        {children}
        <CloseButton onClose={onClose} dark={!isLight} compact />
        {popup.allowDismissForever && (
          <button
            type="button"
            onClick={onDismissForever}
            className="absolute right-12 top-1.5 text-[10px] font-medium opacity-60 hover:opacity-100"
          >
            Bir daha gösterme
          </button>
        )}
      </div>
    </div>
  )
}

function CornerShell({
  popup,
  onClose,
  onDismissForever,
  children,
}: {
  popup: PopupItem
  onClose: () => void
  onDismissForever: () => void
  children: React.ReactNode
}) {
  const isLight = popup.theme === 'light'
  return (
    <div
      className={clsx(
        'fixed bottom-4 right-4 z-[70] w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl shadow-2xl ring-1',
        isLight
          ? 'bg-white text-neutral-900 ring-neutral-200'
          : 'bg-neutral-900 text-white ring-neutral-700',
      )}
      role="region"
      aria-label="Köşe bildirimi"
    >
      <CloseButton onClose={onClose} dark={!isLight} compact />
      {children}
      {popup.allowDismissForever && (
        <button
          type="button"
          onClick={onDismissForever}
          className="block w-full bg-neutral-50 py-1.5 text-center text-[11px] font-medium text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Bir daha gösterme
        </button>
      )}
    </div>
  )
}

function FullscreenShell({
  popup,
  onClose,
  onDismissForever,
  children,
}: {
  popup: PopupItem
  onClose: () => void
  onDismissForever: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background: popup.imageUrl
            ? `linear-gradient(rgba(0,0,0,${popup.overlay / 100}), rgba(0,0,0,${popup.overlay / 100})), url(${popup.imageUrl}) center/cover`
            : `linear-gradient(135deg, ${popup.accentColor}, #0f172a)`,
        }}
      />
      <div className="relative w-full px-6 py-12 sm:py-20">
        {children}
        <CloseButton onClose={onClose} dark fullscreen />
        {popup.allowDismissForever && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onDismissForever}
              className="text-xs font-medium text-white/70 underline-offset-4 hover:text-white hover:underline"
            >
              Bir daha gösterme
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Bits ──────────────────────────────────────────────────────────────────

function CloseButton({
  onClose,
  dark,
  compact,
  fullscreen,
}: {
  onClose: () => void
  dark?: boolean
  compact?: boolean
  fullscreen?: boolean
}) {
  return (
    <button
      type="button"
      aria-label="Kapat"
      onClick={onClose}
      className={clsx(
        'absolute z-10 flex items-center justify-center rounded-full transition-colors',
        compact ? 'h-7 w-7' : 'h-9 w-9',
        fullscreen ? 'right-4 top-4 sm:right-6 sm:top-6' : 'right-2.5 top-2.5',
        dark
          ? 'bg-white/15 text-white hover:bg-white/25'
          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
      )}
    >
      <X className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </button>
  )
}

function CtaButtons({
  ctaText,
  ctaHref,
  ctaText2,
  ctaHref2,
  accent,
  isLight,
  size,
  stack,
  onClick,
}: {
  ctaText: string
  ctaHref?: string
  ctaText2: string
  ctaHref2?: string
  accent: string
  isLight: boolean
  size: 'sm' | 'md' | 'lg'
  stack?: boolean
  onClick: () => void
}) {
  if (!ctaText && !ctaText2) return null

  const sizeCls =
    size === 'sm'
      ? 'px-3 py-1.5 text-xs'
      : size === 'lg'
        ? 'px-6 py-3 text-base'
        : 'px-4 py-2 text-sm'

  return (
    <div className={clsx('flex gap-2', stack ? 'flex-col' : 'flex-wrap')}>
      {ctaText && ctaHref && (
        <Link
          href={ctaHref}
          onClick={onClick}
          className={clsx(
            'inline-flex items-center justify-center rounded-xl font-semibold shadow transition-transform hover:-translate-y-0.5',
            sizeCls,
          )}
          style={{ backgroundColor: accent, color: '#fff' }}
        >
          {ctaText}
        </Link>
      )}
      {ctaText2 && ctaHref2 && (
        <Link
          href={ctaHref2}
          onClick={onClick}
          className={clsx(
            'inline-flex items-center justify-center rounded-xl border font-semibold transition-colors',
            sizeCls,
            isLight
              ? 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'
              : 'border-white/30 text-white hover:bg-white/10',
          )}
        >
          {ctaText2}
        </Link>
      )}
    </div>
  )
}

function CardGrid({
  cards,
  locale,
  accent,
  dark,
}: {
  cards: PopupItem['cards']
  locale: string
  accent: string
  dark?: boolean
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
      {cards.map((c) => {
        const cardTitle = pickLocalized(c.title, locale)
        const cardSub = pickLocalized(c.subtitle, locale)
        const cardPrice = pickLocalized(c.priceLabel, locale)
        const cardBadge = pickLocalized(c.badge, locale)
        const Card = (
          <div
            key={c.id}
            className={clsx(
              'group relative overflow-hidden rounded-xl shadow-sm ring-1 transition hover:shadow-lg',
              dark ? 'bg-neutral-800 ring-white/10' : 'bg-white ring-neutral-200',
            )}
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
              {c.imageUrl ? (
                <Image
                  src={c.imageUrl}
                  alt={cardTitle || ''}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  unoptimized={c.imageUrl.startsWith('/uploads/')}
                />
              ) : null}
              {cardBadge && (
                <span
                  className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow"
                  style={{ backgroundColor: accent }}
                >
                  {cardBadge}
                </span>
              )}
            </div>
            <div className="p-3 text-left">
              {cardTitle && (
                <h4
                  className={clsx(
                    'truncate text-sm font-semibold',
                    dark ? 'text-white' : 'text-neutral-900',
                  )}
                >
                  {cardTitle}
                </h4>
              )}
              {cardSub && (
                <p className={clsx('mt-0.5 truncate text-xs', dark ? 'text-neutral-300' : 'text-neutral-500')}>
                  {cardSub}
                </p>
              )}
              {cardPrice && (
                <p className="mt-1.5 text-sm font-bold" style={{ color: accent }}>
                  {cardPrice}
                </p>
              )}
            </div>
          </div>
        )
        return c.href ? (
          <Link key={c.id} href={c.href} className="block">
            {Card}
          </Link>
        ) : (
          <div key={c.id}>{Card}</div>
        )
      })}
    </div>
  )
}
