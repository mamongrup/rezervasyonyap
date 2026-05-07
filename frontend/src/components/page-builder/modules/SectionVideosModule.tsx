import SectionVideos from '@/components/SectionVideos'
import { coerceSectionVideosConfig } from './section-videos-coerce'

interface Config {
  heading?: string
  subheading?: string
  videos?: unknown
}

export default function SectionVideosModule({ config }: { config: Config }) {
  const videos = coerceSectionVideosConfig(config.videos)

  return (
    <SectionVideos
      videos={videos}
      heading={config.heading ?? 'Seyahat Videolarımız'}
      subheading={config.subheading ?? 'Heyecan verici destinasyonları videolarla keşfedin'}
    />
  )
}
