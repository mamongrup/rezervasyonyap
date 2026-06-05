export type CheckoutBankTransferConfig = {
  iban_try: string
  iban_eur: string
  iban_usd: string
  iban_gbp: string
  note: string
}

export type CheckoutPaymentMethodsConfig = {
  bank_transfer: CheckoutBankTransferConfig
  western_union: string
  ria: string
}

export const EMPTY_CHECKOUT_PAYMENT_METHODS: CheckoutPaymentMethodsConfig = {
  bank_transfer: {
    iban_try: '',
    iban_eur: '',
    iban_usd: '',
    iban_gbp: '',
    note: '',
  },
  western_union: '',
  ria: '',
}

export function parseCheckoutPaymentMethodsConfig(
  raw: unknown,
): CheckoutPaymentMethodsConfig {
  if (!raw || typeof raw !== 'object') return EMPTY_CHECKOUT_PAYMENT_METHODS
  const o = raw as Record<string, unknown>
  const bank =
    o.bank_transfer && typeof o.bank_transfer === 'object'
      ? (o.bank_transfer as Record<string, unknown>)
      : {}
  return {
    bank_transfer: {
      iban_try: typeof bank.iban_try === 'string' ? bank.iban_try : '',
      iban_eur: typeof bank.iban_eur === 'string' ? bank.iban_eur : '',
      iban_usd: typeof bank.iban_usd === 'string' ? bank.iban_usd : '',
      iban_gbp: typeof bank.iban_gbp === 'string' ? bank.iban_gbp : '',
      note: typeof bank.note === 'string' ? bank.note : '',
    },
    western_union: typeof o.western_union === 'string' ? o.western_union : '',
    ria: typeof o.ria === 'string' ? o.ria : '',
  }
}

export const CHECKOUT_IBAN_ROWS = [
  { key: 'iban_try' as const, label: '₺ TRY' },
  { key: 'iban_eur' as const, label: '€ EUR' },
  { key: 'iban_usd' as const, label: '$ USD' },
  { key: 'iban_gbp' as const, label: '£ GBP' },
]
