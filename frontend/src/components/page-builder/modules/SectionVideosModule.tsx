import SectionVideos from '@/components/SectionVideos'

interface Config {
  heading?: string
  subheading?: string
}

export default function SectionVideosModule({ config }: { config: Config }) {
  return (
    <SectionVideos
      heading={config.heading ?? 'Seyahat Videolarımız'}
      subheading={config.subheading ?? 'Heyecan verici destinasyonları videolarla keşfedin'}
    />
  )
}
