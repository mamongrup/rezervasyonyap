'use client'

import { CATEGORY_REGISTRY, type CategoryRegistryEntry } from '@/data/category-registry'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Menu01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { FC, useCallback } from 'react'

const bySlug: Record<string, CategoryRegistryEntry> = Object.fromEntries(
  CATEGORY_REGISTRY.map((e) => [e.slug, e]),
)

type Props = {
  slugs: string[]
  onSlugsChange: (next: string[]) => void
  onSave: () => void | Promise<void>
  saving: boolean
}

const TravelHomeCategoryOrderPanel: FC<Props> = ({ slugs, onSlugsChange, onSave, saving }) => {
  const onDragStart = useCallback((e: React.DragEvent, slug: string) => {
    e.dataTransfer.setData('text/travel-cat-slug', slug)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault()
      const fromSlug = e.dataTransfer.getData('text/travel-cat-slug')
      if (!fromSlug) return
      const fromIndex = slugs.indexOf(fromSlug)
      if (fromIndex === -1 || fromIndex === targetIndex) return
      const next = [...slugs]
      const [removed] = next.splice(fromIndex, 1)
      next.splice(targetIndex, 0, removed)
      onSlugsChange(next)
    },
    [slugs, onSlugsChange],
  )

  return (
    <section className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
      <h2 className="text-xl font-semibold">Ana sayfa kategori sırası</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Ön yüzdeki 12 dikey kategori (grid / kaydırıcı) bu sırayla listelenir. Satırı tutup sürükleyin; ardından kaydedin.
      </p>

      <ul className="mt-4 divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700">
        {slugs.map((slug, index) => {
          const entry = bySlug[slug]
          if (!entry) return null
          return (
            <li
              key={slug}
              draggable
              onDragStart={(e) => onDragStart(e, slug)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, index)}
              className="flex cursor-grab items-center gap-3 bg-white px-3 py-2.5 active:cursor-grabbing dark:bg-neutral-900/40"
            >
              <HugeiconsIcon icon={Menu01Icon} className="size-5 shrink-0 text-neutral-400" aria-hidden strokeWidth={1.75} />
              <span className="text-lg" aria-hidden>
                {entry.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{entry.name}</span>
                <span className="ms-2 font-mono text-xs text-neutral-400">{slug}</span>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-4">
        <ButtonPrimary type="button" disabled={saving} onClick={() => void onSave()}>
          {saving ? 'Kaydediliyor…' : 'Vitrin sırasını kaydet'}
        </ButtonPrimary>
      </div>
    </section>
  )
}

export default TravelHomeCategoryOrderPanel
