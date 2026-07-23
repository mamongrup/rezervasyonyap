'use client'

import Heading from '@/shared/Heading'
import { PlayIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import clsx from 'clsx'
import { FC, useEffect, useMemo, useState } from 'react'

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

/** Chisfis demo: büyük oynatıcı + sağda dikey en fazla 4 küçük video */
const SIDEBAR_MAX = 4

function isIframeReadyEmbed(url: string): boolean {
  return /^https:\/\/(www\.)?(youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/|player\.vimeo\.com\/video\/)/i.test(
    url.trim(),
  )
}

function parseVideo(video: VideoType): ParsedVideo {
  const raw = (video.videoUrl || video.id || '').trim()
  const ytMatch = raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  const youtubeId = ytMatch?.[1] ?? (/^[A-Za-z0-9_-]{11}$/.test(raw) ? raw : '')
  if (youtubeId) {
    return {
      embedUrl: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`,
      thumbnail: video.thumbnail || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      youtubeId,
    }
  }

  const vimeoMatch = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeoMatch) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
      thumbnail: video.thumbnail || '/uploads/general/hero/aktiviteler-2.avif',
    }
  }

  const trimmed = raw
  if (trimmed && isIframeReadyEmbed(trimmed)) {
    const sep = trimmed.includes('?') ? '&' : '?'
    const withAutoplay = trimmed.includes('autoplay=') ? trimmed : `${trimmed}${sep}autoplay=1`
    return {
      embedUrl: withAutoplay,
      thumbnail: video.thumbnail || '/uploads/general/hero/aktiviteler-2.avif',
    }
  }

  return {
    embedUrl: '',
    thumbnail: video.thumbnail || '/uploads/general/hero/aktiviteler-2.avif',
  }
}

function youtubePosterCandidates(video: VideoType, parsed: ParsedVideo): string[] {
  const custom = video.thumbnail?.trim()
  if (custom) return [custom]
  if (parsed.youtubeId) {
    const id = parsed.youtubeId
    return [
      `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
      `https://img.youtube.com/vi/${id}/sddefault.jpg`,
      `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
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
  priority = false,
}: {
  candidates: string[]
  alt: string
  className?: string
  /** Ana video — lazy yükleme gri kutu bırakmasın */
  priority?: boolean
}) {
  const [idx, setIdx] = useState(0)
  const candidateSig = candidates.join('|')
  useEffect(() => {
    setIdx(0)
  }, [candidateSig])

  const src = candidates[idx] ?? ''

  if (!src) {
    return <div className={clsx(className, 'bg-neutral-200 dark:bg-neutral-800')} aria-hidden />
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        if (idx < candidates.length - 1) setIdx((i) => i + 1)
      }}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
    />
  )
}

/** Chisfis SectionVideos — PlayIconBtn (orijinal sınıflar) */
const PlayIconBtn = () => (
  <div className="size-20 cursor-pointer rounded-full bg-white/30 p-3 backdrop-blur-xs backdrop-filter lg:h-52 lg:w-52 lg:p-12">
    <div className="relative h-full w-full rounded-full bg-white text-primary-500 dark:text-primary-500">
      <span className="absolute inset-0 flex items-center justify-center">
        <HugeiconsIcon icon={PlayIcon} className="size-8 md:size-12 rtl:rotate-180" strokeWidth={1.75} />
      </span>
    </div>
  </div>
)

/** Chisfis SectionVideos — PlayIconBtn2 */
const PlayIconBtn2 = () => (
  <div className="relative size-8 cursor-pointer rounded-full bg-white shadow-inner md:size-10">
    <span className="absolute inset-0 flex items-center justify-center text-primary-500">
      <HugeiconsIcon icon={PlayIcon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
    </span>
  </div>
)

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

  const renderMainVideo = () => {
    const video = videos[currentVideo]
    const parsed = parseVideo(video)
    const candidates = youtubePosterCandidates(video, parsed)
    const isUploadsOnly = candidates.length === 1 && candidates[0].startsWith('/uploads/')
    const canEmbed = Boolean(parsed.embedUrl && isIframeReadyEmbed(parsed.embedUrl))

    return (
      <div
        className="group aspect-w-16 relative w-full overflow-hidden rounded-3xl border-4 border-white bg-neutral-800 aspect-h-16 sm:rounded-[50px] sm:border-[10px] sm:aspect-h-9 dark:border-neutral-900"
        title={video.title}
      >
        {isPlay && canEmbed ? (
          <iframe
            key={parsed.embedUrl}
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
              className="object-cover brightness-100 transition-[filter] group-hover:brightness-75"
              src={candidates[0]}
              title={video.title}
              alt={video.title}
              sizes="(max-width: 1000px) 100vw, (max-width: 1200px) 75vw, 50vw"
              unoptimized={candidates[0].startsWith('/uploads/')}
            />
            <div
              onClick={() => canEmbed && setIsPlay(true)}
              onKeyDown={(e) => {
                if (!canEmbed) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIsPlay(true)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={video.title}
              className={clsx('absolute inset-0 flex items-center justify-center', !canEmbed && 'cursor-default')}
            >
              {canEmbed ? <PlayIconBtn /> : null}
            </div>
          </>
        ) : (
          <>
            <PosterImg
              candidates={candidates}
              alt={video.title}
              className="absolute inset-0 h-full w-full object-cover brightness-100 transition-[filter] group-hover:brightness-75"
              priority
            />
            <div
              onClick={() => canEmbed && setIsPlay(true)}
              onKeyDown={(e) => {
                if (!canEmbed) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIsPlay(true)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={video.title}
              className={clsx('absolute inset-0 flex items-center justify-center', !canEmbed && 'cursor-default')}
            >
              {canEmbed ? <PlayIconBtn /> : null}
            </div>
          </>
        )}
      </div>
    )
  }

  const sidebarItems = useMemo(
    () =>
      videos
        .map((video, index) => ({ video, index }))
        .filter(({ index }) => index !== currentVideo)
        .slice(0, SIDEBAR_MAX),
    [videos, currentVideo],
  )

  const renderSubVideo = (video: VideoType, index: number) => {
    const parsed = parseVideo(video)
    const thumbCandidates = youtubePosterCandidates(video, parsed)
    const uploadsOne = thumbCandidates.length === 1 && thumbCandidates[0].startsWith('/uploads/')

    return (
      <div
        className="group aspect-w-16 relative aspect-h-16 cursor-pointer overflow-hidden rounded-2xl sm:aspect-h-12 sm:rounded-3xl lg:aspect-h-9"
        onClick={() => {
          setCurrentVideo(index)
          if (!isPlay) setIsPlay(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setCurrentVideo(index)
            if (!isPlay) setIsPlay(true)
          }
        }}
        role="button"
        tabIndex={0}
        title={video.title}
        aria-label={video.title}
        key={video.id ? `${video.id}-${index}` : String(index)}
      >
        {uploadsOne ? (
          <Image
            fill
            className="object-cover brightness-100 transition-[filter] group-hover:brightness-75"
            src={thumbCandidates[0]}
            title={video.title}
            alt={video.title}
            sizes="(max-width: 300px) 100vw, (max-width: 1200px) 50vw, 25vw"
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

  const showSidebar = sidebarItems.length > 0

  return (
    <div className={clsx('nc-SectionVideos w-full min-w-0', className)}>
      <Heading subheading={subheading}>{heading}</Heading>

      <div className="relative flex flex-col sm:py-4 sm:pe-4 md:py-6 md:pe-6 lg:flex-row xl:py-14 xl:pe-14">
        <div className="absolute -end-4 -top-4 -bottom-4 z-0 w-2/3 rounded-3xl bg-primary-100/40 sm:rounded-[50px] md:end-0 md:top-0 md:bottom-0 xl:w-1/2 dark:bg-neutral-800/40" />

        <div className="relative min-w-0 grow pb-2 sm:pb-4 lg:pe-5 lg:pb-0 xl:pe-6">{renderMainVideo()}</div>

        {showSidebar ? (
          <div className="grid w-full min-w-0 shrink-0 grid-cols-4 gap-2 sm:gap-6 lg:w-36 lg:grid-cols-1 xl:w-40">
            {sidebarItems.map(({ video, index }) => renderSubVideo(video, index))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default SectionVideos
