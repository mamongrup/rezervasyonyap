'use client'

import { useLocaleSegment } from '@/contexts/locale-context'
import useSnapSlider from '@/hooks/useSnapSlider'
import Heading from '@/shared/Heading'
import { ButtonCircle } from '@/shared/Button'
import { getMessages } from '@/utils/getT'
import { ArrowLeft02Icon, ArrowRight02Icon, PlayIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import { FC, useMemo, useRef, useState } from 'react'

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

  function parseVideo(video: VideoType): { embedUrl: string; thumbnail: string } {
    const raw = video.videoUrl || video.id
    const ytMatch = raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
    const youtubeId = ytMatch?.[1] ?? (/^[A-Za-z0-9_-]{11}$/.test(raw) ? raw : '')
    if (youtubeId) {
      return {
        embedUrl: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`,
        thumbnail: video.thumbnail || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
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

  const renderMainVideo = () => {
    const video: VideoType = videos[currentVideo]
    const parsed = parseVideo(video)
    return (
      <div
        className="group relative aspect-w-16 aspect-h-9 w-full overflow-hidden rounded-3xl border-4 border-white bg-neutral-800 sm:rounded-[50px] sm:border-[10px] dark:border-neutral-900"
        title={video.title}
      >
        {isPlay ? (
          <iframe
            src={parsed.embedUrl}
            title={video.title}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        ) : (
          <>
            <Image
              fill
              className="object-cover brightness-100 transition-[filter] group-hover:brightness-75"
              src={parsed.thumbnail}
              title={video.title}
              alt={video.title}
              sizes="(max-width: 1000px) 100vw, (max-width: 1200px) 75vw, 50vw"
              unoptimized={parsed.thumbnail.startsWith('/uploads/')}
            />

            <div onClick={() => setIsPlay(true)} className="absolute inset-0 flex items-center justify-center">
              <PlayIconBtn />
            </div>
          </>
        )}
      </div>
    )
  }

  const renderThumbCard = (video: VideoType, index: number) => {
    const parsed = parseVideo(video)
    return (
      <div
        className="group relative aspect-w-16 aspect-h-9 w-full cursor-pointer overflow-hidden rounded-2xl sm:rounded-3xl"
        onClick={() => {
          setCurrentVideo(index)
          if (!isPlay) setIsPlay(true)
        }}
        title={video.title}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setCurrentVideo(index)
            if (!isPlay) setIsPlay(true)
          }
        }}
      >
        <Image
          fill
          className="object-cover brightness-100 transition-[filter] group-hover:brightness-75"
          src={parsed.thumbnail}
          title={video.title}
          alt={video.title}
          sizes="(max-width: 640px) 45vw, 200px"
          unoptimized={parsed.thumbnail.startsWith('/uploads/')}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <PlayIconBtn2 />
        </div>
      </div>
    )
  }

  return (
    <div className={`nc-SectionVideos ${className}`}>
      <Heading subheading={subheading}>{heading}</Heading>

      <div className="relative flex flex-col sm:py-3 sm:pe-3 md:py-4 md:pe-4 xl:py-8 xl:pe-10">
        <div className="absolute -end-4 -top-4 -bottom-4 z-0 w-2/3 rounded-3xl bg-primary-100/40 sm:rounded-[50px] md:end-0 md:top-0 md:bottom-0 xl:w-1/2 dark:bg-neutral-800/40" />
        <div className="relative z-[1] w-full min-w-0">{renderMainVideo()}</div>

        {otherVideos.length > 0 && (
          <div className="relative z-[1] mt-3 min-w-0 sm:mt-4">
            <div className="min-w-0 max-w-full overflow-x-clip">
              <div
                ref={sliderRef}
                className="hidden-scrollbar relative -mx-2 flex max-w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain sm:-mx-2.5 lg:-mx-3"
              >
                {otherVideos.map(({ video, index }) => (
                  <div
                    key={video.id ? `${video.id}-${index}` : String(index)}
                    className="mySnapItem w-[46%] shrink-0 snap-start px-2 sm:w-[38%] sm:px-2.5 md:w-[32%] lg:w-44 lg:px-3 xl:w-48"
                  >
                    {renderThumbCard(video, index)}
                  </div>
                ))}
              </div>
            </div>

            {otherVideos.length > 1 && (
              <>
                <div className="absolute start-0 top-1/2 z-[2] -translate-y-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2">
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
                <div className="absolute end-0 top-1/2 z-[2] -translate-y-1/2 ltr:translate-x-1/2 rtl:-translate-x-1/2">
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

const PlayIconBtn = () => {
  return (
    <div
      className={`size-20 cursor-pointer rounded-full bg-white/30 p-3 backdrop-blur-xs backdrop-filter lg:h-52 lg:w-52 lg:p-12`}
    >
      <div className="relative h-full w-full rounded-full bg-white text-primary-500">
        <span className="absolute inset-0 flex items-center justify-center">
          <HugeiconsIcon icon={PlayIcon} className="size-8 md:size-12 rtl:rotate-180" strokeWidth={1.75} />
        </span>
      </div>
    </div>
  )
}

const PlayIconBtn2 = () => {
  return (
    <div className={`relative size-8 cursor-pointer rounded-full bg-white shadow-inner md:size-10`}>
      <span className="absolute inset-0 flex items-center justify-center text-primary-500">
        <HugeiconsIcon icon={PlayIcon} className={'size-5 rtl:rotate-180'} strokeWidth={1.75} />
      </span>
    </div>
  )
}

export default SectionVideos
