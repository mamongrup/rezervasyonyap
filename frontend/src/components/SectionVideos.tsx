'use client'

import { useLocaleSegment } from '@/contexts/locale-context'
import useSnapSlider from '@/hooks/useSnapSlider'
import Heading from '@/shared/Heading'
import { ButtonCircle } from '@/shared/Button'
import { getMessages } from '@/utils/getT'
import { ArrowLeft02Icon, ArrowRight02Icon, PlayIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import clsx from 'clsx'
import { FC, useEffect, useMemo, useRef, useState } from 'react'

interface VideoType {
  id: string
  title: string
  thumbnail?: string
  videoUrl?: string
}

interface SectionVideosProps {
  videos?: VideoType[]
  className?: string
  heading?: string
  subheading?: string
}

type ParsedVideo = {
  embedUrl: string
  thumbnail: string
  youtubeId?: string
}

function parseVideo(video: VideoType): ParsedVideo {
  const raw = video.videoUrl || video.id
  const ytMatch = raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  const youtubeId = ytMatch?.[1] ?? (/^[A-Za-z0-9_-]{11}$/.test(raw) ? raw : '')
  if (youtubeId) {
    return {
      embedUrl: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`,
      thumbnail: video.thumbnail || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      youtubeId,
    }
  }

  const vimeoMatch = raw.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
      thumbnail: video.thumbnail || '/uploads/general/hero/aktiviteler-2.avif',
    }
  }

  return {
    embedUrl: raw,
    thumbnail: video.thumbnail || '/uploads/general/hero/aktiviteler-2.avif',
  }
}

/** YouTube için kapak URL sırası — `onError` ile düşer; sddefault tek başına bazen boş/gri */
function youtubePosterCandidates(video: VideoType, parsed: ParsedVideo): string[] {
  const custom = video.thumbnail?.trim()
  if (custom) return [custom]
  if (parsed.youtubeId) {
    const id = parsed.youtubeId
    return [
      `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${id}/sddefault.jpg`,
      `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
      `https://img.youtube.com/vi/${id}/default.jpg`,
    ]
  }
  const t = parsed.thumbnail?.trim()
  return t ? [t] : []
}

function PosterImg({
  candidates,
  alt,
  className,
}: {
  candidates: string[]
  alt: string
  className?: string
}) {
  const [idx, setIdx] = useState(0)
  const candidateSig = candidates.join('|')
  useEffect(() => {
    setIdx(0)
  }, [candidateSig])

  const src = candidates[idx] ?? ''

  if (!src) {
    return <div className={clsx(className, 'bg-neutral-800')} aria-hidden />
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        if (idx < candidates.length - 1) setIdx((i) => i + 1)
      }}
      loading="lazy"
      decoding="async"
    />
  )
}

const PlayIconBtn = () => (
  <div className="size-16 cursor-pointer rounded-full bg-white/35 p-2 backdrop-blur-xs backdrop-filter sm:size-20 sm:p-2.5 md:size-[5.25rem] md:p-3">
    <div className="relative h-full w-full rounded-full bg-white text-primary-600 shadow-lg dark:text-primary-500">
      <span className="absolute inset-0 flex items-center justify-center">
        <HugeiconsIcon icon={PlayIcon} className="size-7 sm:size-9 md:size-11 rtl:rotate-180" strokeWidth={1.75} />
      </span>
    </div>
  </div>
)

const PlayIconBtn2 = () => (
  <div className="relative size-8 cursor-pointer rounded-full bg-white shadow-inner md:size-10">
    <span className="absolute inset-0 flex items-center justify-center text-primary-500">
      <HugeiconsIcon icon={PlayIcon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
    </span>
  </div>
)

function MainPlayOverlay({ title, onPlay }: { title: string; onPlay: () => void }) {
  return (
    <div
      onClick={onPlay}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onPlay()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={title}
      className="absolute inset-0 flex cursor-pointer items-center justify-center"
    >
      <PlayIconBtn />
    </div>
  )
}

function VideoThumbCard({
  video,
  index,
  isPlay,
  onSelectThumb,
}: {
  video: VideoType
  index: number
  isPlay: boolean
  onSelectThumb: (index: number, isPlay: boolean) => void
}) {
  const parsed = parseVideo(video)
  const thumbCandidates = youtubePosterCandidates(video, parsed)
  const uploadsOne = thumbCandidates.length === 1 && thumbCandidates[0].startsWith('/uploads/')

  return (
    <div
      className="group relative aspect-video w-full min-h-[4.5rem] cursor-pointer overflow-hidden rounded-xl ring-1 ring-black/5 transition-shadow hover:shadow-lg sm:rounded-2xl dark:ring-white/10"
      style={{ aspectRatio: '16 / 9' }}
      onClick={() => onSelectThumb(index, isPlay)}
      aria-label={video.title}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelectThumb(index, isPlay)
        }
      }}
    >
      {uploadsOne ? (
        <Image
          fill
          className="object-cover brightness-100 transition-[filter] group-hover:brightness-75"
          src={thumbCandidates[0]}
          alt={video.title}
          sizes="(max-width: 640px) 45vw, 200px"
          unoptimized
        />
      ) : (
        <PosterImg
          candidates={thumbCandidates}
          alt={video.title}
          className="absolute inset-0 h-full w-full object-cover brightness-100 transition-[filter] group-hover:brightness-75"
        />
      )}

      <div className="absolute inset-0 flex items-center justify-center">
        <PlayIconBtn2 />
      </div>
    </div>
  )
}

const SectionVideos: FC<SectionVideosProps> = (props) => {
  const list = props.videos ?? []
  if (list.length === 0) return null
  return <SectionVideosInner {...props} videos={list} />
}

const SectionVideosInner: FC<SectionVideosProps & { videos: VideoType[] }> = ({
  videos,
  className = '',
  heading = '🎬 The Videos',
  subheading =
    "Check out our hottest videos. View more and share more new perspectives on just about any topic. Everyone's welcome.",
}) => {
  const [isPlay, setIsPlay] = useState(false)
  const [currentVideo, setCurrentVideo] = useState(0)
  const sliderRef = useRef<HTMLDivElement>(null)
  const { scrollToNextSlide, scrollToPrevSlide, isAtEnd, isAtStart } = useSnapSlider({ sliderRef })
  const locale = useLocaleSegment()
  const pag = getMessages(locale).common.pagination

  const otherVideos = useMemo(
    () => videos.map((video, index) => ({ video, index })).filter(({ index }) => index !== currentVideo),
    [videos, currentVideo],
  )

  const selectThumb = (index: number, playing: boolean) => {
    setCurrentVideo(index)
    if (!playing) setIsPlay(true)
  }

  const renderMainVideo = () => {
    const video: VideoType = videos[currentVideo]
    const parsed = parseVideo(video)
    const candidates = youtubePosterCandidates(video, parsed)
    const isUploadsOnly = candidates.length === 1 && candidates[0].startsWith('/uploads/')

    return (
      <figure className="relative z-[1] mx-auto w-full max-w-5xl">
        <div
          className="group relative aspect-video w-full min-h-[11.25rem] overflow-hidden rounded-2xl bg-neutral-900 shadow-2xl ring-1 ring-black/5 md:rounded-3xl dark:ring-white/10"
          style={{ aspectRatio: '16 / 9' }}
        >
          {isPlay ? (
            <iframe
              src={parsed.embedUrl}
              title={video.title}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : isUploadsOnly ? (
            <>
              <Image
                fill
                className="object-cover brightness-100 transition-[filter] group-hover:brightness-90"
                src={candidates[0]}
                alt={video.title}
                sizes="(max-width: 1024px) 100vw, 896px"
                unoptimized={candidates[0].startsWith('/uploads/')}
              />
              <MainPlayOverlay title={video.title} onPlay={() => setIsPlay(true)} />
            </>
          ) : (
            <>
              <PosterImg
                candidates={candidates}
                alt={video.title}
                className="absolute inset-0 h-full w-full object-cover brightness-100 transition-[filter] group-hover:brightness-90"
              />
              <MainPlayOverlay title={video.title} onPlay={() => setIsPlay(true)} />
            </>
          )}
        </div>
        <figcaption className="mt-4 px-1 text-center text-base font-medium text-neutral-800 md:text-lg dark:text-neutral-100">
          {video.title}
        </figcaption>
      </figure>
    )
  }

  return (
    <div className={clsx('nc-SectionVideos', className)}>
      <Heading subheading={subheading}>{heading}</Heading>

      <div className="relative flex flex-col md:py-2 md:pe-2 lg:py-4 lg:pe-6 xl:py-6 xl:pe-8">
        <div className="relative w-full min-w-0">{renderMainVideo()}</div>

        {otherVideos.length > 0 && (
          <div className="relative z-[1] mt-6 min-w-0 sm:mt-8">
            <div className="pointer-events-none absolute -end-1 -top-3 bottom-2 z-0 hidden w-[min(100%,36rem)] rounded-2xl bg-primary-100/40 md:block md:end-0 lg:bottom-0 xl:w-[45%] dark:bg-neutral-800/30" />

            <div className="relative z-[1] min-w-0 max-w-full overflow-x-clip">
              <div
                ref={sliderRef}
                className="hidden-scrollbar relative -mx-2 flex max-w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain sm:-mx-2.5 lg:mx-0"
              >
                {otherVideos.map(({ video, index }) => (
                  <div
                    key={video.id ? `${video.id}-${index}` : String(index)}
                    className="mySnapItem w-[42%] shrink-0 snap-start px-2 sm:w-[32%] sm:px-2.5 md:w-[26%] lg:w-36 lg:px-2 xl:w-40"
                  >
                    <VideoThumbCard video={video} index={index} isPlay={isPlay} onSelectThumb={selectThumb} />
                  </div>
                ))}
              </div>
            </div>

            {otherVideos.length > 1 && (
              <>
                <div className="absolute start-2 top-1/2 z-[2] -translate-y-1/2 sm:start-3">
                  <ButtonCircle
                    color="white"
                    onClick={scrollToPrevSlide}
                    className="size-9 xl:size-11"
                    disabled={isAtStart}
                    aria-label={pag.previous}
                  >
                    <HugeiconsIcon icon={ArrowLeft02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
                  </ButtonCircle>
                </div>
                <div className="absolute end-2 top-1/2 z-[2] -translate-y-1/2 sm:end-3">
                  <ButtonCircle
                    color="white"
                    onClick={scrollToNextSlide}
                    className="size-9 xl:size-11"
                    disabled={isAtEnd}
                    aria-label={pag.next}
                  >
                    <HugeiconsIcon icon={ArrowRight02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
                  </ButtonCircle>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SectionVideos
