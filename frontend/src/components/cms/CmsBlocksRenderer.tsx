'use client'

import type { CmsBlock } from '@/lib/travel-api'
import BecomeProviderModule from '@/components/page-builder/modules/BecomeProviderModule'
import ClientSayModule from '@/components/page-builder/modules/ClientSayModule'
import ImageTextModule from '@/components/page-builder/modules/ImageTextModule'
import NewsletterModule from '@/components/page-builder/modules/NewsletterModule'
import StatsModule from '@/components/page-builder/modules/StatsModule'
import TextBlockModule from '@/components/page-builder/modules/TextBlockModule'
import CmsFoundersBlock from './CmsFoundersBlock'
import CmsHeroBlock from './CmsHeroBlock'

function parseConfig(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return {}
  }
}

export default function CmsBlocksRenderer({ blocks }: { blocks: CmsBlock[] }) {
  const sorted = [...blocks].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="flex flex-col gap-y-16 lg:gap-y-28">
      {sorted.map((b) => {
        const cfg = parseConfig(b.config_json)
        const key = b.id

        switch (b.block_type) {
          case 'hero':
            return <CmsHeroBlock key={key} config={cfg as Parameters<typeof CmsHeroBlock>[0]['config']} />

          case 'rich_html':
            return (
              <TextBlockModule
                key={key}
                config={{
                  title: cfg.title as string | undefined,
                  content: cfg.content as string | undefined,
                  align: (cfg.align as 'left' | 'center' | 'right') ?? 'left',
                  maxWidth: cfg.maxWidth as string | undefined,
                }}
              />
            )

          case 'text': {
            const title = (cfg.title as string) ?? ''
            const text = (cfg.text as string) ?? ''
            const html = text.includes('<') ? text : `<p>${text.replace(/\n/g, '</p><p>')}</p>`
            return (
              <TextBlockModule
                key={key}
                config={{
                  title: title || undefined,
                  content: html,
                  align: 'left',
                }}
              />
            )
          }

          case 'image_text':
            return <ImageTextModule key={key} config={cfg as Parameters<typeof ImageTextModule>[0]['config']} />

          case 'stats':
            return <StatsModule key={key} config={cfg as Parameters<typeof StatsModule>[0]['config']} />

          case 'client_say':
            return (
              <ClientSayModule
                key={key}
                config={{
                  heading: cfg.heading as string | undefined,
                  subHeading: (cfg.subHeading ?? cfg.subheading) as string | undefined,
                }}
              />
            )

          case 'founders':
            return <CmsFoundersBlock key={key} config={cfg as Parameters<typeof CmsFoundersBlock>[0]['config']} />

          case 'become_provider':
            return (
              <BecomeProviderModule key={key} config={cfg as Parameters<typeof BecomeProviderModule>[0]['config']} />
            )

          case 'newsletter':
            return <NewsletterModule key={key} config={cfg as Parameters<typeof NewsletterModule>[0]['config']} />

          default:
            return (
              <div
                key={key}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
              >
                Bilinmeyen blok türü: <code className="font-mono">{b.block_type}</code> — panelde türü değiştirin veya
                JSON ile yapılandırın.
              </div>
            )
        }
      })}
    </div>
  )
}
