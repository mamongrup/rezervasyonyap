'use client'

import Heading from '@/shared/Heading'
import { PlayIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import { FC, useState } from 'react'

interface VideoType {
  id: string
  title: string
  thumbnail: string
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

  const renderMainVideo = () => {
    const video: VideoType = videos[currentVideo]
    return (
      <div
        className="group aspect-w-16 overflow-hidden rounded-3xl border-4 border-white bg-neutral-800 aspect-h-16 sm:rounded-[50px] sm:border-[10px] sm:aspect-h-9 dark:border-neutral-900"
        title={video.title}
      >
        {isPlay ? (
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        ) : (
          <>
            <Image
              fill
              className="object-cover brightness-100 transition-[filter] group-hover:brightness-75"
              src={video.thumbnail}
              title={video.title}
              alt={video.title}
              sizes="(max-width: 1000px) 100vw, (max-width: 1200px) 75vw, 50vw"
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
    if (index === currentVideo) return null
    return (
      <div
        className="group aspect-w-16 relative cursor-pointer overflow-hidden rounded-2xl aspect-h-16 sm:rounded-3xl sm:aspect-h-12 lg:aspect-h-9"
        onClick={() => {
          setCurrentVideo(index)
          !isPlay && setIsPlay(true)
        }}
        title={video.title}
        key={String(index)}
      >
        <Image
          fill
          className="object-cover brightness-100 transition-[filter] group-hover:brightness-75"
          src={video.thumbnail}
          title={video.title}
          alt={video.title}
          sizes="(max-width: 300px) 100vw, (max-width: 1200px) 50vw, 25vw"
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

      <div className="relative flex flex-col sm:py-4 sm:pe-4 md:py-6 md:pe-6 lg:flex-row xl:py-14 xl:pe-14">
        <div className="absolute -end-4 -top-4 -bottom-4 z-0 w-2/3 rounded-3xl bg-primary-100/40 sm:rounded-[50px] md:end-0 md:top-0 md:bottom-0 xl:w-1/2 dark:bg-neutral-800/40" />
        <div className="relative grow pb-2 sm:pb-4 lg:pe-5 lg:pb-0 xl:pe-6">{renderMainVideo()}</div>
        <div className="grid shrink-0 grid-cols-4 gap-2 sm:gap-6 lg:w-36 lg:grid-cols-1 xl:w-40">
          {videos.map(renderSubVideo)}
        </div>
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
