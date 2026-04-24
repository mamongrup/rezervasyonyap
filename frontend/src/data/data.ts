import avatarImage1 from '@/images/avatars/Image-1.png'
import avatarImage2 from '@/images/avatars/Image-2.png'
import avatarImage3 from '@/images/avatars/Image-3.png'
import avatarImage4 from '@/images/avatars/Image-4.png'
import {
  enrichBlogPostHrefs,
  fetchBlogPostDetailByHandle,
  fetchBlogPostsForLocale,
} from '@/lib/blog-public'
import type { TBlogPost } from '@/types/blog'

export type { TBlogPost } from '@/types/blog'

export async function getListingReviews(handle: string) {
  return [
    {
      id: '1',
      title: "Can't say enough good things",
      rating: 5,
      content: 'Lovely hostess, very friendly! I would definitely stay here again. ',
      author: 'S. Walkinshaw',
      authorAvatar: avatarImage1,
      date: 'May 16, 2025',
      datetime: '2025-01-06',
    },
    {
      id: '2',
      title: 'Perfect for going out when you want to stay comfy',
      rating: 4,
      content: 'Excellent place. The host is super friendly, the room is clean and quiet.',
      author: 'Risako M',
      authorAvatar: avatarImage2,
      date: 'May 11, 2021',
      datetime: '2025-01-06',
    },
    {
      id: '3',
      title: 'Very nice feeling sweater!',
      rating: 5,
      content:
        'Very nice and friendly lady. Be pleasant to talk with her. The room looks better than in the pictures. ',
      author: 'Eden Birch',
      authorAvatar: avatarImage3,
      date: 'Aug 22, 2022',
      datetime: '2025-01-06',
    },
    {
      id: '4',
      title: 'Very nice feeling sweater!',
      rating: 5,
      content:
        'Lots of nice restaurants nearby and I tried two of them. I had so limited time in Paris this time and look forward to living here again.',
      author: 'Jonathan Edwards',
      authorAvatar: avatarImage4,
      date: 'May 16, 2025',
      datetime: '2025-01-06',
    },
  ]
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

const MOCK_BLOG_POSTS: Omit<TBlogPost, 'detailHref'>[] = [
  {
    id: '1',
    title: 'Kapadokya\'da Unutulmaz Bir Hafta Sonu: Gezi Rehberi',
    handle: 'kapadokya-hafta-sonu-gezi-rehberi',
    excerpt:
      'Peri bacaları, balon turları ve tarihi yeraltı şehirleriyle Kapadokya, Türkiye\'nin en büyülü destinasyonlarından biri. Bu kılavuzda, kısa bir seyahati nasıl en verimli şekilde planlayacağınızı anlatıyoruz.',
    featuredImage: {
      src: '/uploads/external/bda9ccb6e8fce406c360.avif',
      alt: 'Kapadokya\'da Balon Turu',
      width: 1260,
      height: 750,
    },
    date: 'Nis 2, 2025',
    datetime: '2025-04-02',
    category: { title: 'Gezi Fikirleri', href: '/blog?kategori=gezi-fikirleri' },
    timeToRead: '5 dk okuma',
    author: {
      name: 'Ayşe Kaya',
      avatar: { src: avatarImage1.src, alt: 'Ayşe Kaya', width: avatarImage1.width, height: avatarImage1.height },
      description: 'Seyahat yazarı ve fotoğrafçı. Türkiye\'nin dört bir yanını gezmiş, deneyimlerini blog aracılığıyla paylaşıyor.',
    },
  },
  {
    id: '2',
    title: 'Ege Kıyılarında Tekne Turu: Mavi Yolculuk Deneyimi',
    handle: 'ege-kiyilarinda-tekne-turu-mavi-yolculuk',
    excerpt:
      'Türkiye\'nin Ege kıyılarındaki muhteşem koylar, kristal berraklığındaki deniz ve taze deniz ürünleriyle dolu bir mavi yolculuk için en iyi güzergahları ve ipuçlarını derlendi.',
    featuredImage: {
      src: '/uploads/external/2b0678462ab30d3b5d84.avif',
      alt: 'Ege\'de Tekne Turu',
      width: 1260,
      height: 750,
    },
    date: 'Mar 18, 2025',
    datetime: '2025-03-18',
    category: { title: 'Gezi Fikirleri', href: '/blog?kategori=gezi-fikirleri' },
    timeToRead: '6 dk okuma',
    author: {
      name: 'Mehmet Yılmaz',
      avatar: { src: avatarImage2.src, alt: 'Mehmet Yılmaz', width: avatarImage2.width, height: avatarImage2.height },
      description: 'Deniz tutkunusu ve seyahat bloggeri. Her yıl Ege\'yi teknesiyle dolaşıyor.',
    },
  },
  {
    id: '3',
    title: 'İstanbul\'un Gizli Köşeleri: Turistlerin Bilmediği 10 Yer',
    handle: 'istanbul-gizli-kose-turistlerin-bilmedigi-10-yer',
    excerpt:
      'Büyük çoğunluğun bilmediği ama her seyahat meraklısının mutlaka görmesi gereken İstanbul\'un saklı güzellikleri. Tarihi yarımada\'nın arka sokaklarından Boğaz\'ın sessiz köşelerine kadar bir rehber.',
    featuredImage: {
      src: '/uploads/external/4e2cad429ba10635413c.avif',
      alt: 'İstanbul Manzarası',
      width: 1260,
      height: 750,
    },
    date: 'Mar 5, 2025',
    datetime: '2025-03-05',
    category: { title: 'Destinasyonlar', href: '/blog?kategori=destinasyonlar' },
    timeToRead: '7 dk okuma',
    author: {
      name: 'Zeynep Arslan',
      avatar: { src: avatarImage3.src, alt: 'Zeynep Arslan', width: avatarImage3.width, height: avatarImage3.height },
      description: 'İstanbul doğumlu seyahat yazarı. Şehri avucunun içi gibi biliyor.',
    },
  },
  {
    id: '4',
    title: 'Antalya\'nın En İyi 5 Oteli: Tatilin Tadını Çıkarın',
    handle: 'antalya-en-iyi-5-otel-tatil-tavsiyeleri',
    excerpt:
      'Akdeniz\'in incisi Antalya\'da konaklama seçerken göz önünde bulundurmanız gereken en iyi otelleri, fiyat-performans karşılaştırması ve gerçek misafir yorumlarıyla derlendi.',
    featuredImage: {
      src: '/uploads/external/8617586fba59e6c624d2.avif',
      alt: 'Antalya Otel Havuzu',
      width: 1260,
      height: 750,
    },
    date: 'Şub 20, 2025',
    datetime: '2025-02-20',
    category: { title: 'Otel Tavsiyeleri', href: '/blog?kategori=otel-tavsiyeleri' },
    timeToRead: '4 dk okuma',
    author: {
      name: 'Ali Demir',
      avatar: { src: avatarImage4.src, alt: 'Ali Demir', width: avatarImage4.width, height: avatarImage4.height },
      description: 'Otel değerlendirme uzmanı. Yılda 200\'den fazla otel ziyareti yapıyor.',
    },
  },
  {
    id: '5',
    title: 'Seyahatte Bütçe Yönetimi: Az Parayla Çok Gez',
    handle: 'seyahatte-butce-yonetimi-az-parayla-cok-gez',
    excerpt:
      'Seyahat etmek pahalı olmak zorunda değil! Uçak bileti bulmaktan konaklama seçimine, yerel yemek deneyimlemekten ulaşım tasarruflarına kadar her şeyi kapsayan tam kapsamlı bir rehber.',
    featuredImage: {
      src: '/uploads/external/c32b2ae1cced147cf838.avif',
      alt: 'Ekonomik Seyahat',
      width: 1260,
      height: 750,
    },
    date: 'Şub 10, 2025',
    datetime: '2025-02-10',
    category: { title: 'Seyahat İpuçları', href: '/blog?kategori=seyahat-ipuclari' },
    timeToRead: '8 dk okuma',
    author: {
      name: 'Elif Çelik',
      avatar: { src: avatarImage1.src, alt: 'Elif Çelik', width: avatarImage1.width, height: avatarImage1.height },
      description: 'Bütçe seyahati uzmanı. 50 ülkeyi minimal bütçeyle gezip bloğuna aktarıyor.',
    },
  },
  {
    id: '6',
    title: 'Pamukkale ve Efes: İki Harika Arasında Kültür Turu',
    handle: 'pamukkale-efes-kultur-turu-rehberi',
    excerpt:
      'Dünyanın en büyük antik kentlerinden biri olan Efes ile doğanın mucizesi Pamukkale travertenleri arasında nasıl mükemmel bir tur planlanır? Güzergah, konaklama ve dikkat edilmesi gereken noktalar.',
    featuredImage: {
      src: '/uploads/external/4eb5c8b66586b520aa17.avif',
      alt: 'Pamukkale Travertenleri',
      width: 1260,
      height: 750,
    },
    date: 'Oca 28, 2025',
    datetime: '2025-01-28',
    category: { title: 'Gezi Fikirleri', href: '/blog?kategori=gezi-fikirleri' },
    timeToRead: '5 dk okuma',
    author: {
      name: 'Hasan Koç',
      avatar: { src: avatarImage2.src, alt: 'Hasan Koç', width: avatarImage2.width, height: avatarImage2.height },
      description: 'Kültür turizmi uzmanı ve tarih meraklısı yazar.',
    },
  },
  {
    id: '7',
    title: 'Bodrum\'da En İyi Deniz Ürünleri Restoranları',
    handle: 'bodrum-en-iyi-deniz-urunleri-restoranlari',
    excerpt:
      'Bodrum\'un el değmemiş balıkçı köyleri ve lüks marinalarındaki restoranlarda taze deniz ürünleri deneyimi için özenle seçilmiş rehber. Adres, fiyat ve tat puanları ile.',
    featuredImage: {
      src: '/uploads/external/856ef5f9932480496d10.avif',
      alt: 'Bodrum Deniz Ürünleri',
      width: 1260,
      height: 750,
    },
    date: 'Oca 15, 2025',
    datetime: '2025-01-15',
    category: { title: 'Yeme & İçme', href: '/blog?kategori=yeme-icme' },
    timeToRead: '4 dk okuma',
    author: {
      name: 'Selin Öz',
      avatar: { src: avatarImage3.src, alt: 'Selin Öz', width: avatarImage3.width, height: avatarImage3.height },
      description: 'Gastronomi yazarı ve food blogger. Türkiye\'nin lezzetlerini dünyaya tanıtıyor.',
    },
  },
  {
    id: '8',
    title: 'Tatilde Vize Stresi Yaşamamak İçin 8 Altın Kural',
    handle: 'tatilde-vize-stresi-yasamamak-icin-8-altin-kural',
    excerpt:
      'Yurt dışı seyahatlerinde en çok sorun yaratılan konuların başında gelen vize sürecini stressiz yönetmek için deneyimli gezginlerin paylaştığı pratik ipuçları ve dikkat edilmesi gereken noktalar.',
    featuredImage: {
      src: '/uploads/external/a6d17baa4ce6e2f04973.avif',
      alt: 'Pasaport ve Vize',
      width: 1260,
      height: 750,
    },
    date: 'Ara 22, 2024',
    datetime: '2024-12-22',
    category: { title: 'Seyahat İpuçları', href: '/blog?kategori=seyahat-ipuclari' },
    timeToRead: '6 dk okuma',
    author: {
      name: 'Okan Şahin',
      avatar: { src: avatarImage4.src, alt: 'Okan Şahin', width: avatarImage4.width, height: avatarImage4.height },
      description: '60\'tan fazla ülkede seyahat etmiş vize danışmanı ve seyahat bloggeri.',
    },
  },
  {
    id: '9',
    title: 'Trabzon\'dan Rize\'ye: Doğu Karadeniz\'de Yaylalar ve Çay Bahçeleri',
    handle: 'trabzon-rize-dogu-karadeniz-yaylalar-cay-bahceleri',
    excerpt:
      'Yemyeşil yaylalar, dev şelaleler ve çay bahçelerinin arasında adeta kaybolmak için Doğu Karadeniz\'in en güzel rotalarını, konaklama noktalarını ve yerel lezzetleri keşfedin.',
    featuredImage: {
      src: '/uploads/external/e7b29d483282370aee7c.avif',
      alt: 'Karadeniz Yaylaları',
      width: 1260,
      height: 750,
    },
    date: 'Ara 10, 2024',
    datetime: '2024-12-10',
    category: { title: 'Gezi Fikirleri', href: '/blog?kategori=gezi-fikirleri' },
    timeToRead: '7 dk okuma',
    author: {
      name: 'Ayşe Kaya',
      avatar: { src: avatarImage1.src, alt: 'Ayşe Kaya', width: avatarImage1.width, height: avatarImage1.height },
      description: 'Seyahat yazarı ve fotoğrafçı.',
    },
  },
]

export async function getBlogPosts(locale = 'tr'): Promise<TBlogPost[]> {
  if (!process.env.NEXT_PUBLIC_API_URL?.trim()) {
    return enrichBlogPostHrefs(locale, MOCK_BLOG_POSTS)
  }
  try {
    return await fetchBlogPostsForLocale(locale)
  } catch {
    return enrichBlogPostHrefs(locale, MOCK_BLOG_POSTS)
  }
}

export type TBlogPostDetail = TBlogPost & { content: string; tags: string[] }

export async function getBlogPostsByHandle(handle: string, locale = 'tr'): Promise<TBlogPostDetail | null> {
  const h = handle.toLowerCase()
  if (process.env.NEXT_PUBLIC_API_URL?.trim()) {
    const d = await fetchBlogPostDetailByHandle(h, locale)
    if (d) return d
  }
  const posts = await getBlogPosts(locale)
  const post = posts.find((p) => p.handle === h)
  if (!post) return null
  return {
    ...post,
    content: `<p>${post.excerpt}</p><p>Bu yazının tam içeriği yönetim panelinden eklenebilir. Yazıları yönetmek için <strong>Yönetim Paneli → İçerik → Blog</strong> bölümünü kullanın.</p>`,
    tags: [post.category.title, 'Seyahat', 'Türkiye'],
  }
}

//
export type TListingReivew = Awaited<ReturnType<typeof getListingReviews>>[number]
