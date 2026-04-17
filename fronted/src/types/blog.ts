/** Blog vitrin kartı / detay üst bilgisi (API + şablon uyumu). */
export type TBlogPost = {
  id: string
  title: string
  handle: string
  excerpt: string
  featuredImage: {
    src: string
    alt: string
    width: number
    height: number
  }
  date: string
  datetime: string
  category: { title: string; href: string }
  /** Tam URL yolu — `localized_routes` ile `/tr/gunluk/slug` vb. */
  detailHref: string
  timeToRead: string
  author: {
    name: string
    avatar: { src: string; alt: string; width: number; height: number }
    description: string
  }
}
