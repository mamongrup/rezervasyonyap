'use client'

import type { TBlogPost } from '@/types/blog'
import { BLOG_CATEGORIES } from '@/data/data'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { useCallback } from 'react'
import PostCardMeta from './PostCardMeta'

// ─── Post Card ────────────────────────────────────────────────────────────────

function BlogPostCard({ post }: { post: TBlogPost }) {
  return (
    <article className="flex flex-col h-full">
      <Link
        href={post.detailHref}
        className="relative block aspect-4/3 overflow-hidden rounded-2xl"
      >
        <Image
          src={post.featuredImage.src}
          alt={post.featuredImage.alt || post.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 hover:scale-105"
        />
      </Link>

      <div className="mt-5 flex flex-col flex-1">
        <Link
          href={post.category.href}
          className="inline-block text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 hover:underline mb-2"
        >
          {post.category.title}
        </Link>

        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 sm:text-lg">
          <Link href={post.detailHref} className="line-clamp-2 hover:text-primary-600 dark:hover:text-primary-400">
            {post.title}
          </Link>
        </h3>

        <p className="mt-3 line-clamp-3 text-sm text-neutral-500 dark:text-neutral-400">
          {post.excerpt}
        </p>

        <div className="mt-auto pt-4">
          <PostCardMeta
            author={post.author}
            date={post.date}
            blogListHref={post.category.href}
          />
        </div>
      </div>
    </article>
  )
}

// ─── Featured Post Card (large) ───────────────────────────────────────────────

function FeaturedPostCard({ post }: { post: TBlogPost }) {
  return (
    <article className="relative overflow-hidden rounded-3xl bg-neutral-900 text-white">
      <Link href={post.detailHref} className="absolute inset-0 z-10" aria-label={post.title} />
      <Image
        src={post.featuredImage.src}
        alt={post.featuredImage.alt || post.title}
        fill
        sizes="(max-width: 1024px) 100vw, 60vw"
        className="object-cover opacity-60"
      />
      <div className="relative z-20 flex h-full flex-col justify-end p-6 sm:p-8 md:p-10">
        <Link
          href={post.category.href}
          className="z-30 inline-block text-xs font-semibold uppercase tracking-wider text-primary-300 hover:underline mb-3"
          onClick={(e) => e.stopPropagation()}
        >
          {post.category.title}
        </Link>
        <h2 className="text-xl font-bold sm:text-2xl md:text-3xl line-clamp-3 mb-3">
          {post.title}
        </h2>
        <p className="line-clamp-2 text-sm text-neutral-300">{post.excerpt}</p>
        <div className="mt-4 flex items-center gap-3 text-xs text-neutral-400">
          <span>{post.author.name}</span>
          <span>·</span>
          <span>{post.date}</span>
          <span>·</span>
          <span>{post.timeToRead}</span>
        </div>
      </div>
    </article>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  posts: TBlogPost[]
  className?: string
}

export default function SectionBlogWithCategories({ posts, className = '' }: Props) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const activeSlug = searchParams.get('kategori') ?? 'gezi-fikirleri'

  const setCategory = useCallback(
    (slug: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('kategori', slug)
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, pathname, router],
  )

  // Filter posts by active category
  const activeCategory = BLOG_CATEGORIES.find((c) => c.slug === activeSlug)
  const filtered = activeCategory
    ? posts.filter((p) => p.category.title === activeCategory.title)
    : posts

  // "Tümü" için tüm yazılar
  const ALL_SLUG = 'tumü'
  const displayAll = activeSlug === ALL_SLUG

  const displayPosts = displayAll ? posts : filtered

  const featured = displayPosts[0]
  const rest = displayPosts.slice(1)

  return (
    <section className={`relative ${className}`}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 sm:text-3xl">
            Blog
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Seyahat deneyimleri, ipuçları ve destinasyon rehberleri
          </p>
        </div>
        <Link
          href={pathname}
          className="shrink-0 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Tüm yazılar →
        </Link>
      </div>

      {/* Category Tabs */}
      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory(ALL_SLUG)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            displayAll
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500'
          }`}
        >
          Tümü
        </button>
        {BLOG_CATEGORIES.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setCategory(cat.slug)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !displayAll && activeSlug === cat.slug
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500'
            }`}
          >
            {cat.title}
          </button>
        ))}
      </div>

      {displayPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
          <p className="text-lg">Bu kategoride henüz yazı bulunmuyor.</p>
          <button
            onClick={() => setCategory(ALL_SLUG)}
            className="mt-4 text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            Tüm yazıları gör
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Featured post */}
          {featured && (
            <div className="min-h-[340px] sm:min-h-[420px]">
              <FeaturedPostCard post={featured} />
            </div>
          )}

          {/* Grid */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
