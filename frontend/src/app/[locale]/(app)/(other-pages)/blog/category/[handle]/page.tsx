import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { listBlogCategories, listBlogPosts, type BlogCategory, type BlogPost } from '@/lib/travel-api'
import { Calendar, Clock, Tag, ChevronRight, ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ locale: string; handle: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const catsRes = await listBlogCategories().catch(() => ({ categories: [] }))
  const cat = catsRes.categories.find((c) => c.slug === handle)
  return {
    title: cat
      ? `${cat.name ?? cat.slug} — Blog`
      : `${handle} — Blog`,
    description: cat?.description ?? `${cat?.name ?? handle} kategorisindeki blog yazıları`,
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function coverImg(post: BlogPost): string | null {
  try {
    const imgs = JSON.parse(post.hero_gallery_json ?? '[]') as string[]
    return imgs[0] ?? post.featured_image_url ?? null
  } catch { return post.featured_image_url ?? null }
}

export default async function BlogCategoryPage({ params }: Props) {
  const { handle } = await params
  const [catsRes, postsRes] = await Promise.all([
    listBlogCategories().catch(() => ({ categories: [] })),
    listBlogPosts({ published_only: true, limit: 100 }).catch(() => ({ posts: [] })),
  ])

  const cat = catsRes.categories.find((c) => c.slug === handle) ?? null
  const catMap = Object.fromEntries(catsRes.categories.map((c) => [c.id, c]))
  const filtered = cat
    ? postsRes.posts.filter((p) => p.category_id === cat.id)
    : postsRes.posts

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Category header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          {cat?.image_url && (
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden mb-4">
              <Image
                src={cat.image_url}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 mb-2">
            <Tag className="w-4 h-4" />
            Kategori
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-3">
            {cat?.name ?? handle}
          </h1>
          {cat?.description && (
            <p className="text-neutral-500 text-lg max-w-2xl">{cat.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb / back */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/blog"
            className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Tüm Yazılar
          </Link>
          <span className="text-neutral-300 dark:text-neutral-600">/</span>
          <span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">
            {cat?.name ?? handle}
          </span>
          <span className="text-xs text-neutral-400 ml-auto">{filtered.length} yazı</span>
        </div>

        {/* Category tabs */}
        {catsRes.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Link
              href="/blog"
              className="px-4 py-2 rounded-full text-sm font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Tümü
            </Link>
            {catsRes.categories.filter((c) => c.is_active).map((c) => (
              <Link
                key={c.id}
                href={`/blog/category/${c.slug}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  c.id === cat?.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                {c.name ?? c.slug}
              </Link>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-6xl">📝</div>
            <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
              Bu kategoride yazı yok
            </h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => {
              const img = coverImg(post)
              const postCat = post.category_id ? catMap[post.category_id] ?? null : null
              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-shadow"
                >
                  {img ? (
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={img}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center">
                      <span className="text-3xl opacity-40">📝</span>
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    {postCat && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 mb-2">
                        <Tag className="w-3 h-3" />
                        {postCat.name ?? postCat.slug}
                      </span>
                    )}
                    <h3 className="font-semibold text-neutral-900 dark:text-white line-clamp-2 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {post.title ?? post.slug}
                    </h3>
                    <div className="mt-auto flex items-center gap-3 text-xs text-neutral-400 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(post.published_at ?? post.created_at)}
                      </span>
                      {post.read_time_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {post.read_time_minutes} dk
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
