import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getBlogPostBySlug,
  listBlogCategories,
  listBlogPosts,
  type BlogCategory,
  type BlogPost,
  type BlogTranslationPublic,
} from '@/lib/travel-api'
import { sanitizeRichCmsHtml } from '@/lib/sanitize-cms-html'
import { ArrowLeft, Calendar, Clock, Tag, ChevronRight } from 'lucide-react'

interface Props {
  params: Promise<{ locale: string; handle: string }>
}

function heroImages(post: BlogPost): string[] {
  try {
    return (JSON.parse(post.hero_gallery_json ?? '[]') as string[]).filter(Boolean)
  } catch { return [] }
}

function parseTags(post: BlogPost): string[] {
  try { return JSON.parse(post.tags_json ?? '[]') as string[] } catch { return [] }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, handle } = await params
  try {
    const res = await getBlogPostBySlug(handle, locale)
    const post = res.post
    const tr = res.translation
    const title = tr?.title ?? handle
    const imgs = heroImages(post)
    return {
      title: `${title} — Blog`,
      description: tr?.excerpt?.slice(0, 160) ?? undefined,
      openGraph: {
        title,
        description: tr?.excerpt?.slice(0, 160) ?? undefined,
        images: imgs[0] ? [imgs[0]] : post.featured_image_url ? [post.featured_image_url] : [],
      },
    }
  } catch {
    return { title: `${handle} — Blog` }
  }
}

// ─── Hero Section (3-image mosaic like region page) ────────────────────────────
function BlogHero({ images, title }: { images: string[]; title: string }) {
  const [img1, img2, img3] = images
  if (!img1 && !img2 && !img3) return null

  if (images.length >= 3 && img2 && img3) {
    return (
      <div className="relative w-full h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden rounded-none lg:rounded-3xl">
        <div className="grid grid-cols-4 grid-rows-2 h-full gap-1.5">
          <div className="col-span-3 row-span-2 relative overflow-hidden">
            <img src={img1} alt={title} className="w-full h-full object-cover" />
          </div>
          <div className="col-span-1 row-span-1 relative overflow-hidden">
            <img src={img2} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="col-span-1 row-span-1 relative overflow-hidden">
            <img src={img3} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    )
  }

  if (img1) {
    return (
      <div className="relative w-full h-[50vh] min-h-[300px] max-h-[500px] overflow-hidden rounded-none lg:rounded-3xl">
        <img src={img1} alt={title} className="w-full h-full object-cover" />
      </div>
    )
  }

  return null
}

// ─── Related Posts ────────────────────────────────────────────────────────────
function RelatedPosts({
  posts,
  currentSlug,
  catMap,
}: {
  posts: BlogPost[]
  currentSlug: string
  catMap: Record<string, BlogCategory>
}) {
  const related = posts.filter((p) => p.slug !== currentSlug).slice(0, 3)
  if (related.length === 0) return null

  return (
    <section className="mt-16 pt-10 border-t border-neutral-200 dark:border-neutral-700">
      <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">İlgili Yazılar</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {related.map((post) => {
          const imgs = heroImages(post)
          const img = imgs[0] ?? post.featured_image_url
          const cat = post.category_id ? catMap[post.category_id] ?? null : null
          return (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-shadow bg-white dark:bg-neutral-900"
            >
              {img ? (
                <div className="h-36 overflow-hidden">
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ) : (
                <div className="h-36 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <span className="text-2xl opacity-30">📝</span>
                </div>
              )}
              <div className="p-4">
                {cat && (
                  <span className="text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1 mb-1">
                    <Tag className="w-3 h-3" />
                    {cat.name ?? cat.slug}
                  </span>
                )}
                <h3 className="font-semibold text-sm text-neutral-900 dark:text-white line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {post.title ?? post.slug}
                </h3>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function BlogPostPage({ params }: Props) {
  const { locale, handle } = await params

  let post: BlogPost | null = null
  let translation: BlogTranslationPublic | null = null
  let category: BlogCategory | null = null
  let allPosts: BlogPost[] = []
  let catMap: Record<string, BlogCategory> = {}

  try {
    const [postRes, catsRes, postsRes] = await Promise.all([
      getBlogPostBySlug(handle, locale),
      listBlogCategories(),
      listBlogPosts({ published_only: true, limit: 20 }),
    ])
    post = postRes.post
    translation = postRes.translation
    catMap = Object.fromEntries(catsRes.categories.map((c) => [c.id, c]))
    category = post.category_id ? catMap[post.category_id] ?? null : null
    allPosts = postsRes.posts
  } catch {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Yazı bulunamadı</h1>
        <Link href="/blog" className="text-primary-600 hover:underline">Blog'a dön</Link>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Yazı bulunamadı</h1>
        <Link href="/blog" className="text-primary-600 hover:underline">Blog'a dön</Link>
      </div>
    )
  }

  const imgs = heroImages(post)
  const tags = parseTags(post)
  const title = translation?.title ?? handle
  const publishDate = post.published_at ?? post.created_at

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <BlogHero
          images={imgs.length > 0 ? imgs : post.featured_image_url ? [post.featured_image_url] : []}
          title={title}
        />
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-neutral-400 mb-6">
          <Link href="/blog" className="hover:text-neutral-600 dark:hover:text-neutral-200 flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Blog
          </Link>
          {category && (
            <>
              <ChevronRight className="w-3 h-3" />
              <Link
                href={`/blog/category/${category.slug}`}
                className="hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {category.name ?? category.slug}
              </Link>
            </>
          )}
          <ChevronRight className="w-3 h-3" />
          <span className="text-neutral-600 dark:text-neutral-300 truncate max-w-[200px]">{title}</span>
        </nav>

        {/* Category badge */}
        {category && (
          <Link
            href={`/blog/category/${category.slug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors mb-4"
          >
            <Tag className="w-3.5 h-3.5" />
            {category.name ?? category.slug}
          </Link>
        )}

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white mb-4 leading-tight">
          {title}
        </h1>

        {/* Excerpt */}
        {translation?.excerpt && (
          <p className="text-xl text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
            {translation.excerpt}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400 mb-8 pb-8 border-b border-neutral-200 dark:border-neutral-700">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {fmtDate(publishDate)}
          </span>
          {post.read_time_minutes && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {post.read_time_minutes} dakika okuma
            </span>
          )}
        </div>

        {/* Body */}
        {translation?.body ? (
          <div
            className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-img:rounded-2xl prose-p:leading-relaxed prose-li:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizeRichCmsHtml(translation.body) }}
          />
        ) : (
          <div className="py-12 text-center text-neutral-400">
            <p>Bu dilde içerik henüz eklenmemiş.</p>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-10 pt-8 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related posts */}
        <RelatedPosts posts={allPosts} currentSlug={handle} catMap={catMap} />
      </div>
    </div>
  )
}
