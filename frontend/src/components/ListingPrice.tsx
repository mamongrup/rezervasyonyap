'use client'

import { useConvertedListingPrice } from '@/contexts/preferred-currency-context'
import { FC } from 'react'

interface ListingPriceProps {
  price?: string
  priceAmount?: number
  priceCurrency?: string
  className?: string
}

/** Header’daki seçilen para birimi + TCMB kurları ile tutar gösterimi */
const ListingPrice: FC<ListingPriceProps> = ({ price, priceAmount, priceCurrency, className }) => {
  const text = useConvertedListingPrice(price, priceAmount, priceCurrency)
  return <span className={className}>{text}</span>
}

export default ListingPrice
