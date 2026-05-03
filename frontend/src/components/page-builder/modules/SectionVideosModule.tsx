import SectionVideos from '@/components/SectionVideos'

interface Config {
  heading?: string
  subheading?: string
  videos?: {
    id: string
    title: string
    videoUrl: string
    thumbnail?: string
  }[]
}

export default function SectionVideosModule({ config }: { config: Config }) {
  const videos = Array.isArray(config.videos)
    ? config.videos.filter((video) => video.videoUrl?.trim())
    : []

  return (
    <SectionVideos
      videos={videos}
      heading={config.heading ?? 'Seyahat Videolarımız'}
      subheading={config.subheading ?? 'Heyecan verici destinasyonları videolarla keşfedin'}
    />
  )
}
