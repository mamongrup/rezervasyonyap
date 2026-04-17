import type { Metadata } from 'next'
import Link from 'next/link'
import { listBlogCategories, listBlogPosts, type BlogCategory, type BlogPost } from '@/lib/travel-api'
import { Calendar, Clock, Tag, ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog — Seyahat Rehberi ve İpuçları',
  description: 'Seyahat rehberleri, tatil ipuçları ve destinasyon önerileri',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function heroImages(post: BlogPost): string[] {
  try {
    return JSON.parse(post.hero_gallery_json ?? '[]') as string[]
  } catch {
    return []
  }
}

// ─── Featured Post Card ───────────────────────────────────────────────────────
function FeaturedCard({ post, category }: { post: BlogPost; category: BlogCategory | null }) {
  const imgs = heroImages(post)
  const coverImg = imgs[0] ?? post.featured_image_url ?? null

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:shadow-xl transition-shadow"
    >
      {coverImg ? (
        <div className="relative h-64 sm:h-80 overflow-hidden">
          <img
            src={coverImg}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            {category && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-600/90 text-xs font-medium mb-3">
                <Tag className="w-3 h-3" />
                {category.name ?? category.slug}
              </span>
            )}
            <h2 className="text-xl sm:text-2xl font-bold line-clamp-2">{post.title ?? post.slug}</h2>
          </div>
        </div>
      ) : (
        <div className="h-64 sm:h-80 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center">
          <span className="text-5xl">📝</span>
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center gap-4 text-xs text-neutral-400 mb-2">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {fmtDate(post.published_at ?? post.created_at)}
          </span>
          {post.read_time_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.read_time_minutes} dk okuma
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm font-medium group-hover:gap-3 transition-all">
          Devamını oku <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  )
}

// ─── Regular Post Card ────────────────────────────────────────────────────────
function PostCard({ post, category }: { post: BlogPost; category: BlogCategory | null }) {
  const imgs = heroImages(post)
  const coverImg = imgs[0] ?? post.featured_image_url ?? null

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-shadow"
    >
      {coverImg ? (
        <div className="relative h-48 overflow-hidden">
          <img
            src={coverImg}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center">
          <span className="text-3xl opacity-40">📝</span>
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        {category && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 mb-2">
            <Tag className="w-3 h-3" />
            {category.name ?? category.slug}
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
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function BlogPage() {
  const [postsRes, catsRes] = await Promise.all([
    listBlogPosts({ published_only: true, limit: 50 }).catch(() => ({ posts: [] })),
    listBlogCategories().catch(() => ({ categories: [] })),
  ])

  const posts = postsRes.posts
  const categories = catsRes.categories
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))
  const [featured, ...rest] = posts

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Hero */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-3">
            Blog
          </h1>
          <p className="text-neutral-500 text-lg max-w-2xl">
            Seyahat rehberleri, tatil ipuçları ve destinasyon önerileri
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-6xl">📝</div>
            <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
              Henüz blog yazısı yok
            </h2>
            <p className="text-neutral-500">Yakında içerikler burada yayınlanacak.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Category filter */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/blog"
                  className="px-4 py-2 rounded-full text-sm font-medium bg-primary-600 text-white"
                >
                  Tümü
                </Link>
                {categories.filter((c) => c.is_active).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/blog/category/${cat.slug}`}
                    className="px-4 py-2 rounded-full text-sm font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    {cat.name ?? cat.slug}
                  </Link>
                ))}
              </div>
            )}

            {/* Featured post */}
            {featured && (
    <div>
                <FeaturedCard
                  post={featured}
                  category={featured.category_id ? catMap[featured.category_id] ?? null : null}
                />
              </div>
            )}

            {/* Rest of posts */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    category={post.category_id ? catMap[post.category_id] ?? null : null}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
