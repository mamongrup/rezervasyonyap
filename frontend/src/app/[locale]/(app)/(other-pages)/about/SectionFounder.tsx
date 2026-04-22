import Heading from '@/shared/Heading'
import Image from 'next/image'

const team = [
  {
    id: '1',
    name: 'Ahmet Yıldız',
    job: 'Kurucu & CEO',
    avatar: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg',
  },
  {
    id: '2',
    name: 'Elif Kaya',
    job: 'Kurucu Ortak & COO',
    avatar: 'https://images.pexels.com/photos/2804282/pexels-photo-2804282.jpeg',
  },
  {
    id: '3',
    name: 'Murat Demir',
    job: 'Kurucu & CTO',
    avatar: 'https://images.pexels.com/photos/769772/pexels-photo-769772.jpeg',
  },
  {
    id: '4',
    name: 'Zeynep Arslan',
    job: 'Kurucu & Strateji Direktörü',
    avatar: 'https://images.pexels.com/photos/732425/pexels-photo-732425.jpeg',
  },
]

const SectionFounder = () => {
  return (
    <div className="relative">
      <Heading
        subheading="Seyahat sektörünü daha erişilebilir, şeffaf ve verimli hale getirmek için bir araya geldik"
      >
        ⛱ Kurucularımız
      </Heading>
      <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
        {team.map((item) => (
          <div key={item.id} className="max-w-sm">
            <div className="aspect-w-1 relative h-0 overflow-hidden rounded-xl aspect-h-1">
              <Image
                fill
                className="object-cover"
                src={item.avatar}
                alt={item.name}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 30vw, 30vw"
              />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-neutral-900 md:text-xl dark:text-neutral-200">
              {item.name}
            </h3>
            <span className="block text-sm text-neutral-500 sm:text-base dark:text-neutral-400">{item.job}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SectionFounder
