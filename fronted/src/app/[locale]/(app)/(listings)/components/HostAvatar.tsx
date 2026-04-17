import Avatar from '@/shared/Avatar'
import { Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'

interface Props {
  className?: string
  avatarUrl: string
  isVerified?: boolean
  avatarSize?: string
  verifiedSize?: string
}

const HostAvatar = ({
  className,
  avatarSize = 'size-14',
  avatarUrl,
  isVerified = true,
  verifiedSize = 'size-6',
}: Props) => {
  return (
    <div className={clsx('relative', className)}>
      <Avatar src={avatarUrl} className={avatarSize} />
      {isVerified && (
        <div
          className={clsx(
            'absolute -end-px -bottom-px flex items-center justify-center rounded-full bg-green-600 text-white shadow-lg',
            verifiedSize
          )}
        >
          <HugeiconsIcon icon={Tick02Icon} className="h-4 w-4" strokeWidth={1.75} />
        </div>
      )}
    </div>
  )
}

export default HostAvatar
