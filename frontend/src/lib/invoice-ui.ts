/** Komisyon faturası `status` alanı için rozet stilleri (API: genelde `issued` | `cancelled`). */
export function invoiceStatusBadgeClass(status: string): string {
  if (status === 'cancelled') {
    return 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
  }
  if (status === 'issued') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
  }
  return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
}

export function invoiceStatusLabelTr(status: string): string {
  if (status === 'cancelled') return 'İptal'
  if (status === 'issued') return 'Kesildi'
  return status
}
