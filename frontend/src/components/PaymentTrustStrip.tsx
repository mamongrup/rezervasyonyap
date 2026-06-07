/**
 * Kredi kartı güven şeridi — hero başlık bloğunun altına eklenir.
 * Visa · Mastercard · Troy · Amex logo rozet sırası + kilit ikonu.
 */

function VisaBadge() {
  return (
    <span
      title="Visa"
      className="inline-flex h-5 items-center rounded border border-neutral-200 bg-[#1A1F71] px-1.5 shadow-xs dark:border-neutral-700"
    >
      <svg viewBox="0 0 48 16" width="28" height="10" aria-label="Visa">
        <text
          x="0" y="13"
          fontFamily="Arial, sans-serif"
          fontWeight="700"
          fontStyle="italic"
          fontSize="15"
          fill="white"
          letterSpacing="-0.5"
        >
          VISA
        </text>
      </svg>
    </span>
  )
}

function MastercardBadge() {
  return (
    <span
      title="Mastercard"
      className="inline-flex h-5 items-center rounded border border-neutral-200 bg-white px-1 shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
    >
      <svg width="26" height="16" viewBox="0 0 26 16" aria-label="Mastercard">
        <circle cx="9" cy="8" r="7" fill="#EB001B" />
        <circle cx="17" cy="8" r="7" fill="#F79E1B" />
        <path
          d="M13 3.2A6.97 6.97 0 0 1 15.4 8 6.97 6.97 0 0 1 13 12.8 6.97 6.97 0 0 1 10.6 8 6.97 6.97 0 0 1 13 3.2Z"
          fill="#FF5F00"
        />
      </svg>
    </span>
  )
}

function TroyBadge() {
  return (
    <span
      title="Troy"
      className="inline-flex h-5 items-center rounded border border-neutral-200 bg-white px-1 shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
    >
      <svg viewBox="0 0 38 14" width="34" height="12" aria-label="Troy">
        <rect x="0" y="0" width="38" height="14" rx="1" fill="white" />
        <text x="1" y="11" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="11" fill="#C41230">
          TR
        </text>
        <text x="17" y="11" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="11" fill="#0D2857">
          OY
        </text>
      </svg>
    </span>
  )
}

function AmexBadge() {
  return (
    <span
      title="American Express"
      className="inline-flex h-5 items-center rounded border border-neutral-200 bg-[#007BC1] px-1.5 shadow-xs dark:border-neutral-700"
    >
      <svg viewBox="0 0 38 12" width="32" height="10" aria-label="Amex">
        <text
          x="0" y="10"
          fontFamily="Arial, sans-serif"
          fontWeight="800"
          fontSize="10"
          fill="white"
          letterSpacing="0.5"
        >
          AMEX
        </text>
      </svg>
    </span>
  )
}

export function PaymentTrustStrip({
  secureLabel = 'Güvenli ödeme',
  className = '',
}: {
  secureLabel?: string
  className?: string
}) {
  return (
    <div className={`mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 ${className}`}>
      {/* Kilit + etiket */}
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        <svg
          className="size-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        {secureLabel}
      </span>

      <span className="text-neutral-300 dark:text-neutral-600" aria-hidden>
        ·
      </span>

      {/* Kart logoları */}
      <div className="flex items-center gap-1.5">
        <VisaBadge />
        <MastercardBadge />
        <TroyBadge />
        <AmexBadge />
      </div>
    </div>
  )
}
