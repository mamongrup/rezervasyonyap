'use client'

import type { SectionVideosModuleConfig } from '@/components/page-builder/modules/SectionVideosModule'
import type { VideoGalleryConfig } from '@/components/page-builder/modules/VideoGalleryModule'
import ImageUpload from '@/components/editor/ImageUpload'
import { slugifyMediaSegment } from '@/lib/upload-media-paths'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { HeadingSubheadingFields, PB_TEXT_INPUT_CLS } from './section-fields'

interface VideoItemDraft {
  id: string
  title: string
  videoUrl: string
  thumbnail: string
}

/** `video_gallery` (`title`/`subtitle`) ve `section_videos` (`heading`/`subheading`) birlikte */
export type VideoGalleryEditorConfig = Partial<VideoGalleryConfig & SectionVideosModuleConfig>

const asRec = (c: object) => c as Record<string, unknown>

export function VideoGalleryConfigEditor({
  config,
  onChange,
  pageSlug,
  titleKey = 'title',
  subtitleKey = 'subtitle',
  titlePlaceholder = '🎬 Videolar',
}: {
  config: VideoGalleryEditorConfig
  onChange: (updated: VideoGalleryEditorConfig) => void
  pageSlug: string
  titleKey?: 'title' | 'heading'
  subtitleKey?: 'subtitle' | 'subheading'
  titlePlaceholder?: string
}) {
  const videos: VideoItemDraft[] = Array.isArray(config.videos) ? (config.videos as VideoItemDraft[]) : []

  function updateVideo(index: number, field: keyof VideoItemDraft, val: string) {
    const next = videos.map((v, i) => (i === index ? { ...v, [field]: val } : v))
    onChange({ ...config, videos: next })
  }

  function addVideo() {
    const next: VideoItemDraft = {
      id: `v-${Date.now()}`,
      title: 'Yeni Video',
      videoUrl: '',
      thumbnail: '',
    }
    onChange({ ...config, videos: [...videos, next] })
  }

  function removeVideo(index: number) {
    onChange({ ...config, videos: videos.filter((_, i) => i !== index) })
  }

  function moveVideo(index: number, dir: 'up' | 'down') {
    const next = [...videos]
    const target = dir === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange({ ...config, videos: next })
  }

  return (
    <div className="space-y-5">
      <HeadingSubheadingFields
        config={asRec(config)}
        onChange={(u) => onChange(u as VideoGalleryEditorConfig)}
        headingKey={titleKey}
        subheadingKey={subtitleKey}
        placeholders={{ heading: titlePlaceholder, subheading: 'Kısa açıklama…' }}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Videolar ({videos.length})
          </span>
          <button
            type="button"
            onClick={addVideo}
            className="flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
          >
            <Plus className="h-3.5 w-3.5" /> Video Ekle
          </button>
        </div>

        {videos.length === 0 && (
          <p className="rounded-lg bg-neutral-50 px-4 py-3 text-xs text-neutral-400 dark:bg-neutral-800">
            Henüz video eklenmedi. Video Ekle butonuna tıklayın.
          </p>
        )}

        {videos.map((v, i) => (
          <div
            key={v.id}
            className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Video {i + 1}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveVideo(i, 'up')}
                  disabled={i === 0}
                  className="rounded p-0.5 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-700"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveVideo(i, 'down')}
                  disabled={i === videos.length - 1}
                  className="rounded p-0.5 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-700"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeVideo(i)}
                  className="rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-500">Video Başlığı</label>
                <input
                  type="text"
                  value={v.title}
                  onChange={(e) => updateVideo(i, 'title', e.target.value)}
                  placeholder="Örn: Kapadokya Balon Turu"
                  className={PB_TEXT_INPUT_CLS}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-500">
                  YouTube / Vimeo URL{' '}
                  <span className="text-neutral-400">(örn: https://youtube.com/watch?v=…)</span>
                </label>
                <input
                  type="url"
                  value={v.videoUrl}
                  onChange={(e) => updateVideo(i, 'videoUrl', e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className={PB_TEXT_INPUT_CLS}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-500">
                  Kapak görseli{' '}
                  <span className="text-neutral-400">(boşsa YouTube otomatik kapak kullanılır)</span>
                </label>
                <ImageUpload
                  value={v.thumbnail}
                  onChange={(url) => updateVideo(i, 'thumbnail', url)}
                  folder="site"
                  subPath={`page-builder/video-gallery/${slugifyMediaSegment(pageSlug)}`}
                  prefix="thumb"
                  useOriginalStem
                  aspectRatio="16/9"
                  compact
                  placeholder="Kapak — galeri"
                />
                <details className="rounded border border-neutral-200 px-2 py-1 dark:border-neutral-700">
                  <summary className="cursor-pointer text-[10px] text-neutral-500">Harici kapak URL</summary>
                  <input
                    type="url"
                    value={v.thumbnail}
                    onChange={(e) => updateVideo(i, 'thumbnail', e.target.value)}
                    placeholder="https://…"
                    className={`${PB_TEXT_INPUT_CLS} mt-1`}
                  />
                </details>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-neutral-400">
        💡 İlk video büyük öne çıkan video olarak gösterilir. Sırasını değiştirmek için yukarı/aşağı oklarını
        kullanın.
      </p>
    </div>
  )
}
