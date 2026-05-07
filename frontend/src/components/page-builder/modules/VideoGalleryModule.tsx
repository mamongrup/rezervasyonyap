'use client'

import { useState } from 'react'
import Image from 'next/image'
import { PlayCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

export interface VideoItem {
  id: string
  title: string
  /** YouTube / Vimeo tam URL ya da embed ID */
  videoUrl: string
  /** Kapak resmi — boşsa YouTube thumbnail otomatik alınır */
  thumbnail?: string
}

export interface VideoGalleryConfig {
  title?: string
  subtitle?: string
  videos?: VideoItem[]
}

// YouTube URL'den embed URL'si ve thumbnail üretir
function parseVideo(url: string): { embedUrl: string; thumbnail: string } {
  // youtube.com/watch?v=ID veya youtu.be/ID veya youtube.com/embed/ID
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  )
  if (ytMatch) {
    const id = ytMatch[1]
    return {
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    }
  }
  // Vimeo
  const vmMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vmMatch) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vmMatch[1]}?autoplay=1`,
      thumbnail: '',
    }
  }
  // Doğrudan embed veya diğer — olduğu gibi kullan
  return { embedUrl: url, thumbnail: '' }
}

const FALLBACK_THUMB = '/uploads/external/51cf4a52af7100feb678.avif'

const DEFAULT_VIDEOS: VideoItem[] = [
  {
    id: 'v1',
    title: 'Türkiye\'nin En Güzel Plajları',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail: '/uploads/external/51cf4a52af7100feb678.avif',
  },
  {
    id: 'v2',
    title: 'Kapadokya Balon Turu',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail: '/uploads/external/45c36779eb1ef7f239a2.avif',
  },
  {
    id: 'v3',
    title: 'Bodrum\'da Yat Kiralama',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail: '/uploads/external/5cf9600df0163373786a.avif',
  },
  {
    id: 'v4',
    title: 'İstanbul Gezi Rehberi',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail: '/uploads/external/fb5e30434ad6f2816dc0.avif',
  },
]

export default function VideoGalleryModule({ config }: { config: VideoGalleryConfig }) {
  const {
    title    = '🎬 Videolar',
    subtitle = 'En yeni destinasyonları ve deneyimleri keşfedin.',
    videos   = DEFAULT_VIDEOS,
  } = config

  const [activeId, setActiveId] = useState<string>(videos[0]?.id ?? '')
  const [playing, setPlaying]   = useState(false)

  const activeVideo = videos.find((v) => v.id === activeId) ?? videos[0]

  function handlePlay() {
    setPlaying(true)
  }

  function handleSelectVideo(v: VideoItem) {
    setActiveId(v.id)
    setPlaying(false)
  }

  if (!activeVideo) return null

  const { embedUrl, thumbnail: autoThumb } = parseVideo(activeVideo.videoUrl)
  const activeThumbnail = activeVideo.thumbnail || autoThumb || FALLBACK_THUMB

  return (
    <div>
      {/* Başlık */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 md:text-3xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-neutral-500 dark:text-neutral-400">{subtitle}</p>
        )}
      </div>

      {/* Ana layout: büyük video sol + liste sağ */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* ── Büyük featured video ── */}
        <div className="relative min-h-64 w-full overflow-hidden rounded-2xl bg-neutral-900 lg:flex-1">
          {playing ? (
            <iframe
              src={embedUrl}
              title={activeVideo.title}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <>
              <Image
                src={activeThumbnail}
                alt={activeVideo.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 60vw"
                unoptimized={activeThumbnail.startsWith('/uploads/')}
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Oynat butonu */}
              <button
                onClick={handlePlay}
                aria-label="Videoyu oynat"
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-2xl backdrop-blur-sm transition hover:scale-110 hover:bg-white">
                  <HugeiconsIcon icon={PlayCircleIcon} className="h-12 w-12" strokeWidth={1.75} />
                </div>
              </button>

              {/* Video başlığı */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-sm font-semibold text-white drop-shadow-md md:text-base">
                  {activeVideo.title}
                </p>
              </div>
            </>
          )}
        </div>

        {/* ── Sağdaki küçük video listesi ── */}
        {videos.length > 1 && (
          <div className="flex flex-row gap-3 lg:w-52 lg:flex-col xl:w-60">
            {videos.map((v) => {
              const { thumbnail: autoT } = parseVideo(v.videoUrl)
              const thumb = v.thumbnail || autoT || FALLBACK_THUMB
              const isActive = v.id === activeId

              return (
                <button
                  key={v.id}
                  onClick={() => handleSelectVideo(v)}
                  className={`group relative flex-1 overflow-hidden rounded-2xl bg-neutral-900 transition lg:h-32 lg:flex-none ${
                    isActive ? 'ring-2 ring-primary-500' : 'hover:ring-2 hover:ring-primary-400/60'
                  }`}
                >
                  <Image
                    src={thumb}
                    alt={v.title}
                    fill
                    className="object-cover transition group-hover:scale-105"
                    sizes="(max-width: 1024px) 33vw, 240px"
                    unoptimized={thumb.startsWith('/uploads/')}
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition" />

                  {/* Mini play icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-neutral-900 shadow-md">
                      <HugeiconsIcon icon={PlayCircleIcon} className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                  </div>

                  {/* Title at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-2.5 pb-2 pt-4">
                    <p className="line-clamp-2 text-left text-[11px] font-medium leading-tight text-white">
                      {v.title}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
