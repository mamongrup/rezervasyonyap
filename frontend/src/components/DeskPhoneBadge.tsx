import clsx from 'clsx'

/** Kırmızı daire içinde klasik masaüstü / sabit hat telefon ikonu */
export function DeskPhoneBadge({
  className,
  iconClassName = 'size-5',
}: {
  className?: string
  iconClassName?: string
}) {
  return (
    <span
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-sm ring-1 ring-black/5',
        className,
      )}
      aria-hidden
    >
      <DeskPhoneIcon className={iconClassName} />
    </span>
  )
}

export function DeskPhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Gövde */}
      <rect x="5" y="10" width="14" height="10" rx="1.5" />
      {/* Ahize */}
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
      {/* Tuş takımı */}
      <circle cx="9" cy="14" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="9" cy="17" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="15" cy="17" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  )
}
