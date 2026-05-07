'use client'

import Heading from '@/shared/Heading'
import { PlayIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { FC, useEffect, useMemo, useState } from 'react'

/** Kapak yüklenemezse (CDN / referrer / ağ) görünür placeholder */
const FALLBACK_POSTER = '/uploads/general/hero/aktiviteler-2.avif'

function youtubeDefaultPoster(youtubeId: string) {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
}

const VideoPoster: FC<{
  src: string
  alt: string
  title?: string
  className: string
  fetchPriority?: 'high' | 'auto' | 'low'
}> = ({ src, alt, title, className, fetchPriority }) => {
  const [resolved, setResolved] = useState(src)
  useEffect(() => {
    setResolved(src)
  }, [src])
  return (
    <img
      src={resolved}
      alt={alt}
      title={title}
      loading="eager"
      decoding="async"
      {...(fetchPriority ? { fetchPriority } : {})}
      className={className}
      onError={() => {
        if (resolved !== FALLBACK_POSTER) setResolved(FALLBACK_POSTER)
      }}
    />
  )
}

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

/** Yan şeritte aynı anda gösterilecek küçük video sayısı — fazlası için oklar */
const THUMB_PAGE_SIZE = 5

const SectionVideosInner: FC<SectionVideosProps & { videos: VideoType[] }> = ({
  videos,
  className = '',
  heading = '🎬 The Videos',
  subheading =
    "Check out our hottest videos. View more and share more new perspectives on just about any topic. Everyone's welcome.",
}) => {
  const [isPlay, setIsPlay] = useState(false)
  const [currentVideo, setCurrentVideo] = useState(0)
  const [thumbStart, setThumbStart] = useState(0)

  const others = useMemo(
    () => videos.map((video, index) => ({ video, index })).filter(({ index }) => index !== currentVideo),
    [videos, currentVideo],
  )

  const maxThumbStart = Math.max(0, others.length - THUMB_PAGE_SIZE)
  const showThumbNav = others.length > THUMB_PAGE_SIZE

  useEffect(() => {
    setThumbStart((s) => Math.min(s, maxThumbStart))
  }, [maxThumbStart, currentVideo])

  const visibleOthers = others.slice(thumbStart, thumbStart + THUMB_PAGE_SIZE)
  const showSidebar = others.length > 0

  function thumbPrev() {
    setThumbStart((s) => Math.max(0, s - 1))
  }

  function thumbNext() {
    setThumbStart((s) => Math.min(maxThumbStart, s + 1))
  }

  function parseVideo(video: VideoType): { embedUrl: string; thumbnail: string } {
    const raw = video.videoUrl || video.id
    const ytMatch = raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
    const youtubeId = ytMatch?.[1] ?? (/^[A-Za-z0-9_-]{11}$/.test(raw) ? raw : '')
    if (youtubeId) {
      return {
        embedUrl: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`,
        thumbnail: video.thumbnail || youtubeDefaultPoster(youtubeId),
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
        className="group relative aspect-video w-full overflow-hidden rounded-3xl border-4 border-white bg-neutral-800 sm:rounded-[40px] sm:border-[8px] dark:border-neutral-900"
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
            <VideoPoster
              src={parsed.thumbnail}
              title={video.title}
              alt={video.title}
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover brightness-100 transition-[filter] group-hover:brightness-75"
            />

            <div onClick={() => setIsPlay(true)} className="absolute inset-0 flex items-center justify-center">
              <PlayIconBtn />
            </div>
          </>
        )}
      </div>
    )
  }

  const renderSubVideo = (video: VideoType, index: number) => {
    const parsed = parseVideo(video)
    return (
      <div
        className="group relative aspect-video w-full min-w-0 cursor-pointer overflow-hidden rounded-2xl sm:rounded-3xl"
        onClick={() => {
          setCurrentVideo(index)
          !isPlay && setIsPlay(true)
        }}
        title={video.title}
        key={String(index)}
      >
        <VideoPoster
          src={parsed.thumbnail}
          title={video.title}
          alt={video.title}
          className="absolute inset-0 h-full w-full object-cover brightness-100 transition-[filter] group-hover:brightness-75"
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <PlayIconBtn2 />
        </div>
      </div>
    )
  }

  const navBtnClass =
    'flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-35 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 lg:size-8'

  return (
    <div className={`nc-SectionVideos ${className}`}>
      <Heading subheading={subheading} className="mb-6 md:mb-8">
        {heading}
      </Heading>

      <div className="relative flex flex-col gap-4 py-2 pe-2 sm:gap-5 sm:py-3 sm:pe-3 md:py-4 md:pe-4 xl:py-6 xl:pe-6">
        {/* Ana oynatıcı: blok akışında tam genişlik — yan sütun flex/grid çökme riski yok */}
        <div className="relative w-full">
          <div className="pointer-events-none absolute -end-3 -top-3 bottom-3 z-0 w-[65%] rounded-3xl bg-primary-100/40 sm:rounded-[40px] md:end-0 md:top-0 md:bottom-0 xl:w-1/2 dark:bg-neutral-800/40" />
          <div className="relative z-[1] w-full">{renderMainVideo()}</div>
        </div>

        {showSidebar ? (
          <div className="relative z-[1] flex w-full min-w-0 flex-row items-center gap-2 sm:gap-3">
            {/* Önceki: flex varsayılan stretch grid'i ok düğmesi yüksekliğine sıkıştırıyordu */}
            {showThumbNav ? (
              <button
                type="button"
                aria-label="Önceki videolar"
                className={`${navBtnClass} shrink-0 self-center`}
                disabled={thumbStart <= 0}
                onClick={() => thumbPrev()}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
            ) : null}

            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 lg:items-start">
              {visibleOthers.map(({ video: v, index: i }) => renderSubVideo(v, i))}
            </div>

            {showThumbNav ? (
              <button
                type="button"
                aria-label="Sonraki videolar"
                className={`${navBtnClass} shrink-0 self-center`}
                disabled={thumbStart >= maxThumbStart}
                onClick={() => thumbNext()}
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
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
