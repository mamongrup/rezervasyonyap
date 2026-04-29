import { fetchBlogPostDetailByHandle, fetchBlogPostsForLocale } from '@/lib/blog-public'
import type { TBlogPost } from '@/types/blog'

export type { TBlogPost } from '@/types/blog'

export type TListingReivew = {
  id: string
  author: string
  authorAvatar: { src: string }
  content: string
  date: string
  rating: number
  title?: string
}

export async function getListingReviews(_handle: string): Promise<TListingReivew[]> {
  return []
}

/** Blog kategori listesi */
export const BLOG_CATEGORIES = [
  { slug: 'gezi-fikirleri', title: 'Gezi Fikirleri' },
  { slug: 'otel-tavsiyeleri', title: 'Otel Tavsiyeleri' },
  { slug: 'seyahat-ipuclari', title: 'Seyahat İpuçları' },
  { slug: 'destinasyonlar', title: 'Destinasyonlar' },
  { slug: 'yeme-icme', title: 'Yeme & İçme' },
] as const

export type BlogCategorySlug = (typeof BLOG_CATEGORIES)[number]['slug']

export async function getBlogPosts(locale = 'tr'): Promise<TBlogPost[]> {
  if (!process.env.NEXT_PUBLIC_API_URL?.trim()) return []
  try {
    return await fetchBlogPostsForLocale(locale)
  } catch {
    return []
  }
}

export type TBlogPostDetail = TBlogPost & { content: string; tags: string[] }

export async function getBlogPostsByHandle(handle: string, locale = 'tr'): Promise<TBlogPostDetail | null> {
  if (!process.env.NEXT_PUBLIC_API_URL?.trim()) return null
  return fetchBlogPostDetailByHandle(handle.toLowerCase(), locale)
}

