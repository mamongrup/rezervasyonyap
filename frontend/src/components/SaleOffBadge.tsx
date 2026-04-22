'use client'

import { localeFromPathname } from '@/lib/i18n-config'
import { formatSaleOffBadgeLabel } from '@/utils/formatSaleOffLabel'
import { usePathname } from 'next/navigation'
import React, { FC } from 'react'

export interface SaleOffBadgeProps {
	className?: string
	desc?: string
	/** SSR veya test için; verilmezse URL’den çıkarılır */
	locale?: string
}

const SaleOffBadge: FC<SaleOffBadgeProps> = ({
	className = '',
	desc = '%10',
	locale: localeProp,
}) => {
	const pathname = usePathname() ?? ''
	const locale = localeProp ?? localeFromPathname(pathname)
	const label = formatSaleOffBadgeLabel(desc, locale)
	return (
		<div
			className={`nc-SaleOffBadge flex items-center justify-center rounded-full bg-red-700 px-3 py-0.5 text-xs text-red-50 ${className}`}
		>
			{label}
		</div>
	)
}

export default SaleOffBadge
