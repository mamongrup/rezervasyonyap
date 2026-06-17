'use client'

import { useConvertedListingPrice } from '@/contexts/preferred-currency-context'
import { FC } from 'react'

interface ListingPriceProps {
  price?: string
  priceAmount?: number
  priceAmountMax?: number
  priceCurrency?: string
  className?: string
  /** Aktivite kartları — "From " / "'den" gibi min seans fiyatı vurgusu */
  priceFromPrefix?: string
  priceFromSuffix?: string
}

/** Header’daki seçilen para birimi + TCMB kurları ile tutar gösterimi */
const ListingPrice: FC<ListingPriceProps> = ({
  price,
  priceAmount,
  priceAmountMax,
  priceCurrency,
  className,
  priceFromPrefix = '',
  priceFromSuffix = '',
}) => {
  const text = useConvertedListingPrice(price, priceAmount, priceCurrency, priceAmountMax)
  if (!text?.trim() || text === '—') {
    return <span className={className}>{text}</span>
  }
  return (
    <span className={className}>
      {priceFromPrefix}
      {text}
      {priceFromSuffix}
    </span>
  )
}

export default ListingPrice
