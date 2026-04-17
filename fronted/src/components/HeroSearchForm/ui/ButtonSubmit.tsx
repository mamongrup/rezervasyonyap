import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC } from 'react'

const styles = {
  base: 'absolute z-10 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-[#6b5cff] text-white shadow-sm hover:bg-[#5a4de6] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#6b5cff]/40 cursor-pointer',
  default: 'size-12 end-2.5 sm:size-[3.75rem] sm:end-3',
  small: 'size-11 end-2',
}

interface Props {
  className?: string
  fieldStyle: 'default' | 'small'
}

export const ButtonSubmit: FC<Props> = ({ className, fieldStyle = 'default' }) => {
  return (
    <button type="submit" className={clsx(styles.base, styles[fieldStyle], className)}>
      <HugeiconsIcon icon={Search01Icon} size={24} />
    </button>
  )
}
