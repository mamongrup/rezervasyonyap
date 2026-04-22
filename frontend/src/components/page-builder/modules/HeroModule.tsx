'use client'

import { CategoryRegistryEntry } from '@/data/category-registry'

interface HeroModuleConfig {
  heading?: string
  subheading?: string
  backgroundUrl?: string
  style?: 'full' | 'compact' | 'minimal'
  showSearchForm?: boolean
  overlayOpacity?: number
}

interface HeroModuleProps {
  config: HeroModuleConfig
  category: CategoryRegistryEntry
  searchFormNode?: React.ReactNode
}

export default function HeroModule({ config, category, searchFormNode }: HeroModuleProps) {
  const heading = config.heading || category.heroHeading
  const subheading = config.subheading || category.heroSubheading
  const gradient = category.heroGradient ?? 'from-primary-600 to-primary-800'
  const isCompact = config.style === 'compact'

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${gradient} text-white ${
        isCompact ? 'min-h-[340px]' : 'min-h-[520px]'
      }`}
      style={
        config.backgroundUrl
          ? { backgroundImage: `url(${config.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
    >
      {/* Overlay */}
      {config.backgroundUrl && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: config.overlayOpacity ?? 0.45 }}
        />
      )}

      <div className="relative z-10 container py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 text-5xl">{category.emoji}</div>
          <h1 className={`font-bold text-white ${isCompact ? 'text-3xl' : 'text-4xl md:text-5xl'}`}>
            {heading}
          </h1>
          <p className={`mt-4 text-white/80 ${isCompact ? 'text-base' : 'text-lg md:text-xl'}`}>
            {subheading}
          </p>

          {config.showSearchForm !== false && searchFormNode && (
            <div className="mt-8 rounded-2xl bg-white p-4 shadow-2xl dark:bg-neutral-900">
              {searchFormNode}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
