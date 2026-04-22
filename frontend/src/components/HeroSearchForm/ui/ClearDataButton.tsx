import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC } from 'react'

interface ClearDataButtonProps {
  onClick?: () => void
  className?: string
}

export const ClearDataButton: FC<ClearDataButtonProps> = ({ onClick, className }) => {
  return (
    <span
      onClick={onClick}
      className={clsx(
        'invisible absolute end-2.5 top-1/2 z-10 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-transparent transition duration-100 group-data-open:visible hover:bg-neutral-100 dark:hover:bg-neutral-800',
        className
      )}
    >
      <HugeiconsIcon icon={Cancel01Icon} className="size-4.5" strokeWidth={1.75} />
    </span>
  )
}
