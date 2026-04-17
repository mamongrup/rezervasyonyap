'use client'

import { localeFromPathname } from '@/lib/i18n-config'
import { formatSaleOffBadgeLabel } from '@/utils/formatSaleOffLabel'
import { usePathname } from 'next/navigation'
import { FC } from 'react'

/** Sunucu kartlarında (Visa/Hajj vb.) rozet metnini URL diline göre üretir */
export const DiscountBadgeLabel: FC<{ text: string }> = ({ text }) => {
  const pathname = usePathname() ?? ''
  const locale = localeFromPathname(pathname)
  return <>{formatSaleOffBadgeLabel(text, locale)}</>
}
