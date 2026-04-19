import Heading from '@/shared/Heading'
import Image from 'next/image'

export type CmsFounderMember = {
  name: string
  job: string
  avatarUrl: string
}

export type CmsFoundersConfig = {
  heading?: string
  subheading?: string
  members?: CmsFounderMember[]
}

export default function CmsFoundersBlock({ config }: { config: CmsFoundersConfig }) {
  const members = config.members?.filter((m) => m.name?.trim()) ?? []

  return (
    <div className="relative">
      <Heading subheading={config.subheading}>{config.heading ?? 'Kurucularımız'}</Heading>
      {members.length === 0 ? (
        <p className="text-sm text-neutral-500">Kurucu listesi boş — panelden üye ekleyin.</p>
      ) : (
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
          {members.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="max-w-sm">
              <div className="relative aspect-square overflow-hidden rounded-xl">
                <Image
                  fill
                  className="object-cover"
                  src={item.avatarUrl || 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg'}
                  alt={item.name}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 30vw, 30vw"
                  unoptimized={
                    Boolean(
                      item.avatarUrl?.startsWith('http') || item.avatarUrl?.startsWith('/uploads/'),
                    )
                  }
                />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-neutral-900 md:text-xl dark:text-neutral-200">
                {item.name}
              </h3>
              <span className="block text-sm text-neutral-500 sm:text-base dark:text-neutral-400">{item.job}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
