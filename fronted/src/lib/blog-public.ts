import avatarImage1 from '@/images/avatars/Image-1.png'
import { getBlogPostBySlug, listBlogPosts } from '@/lib/travel-api'
import { vitrinHref } from '@/lib/vitrin-href'
import type { TBlogPost } from '@/types/blog'

const DEFAULT_FEATURED = {
  src: 'https://images.pexels.com/photos/1371360/pexels-photo-1371360.jpeg',
  alt: '',
  width: 1920,
  height: 1280,
} as const

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function excerptFromBody(body: string, max = 200): string {
  const t = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return t.length > max ? `${t.slice(0, max)}…` : t
}

function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const m = Math.max(1, Math.round(words / 200))
  return `${m} min read`
}

function formatBlogDate(iso: string | null | undefined): { date: string; datetime: string } {
  if (!iso) return { date: '', datetime: '' }
  try {
    const d = new Date(iso)
    return {
      date: d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
      datetime: d.toISOString().slice(0, 10),
    }
  } catch {
    return { date: iso, datetime: iso.slice(0, 10) }
  }
}

function authorBlock(title: string): TBlogPost['author'] {
  return {
    name: 'Blog',
    avatar: {
      src: avatarImage1.src,
      alt: title,
      width: avatarImage1.width,
      height: avatarImage1.height,
    },
    description: '',
  }
}

async function postToCard(
  post: { id: string; slug: string; published_at: string | null; created_at: string },
  locale: string,
): Promise<TBlogPost> {
  const { date, datetime } = formatBlogDate(post.published_at ?? post.created_at)
  const listHref = await vitrinHref(locale, '/blog')
  const detailHref = await vitrinHref(locale, `/blog/${post.slug}`)
  try {
    const { translation } = await getBlogPostBySlug(post.slug, locale)
    const title = translation?.title?.trim() || titleFromSlug(post.slug)
    const body = translation?.body ?? ''
    const excerpt = excerptFromBody(body) || '…'
    return {
      id: post.id,
      title,
      handle: post.slug,
      excerpt,
      featuredImage: { ...DEFAULT_FEATURED, alt: title },
      date,
      datetime,
      category: { title: 'Blog', href: listHref },
      detailHref,
      timeToRead: readingTime(body || excerpt),
      author: authorBlock(title),
    }
  } catch {
    const t = titleFromSlug(post.slug)
    return {
      id: post.id,
      title: t,
      handle: post.slug,
      excerpt: '…',
      featuredImage: { ...DEFAULT_FEATURED, alt: t },
      date,
      datetime,
      category: { title: 'Blog', href: listHref },
      detailHref,
      timeToRead: '1 min read',
      author: authorBlock(t),
    }
  }
}

/** Mock / yedek liste — `detailHref` + blog liste linki ekler */
export async function enrichBlogPostHrefs(
  locale: string,
  posts: Omit<TBlogPost, 'detailHref'>[],
): Promise<TBlogPost[]> {
  const listHref = await vitrinHref(locale, '/blog')
  return Promise.all(
    posts.map(async (p) => ({
      ...p,
      detailHref: await vitrinHref(locale, `/blog/${p.handle}`),
      category: { title: p.category.title, href: listHref },
    })),
  )
}

export async function fetchBlogPostsForLocale(locale: string, limit = 24): Promise<TBlogPost[]> {
  const { posts } = await listBlogPosts({ published_only: true, limit })
  const batchSize = 6
  const out: TBlogPost[] = []
  for (let i = 0; i < posts.length; i += batchSize) {
    const chunk = posts.slice(i, i + batchSize)
    const mapped = await Promise.all(chunk.map((p) => postToCard(p, locale)))
    out.push(...mapped)
  }
  return out
}

export type TBlogPostDetail = TBlogPost & { content: string; tags: string[] }

export async function fetchBlogPostDetailByHandle(handle: string, locale: string): Promise<TBlogPostDetail | null> {
  try {
    const listHref = await vitrinHref(locale, '/blog')
    const detailHref = await vitrinHref(locale, `/blog/${handle}`)
    const { post, translation } = await getBlogPostBySlug(handle, locale)
    const title = translation?.title?.trim() || titleFromSlug(post.slug)
    const content = translation?.body ?? ''
    const excerpt = excerptFromBody(content, 280) || title
    const { date, datetime } = formatBlogDate(post.published_at ?? post.created_at)
    return {
      id: post.id,
      title,
      handle: post.slug,
      excerpt,
      content,
      featuredImage: { ...DEFAULT_FEATURED, alt: title },
      date,
      datetime,
      category: { title: 'Blog', href: listHref },
      detailHref,
      timeToRead: readingTime(content || excerpt),
      author: authorBlock(title),
      tags: [],
    }
  } catch {
    return null
  }
}
