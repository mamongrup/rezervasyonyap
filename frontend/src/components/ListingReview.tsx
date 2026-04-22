import { TListingReivew } from '@/data/data'
import { sanitizeRichCmsHtml } from '@/lib/sanitize-cms-html'
import Avatar from '@/shared/Avatar'
import { StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC } from 'react'

interface Props {
  className?: string
  reivew: TListingReivew
}

const ListingReview: FC<Props> = ({ className = '', reivew }) => {
  const { author, authorAvatar, content, date, rating, title } = reivew

  return (
    <div className={`flex gap-x-4 ${className}`}>
      <div className="pt-0.5">
        <Avatar className="size-10" src={authorAvatar.src} />
      </div>
      <div className="grow">
        <div className="flex justify-between gap-x-3">
          <div className="flex flex-col">
            <div className="font-medium">{author}</div>
            <span className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{date}</span>
          </div>
          <div className="flex items-center">
            {[0, 1, 2, 3, 4].map((number) => (
              <HugeiconsIcon
                icon={StarIcon}
                key={number}
                aria-hidden="true"
                className={clsx(rating > number ? 'text-yellow-400' : 'text-gray-200', 'size-5 shrink-0')}
                strokeWidth={1.75}
              />
            ))}
          </div>
        </div>
        <div
          className="mt-3 block max-w-xl text-sm/relaxed text-neutral-700 sm:text-base/relaxed dark:text-neutral-300"
          dangerouslySetInnerHTML={{ __html: sanitizeRichCmsHtml(content) }}
        ></div>
      </div>
    </div>
  )
}

export default ListingReview
