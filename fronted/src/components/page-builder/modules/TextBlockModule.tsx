import { sanitizeRichCmsHtml } from '@/lib/sanitize-cms-html'

interface TextBlockConfig {
  title?: string
  content?: string
  align?: 'left' | 'center' | 'right'
  maxWidth?: string
}

export default function TextBlockModule({ config }: { config: TextBlockConfig }) {
  const align = config.align ?? 'left'
  const alignClass = align === 'center' ? 'text-center mx-auto' : align === 'right' ? 'text-right ms-auto' : ''
  const maxW = config.maxWidth ?? 'max-w-3xl'
  return (
    <section className={`${maxW} ${alignClass}`}>
      {config.title && (
        <h2 className="mb-4 text-2xl font-bold text-neutral-900 dark:text-white">{config.title}</h2>
      )}
      {config.content && (
        <div
          className="prose prose-neutral max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: sanitizeRichCmsHtml(config.content) }}
        />
      )}
    </section>
  )
}
