import { listBlogCategories, listBlogPosts, type BlogPost } from '@/lib/travel-api'
import { vitrinHref } from '@/lib/vitrin-href'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Clock, ArrowRight, Compass, MapPin, Waves, TreePine, type LucideIcon } from 'lucide-react'
import rightImgPng from '@/images/our-features.png'

const PLACEHOLDER_ITEMS: { icon: LucideIcon; color: string; title: string; desc: string }[] = [
  {
    icon: MapPin,
    color: 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    title: "Türkiye'nin En Güzel Rotaları",
    desc: 'Keşfedilmeyi bekleyen rotalar ve seyahat ipuçları',
  },
  {
    icon: Waves,
    color: 'bg-sky-50 text-sky-500 dark:bg-sky-900/30 dark:text-sky-400',
    title: 'Deniz & Kıyı Tatil Rehberi',
    desc: 'Mavi bayraklı plajlar ve koylara dair her şey',
  },
  {
    icon: TreePine,
    color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    title: 'Doğa Kaçamakları',
    desc: 'Kamp, trekking ve doğayla baş başa tatil fikirleri',
  },
]

const CATEGORY_SLUG = 'gezi-onerileri'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function coverImg(post: BlogPost): string | null {
  try {
    const imgs = JSON.parse(post.hero_gallery_json ?? '[]') as string[]
    return imgs[0] ?? post.featured_image_url ?? null
  } catch {
    return post.featured_image_url ?? null
  }
}

interface Props {
  locale: string
  className?: string
}

export default async function SectionGeziOnerileri({ locale, className = '' }: Props) {
  const categoryHref = await vitrinHref(locale, `/blog/category/${CATEGORY_SLUG}`)

  let posts: BlogPost[] = []
  let categoryId: string | null = null

  try {
    const [catsRes, allPostsRes] = await Promise.all([
      listBlogCategories().catch(() => ({ categories: [] })),
      listBlogPosts({ published_only: true, limit: 50 }).catch(() => ({ posts: [] })),
    ])

    const cat = catsRes.categories.find((c) => c.slug === CATEGORY_SLUG)
    categoryId = cat?.id ?? null

    if (categoryId) {
      posts = allPostsRes.posts
        .filter((p) => p.category_id === categoryId)
        .slice(0, 3)
    }
  } catch {
    // API bağlı değil — boş göster
  }

  const hasPosts = posts.length > 0

  const postHrefs = hasPosts
    ? await Promise.all(posts.map((post) => vitrinHref(locale, `/blog/${post.slug}`)))
    : []

  return (
    <div className={`relative flex flex-col items-center py-14 lg:flex-row ${className}`}>
      {/* Sol: İllüstrasyon veya makale görseli */}
      <div className="shrink-0 grow lg:w-1/2">
        {hasPosts && coverImg(posts[0]) ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl shadow-xl">
            <img
              src={coverImg(posts[0])!}
              alt={posts[0].title ?? ''}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        ) : (
          <Image src={rightImgPng} alt="" sizes="(max-width: 1024px) 100vw, 50vw" priority />
        )}
      </div>

      {/* Sağ: İçerik */}
      <div className="mt-10 max-w-2xl shrink-0 lg:mt-0 lg:w-2/5 lg:ps-16">
        <span className="text-sm uppercase tracking-widest text-gray-400">Blog</span>

        <h2 className="mt-4 text-3xl font-semibold text-neutral-900 dark:text-white lg:text-4xl">
          Gezi Önerileri
        </h2>

        {hasPosts ? (
          <ul className="mt-8 flex flex-col gap-y-6">
            {posts.map((post, idx) => {
              const img = coverImg(post)
              return (
                <li key={post.id}>
                  <Link
                    href={postHrefs[idx]!}
                    className="group flex items-start gap-4 rounded-2xl p-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    {/* Küçük görsel */}
                    {img ? (
                      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl">
                        <img src={img} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                        <Compass className="h-8 w-8 text-neutral-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400 transition-colors">
                        {post.title ?? post.slug}
                      </h3>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {fmtDate(post.published_at ?? post.created_at)}
                        </span>
                        {post.read_time_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {post.read_time_minutes} dk
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="mt-8 flex flex-col gap-y-5">
            {PLACEHOLDER_ITEMS.map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-semibold text-neutral-900 dark:text-white">{item.title}</span>
                    <span className="block text-sm text-neutral-500 dark:text-neutral-400">{item.desc}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <Link
          href={categoryHref}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md"
        >
          Tüm Gezi Önerileri
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
