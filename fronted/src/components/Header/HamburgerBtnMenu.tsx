'use client'

import { Menu01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useParams } from 'next/navigation'
import { getMessages } from '@/utils/getT'
import { useAside } from '../aside'

const HamburgerBtnMenu = () => {
  const { open: openAside } = useAside()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const openLabel = getMessages(locale).sidebar.openMenu

  return (
    <button
      type="button"
      onClick={() => openAside('sidebar-navigation')}
      className="-m-2.5 flex cursor-pointer items-center justify-center rounded-full p-2.5 hover:bg-neutral-100 focus-visible:outline-0 dark:hover:bg-neutral-700"
    >
      <span className="sr-only">{openLabel}</span>
      <HugeiconsIcon icon={Menu01Icon} size={24} color="currentColor" strokeWidth={1.5} />
    </button>
  )
}

export default HamburgerBtnMenu
