/**
 * Sosyal paylaşım worker — Facebook / Instagram / Pinterest Graph API.
 * Sunucu tarafında çalışır; `TRAVEL_SOCIAL_WORKER_SECRET` ile korunur.
 */

import { getPublicSiteUrl } from '@/lib/site-branding-seo'
import { preferListingGalleryFullAsset } from '@/lib/listing-gallery-display-url'
import { buildListingOgImageUrl } from '@/lib/social-share/listing-og-image-url'
import { generateAndStoreListingReelVideo } from '@/lib/social-video-generate'

const FB_GRAPH = 'https://graph.facebook.com/v18.0'
const PINTEREST_API = 'https://api.pinterest.com/v5/pins'
const INSTALLMENT_TEXT = 'Kredi kartına 12 Taksit'

const LISTING_SEGMENT: Record<string, string> = {
  hotel: 'otel',
  holiday_home: 'tatil-evi',
  yacht_charter: 'yat',
  tour: 'tur',
  activity: 'aktivite',
  cruise: 'gemi-turu',
  transfer: 'tasima',
  car_rental: 'arac',
  ferry: 'feribot-rezervasyon',
}

export interface SocialApiSettings {
  meta?: {
    page_id?: string
    page_access_token?: string
    instagram_account_id?: string
    auto_post?: boolean
  }
  pinterest?: {
    access_token?: string
    board_id?: string
    auto_post?: boolean
  }
  rotation?: {
    enabled?: boolean
    category_codes?: string[]
    min_repost_hours?: number
    per_run_limit?: number
  }
}

export type SocialPostType = 'feed' | 'story' | 'reel'

export interface PendingSocialJob {
  id: string
  network: string
  entity_id: string
  entity_type: string
  image_keys: string[]
  caption_ai_generated?: string | null
  allow_ai_caption: boolean
  listing_title: string
  listing_slug: string
  category_code: string
  template_body?: string | null
  post_type?: SocialPostType
}

export function listingPublicUrl(categoryCode: string, slug: string): string {
  const siteUrl = getPublicSiteUrl()
  const seg = LISTING_SEGMENT[categoryCode] ?? categoryCode
  return `${siteUrl}/${seg}/${slug}`
}

function hashtagSlug(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/[^a-zA-Z0-9]+/g, '')
}

function categoryHashtags(categoryCode: string): string[] {
  switch (categoryCode) {
    case 'hotel':
      return ['#Otel', '#Tatil', '#Konaklama']
    case 'holiday_home':
      return ['#Villa', '#TatilEvi', '#MuhafazakarVilla']
    case 'yacht_charter':
      return ['#YatKiralama', '#MaviTur', '#DenizTatili']
    case 'tour':
      return ['#Tur', '#KulturTuru', '#Seyahat']
    case 'activity':
      return ['#Aktivite', '#Deneyim', '#Seyahat']
    default:
      return ['#Tatil', '#Seyahat', '#Rezervasyon']
  }
}

function captionWithHashtags(caption: string, job: PendingSocialJob): string {
  const base = caption.trim()
  const titleTag = hashtagSlug(job.listing_title)
  const tags = [
    '#RezervasyonYap',
    ...categoryHashtags(job.category_code),
    '#Tatil',
    '#Seyahat',
    ...(titleTag ? [`#${titleTag.slice(0, 40)}`] : []),
  ].filter((tag, index, arr) => arr.indexOf(tag) === index)

  const hashtagBlock = tags.slice(0, 8).join(' ')
  if (!hashtagBlock) return base
  if (base.includes('#RezervasyonYap')) return base
  if (!base) return hashtagBlock
  return `${base}\n\n${hashtagBlock}`.trim()
}

function ensureListingLink(caption: string, pageUrl: string): string {
  const c = caption.trim()
  const u = pageUrl.trim()
  if (!u || c.includes(u)) return c
  return `${c}\n\n🔗 ${u}`.trim()
}

function ensureInstallmentText(caption: string): string {
  const c = caption.trim()
  if (c.toLocaleLowerCase('tr-TR').includes('12 taksit')) return c
  return `${c}\n\n💳 ${INSTALLMENT_TEXT}`.trim()
}

function listingSocialOgKind(categoryCode: string): 'stay' | 'experience' {
  return categoryCode === 'activity' || categoryCode === 'tour' || categoryCode === 'cruise'
    ? 'experience'
    : 'stay'
}

function listingSocialCoverUrl(job: PendingSocialJob): string {
  return (
    buildListingOgImageUrl({
      kind: listingSocialOgKind(job.category_code),
      handle: job.listing_slug,
      locale: 'tr',
      variant: 'social',
      listingId: job.entity_id,
      title: job.listing_title,
      categoryCode: job.category_code,
    }) ?? ''
  )
}

function isGeneratedSocialCoverKey(storageKey: string): boolean {
  const k = storageKey.trim().replace(/^\/+/, '')
  return k.startsWith('uploads/social-covers/')
}

function socialShareJpegUrl(siteUrl: string, src: string): string {
  const u = src.trim()
  if (!u.startsWith('https://')) return ''
  return `${siteUrl.replace(/\/$/, '')}/api/social/share-jpeg?src=${encodeURIComponent(u)}`
}

/** Worker paylaşımı: galeri URL'lerini her zaman site köküne sabitle (www/apex karışmasın). */
export function absoluteMediaUrl(siteUrl: string, storageKey: string): string {
  const key = storageKey.trim()
  if (!key) return ''
  const base = siteUrl.replace(/\/$/, '')
  if (!base) return ''
  if (key.startsWith('https://')) return preferListingGalleryFullAsset(key)
  if (key.startsWith('http://')) {
    try {
      const u = new URL(key)
      u.protocol = 'https:'
      return preferListingGalleryFullAsset(u.toString())
    } catch {
      return ''
    }
  }
  const path = key.startsWith('/') ? key : `/${key}`
  return preferListingGalleryFullAsset(`${base}${path}`)
}

async function probeShareJpegUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const ct = (res.headers.get('content-type') ?? '').toLowerCase()
    return res.ok && ct.includes('image/jpeg')
  } catch {
    return false
  }
}

async function metaReadyImageUrls(siteUrl: string, sourceUrls: string[]): Promise<string[]> {
  const checked = await Promise.all(
    sourceUrls.map(async (src) => {
      const proxy = socialShareJpegUrl(siteUrl, src)
      if (!proxy.startsWith('https://')) return null
      return (await probeShareJpegUrl(proxy)) ? proxy : null
    }),
  )
  return checked.filter((u): u is string => u != null).slice(0, 10)
}

function workerHeaders(secret: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-travel-social-worker-secret': secret,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isMetaRateLimitError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('too many actions') ||
    m.includes('request limit reached') ||
    m.includes('application request limit') ||
    m.includes('rate limit') ||
    m.includes('(#613)')
  )
}

async function validateFacebookPageToken(pageId: string, token: string): Promise<void> {
  const res = await fetch(`${FB_GRAPH}/${encodeURIComponent(pageId)}?fields=id,name&access_token=${encodeURIComponent(token)}`, {
    cache: 'no-store',
  })
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } }
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? 'facebook_page_token_invalid')
  }
  if (data.id && data.id !== pageId) {
    throw new Error('facebook_page_token_mismatch')
  }
}

async function resolveFacebookPageAccessToken(pageId: string, token: string): Promise<string> {
  const raw = token.trim()
  if (!pageId || !raw) throw new Error('facebook_not_configured')

  // 1) En güvenilir yol: sayfa node'undan `access_token` alanını iste. Bu, klasik
  //    "Page Role" (kullanıcı sayfada admin/editör) olmadan Business Manager/asset
  //    bazlı izinle verilmiş User Access Token'lar için de çalışır — `/me/accounts`
  //    bu durumda boş dizi döndürebilir çünkü kullanıcı sayfada kişisel bir role sahip
  //    olmayabilir (sayfa yalnızca app/business varlığı olarak bağlıdır).
  //    NOT: `/{pageId}?fields=id,name` sorgusu HERHANGİ bir token ile (hatta salt genel
  //    okuma izniyle) başarılı olur çünkü sayfa adı/id genel alanlardır — bu nedenle o
  //    kontrol tek başına "bu zaten geçerli bir Page Token" anlamına gelmez ve artık
  //    yalnızca son çare olarak kullanılıyor (aşağıda).
  const exchangeRes = await fetch(
    `${FB_GRAPH}/${encodeURIComponent(pageId)}?fields=access_token&access_token=${encodeURIComponent(raw)}`,
    { cache: 'no-store' },
  )
  const exchangeData = (await exchangeRes.json().catch(() => ({}))) as {
    access_token?: string
    error?: { message?: string }
  }
  if (exchangeRes.ok && exchangeData.access_token) return exchangeData.access_token.trim()

  // 2) Klasik Page Role listesi (kullanıcı sayfada admin/editör ise burada görünür).
  const accountsRes = await fetch(
    `${FB_GRAPH}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(raw)}`,
    { cache: 'no-store' },
  )
  const accounts = (await accountsRes.json().catch(() => ({}))) as {
    data?: Array<{ id?: string; access_token?: string }>
    error?: { message?: string }
  }
  if (accountsRes.ok && !accounts.error) {
    const pageToken = accounts.data?.find((p) => p.id === pageId)?.access_token?.trim()
    if (pageToken) return pageToken
  }

  // 3) Son çare: token zaten bir Page Access Token olabilir (eski kurulumlar).
  const pageRes = await fetch(
    `${FB_GRAPH}/${encodeURIComponent(pageId)}?fields=id&access_token=${encodeURIComponent(raw)}`,
    { cache: 'no-store' },
  )
  const pageData = (await pageRes.json().catch(() => ({}))) as { id?: string; error?: { message?: string } }
  if (pageRes.ok && pageData.id === pageId) return raw

  throw new Error(
    exchangeData.error?.message ??
      accounts.error?.message ??
      pageData.error?.message ??
      'facebook_page_token_required',
  )
}

export async function fetchPendingSocialJobs(
  apiOrigin: string,
  secret: string,
  limit = 10,
): Promise<{ jobs: PendingSocialJob[]; socialApi: SocialApiSettings }> {
  const res = await fetch(
    `${apiOrigin.replace(/\/$/, '')}/api/v1/social/worker/pending?limit=${limit}`,
    { headers: workerHeaders(secret), cache: 'no-store' },
  )
  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(e.error ?? `pending_${res.status}`)
  }
  const data = (await res.json()) as {
    jobs: PendingSocialJob[]
    social_api_json?: string
  }
  let socialApi: SocialApiSettings = {}
  if (data.social_api_json) {
    try {
      socialApi = JSON.parse(data.social_api_json) as SocialApiSettings
    } catch {
      socialApi = {}
    }
  }
  return { jobs: data.jobs ?? [], socialApi }
}

export interface SocialPostPlan {
  title: string
  description: string
  caption: string
  image_keys: string[]
  ai_generated: boolean
}

export async function fetchSocialPostPlan(
  apiOrigin: string,
  secret: string,
  body: {
    entity_id: string
    listing_title: string
    listing_url: string
    network: string
    category_code: string
    allow_ai_caption: boolean
    image_keys: string[]
    template_body?: string | null
  },
): Promise<SocialPostPlan> {
  const res = await fetch(`${apiOrigin.replace(/\/$/, '')}/api/v1/social/worker/caption`, {
    method: 'POST',
    headers: workerHeaders(secret),
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(e.error ?? `caption_${res.status}`)
  }
  const data = (await res.json()) as Partial<SocialPostPlan> & { caption?: string }
  const keys = (data.image_keys ?? body.image_keys).filter((k) => k.trim() !== '').slice(0, 10)
  return {
    title: (data.title ?? body.listing_title).trim(),
    description: (data.description ?? '').trim(),
    caption: (data.caption ?? '').trim(),
    image_keys: keys,
    ai_generated: Boolean(data.ai_generated),
  }
}

/** @deprecated fetchSocialPostPlan kullanın */
export async function fetchSocialCaption(
  apiOrigin: string,
  secret: string,
  body: {
    entity_id?: string
    listing_title: string
    listing_url: string
    network: string
    category_code?: string
    allow_ai_caption: boolean
    image_keys: string[]
  },
): Promise<string> {
  const plan = await fetchSocialPostPlan(apiOrigin, secret, {
    entity_id: body.entity_id ?? '',
    listing_title: body.listing_title,
    listing_url: body.listing_url,
    network: body.network,
    category_code: body.category_code ?? '',
    allow_ai_caption: body.allow_ai_caption,
    image_keys: body.image_keys,
  })
  return plan.caption
}

export async function patchSocialJob(
  apiOrigin: string,
  secret: string,
  jobId: string,
  body: {
    status: 'posted' | 'failed'
    external_post_id?: string
    error_message?: string
    caption_ai_generated?: string
  },
): Promise<void> {
  const res = await fetch(
    `${apiOrigin.replace(/\/$/, '')}/api/v1/social/worker/jobs/${encodeURIComponent(jobId)}`,
    {
      method: 'PATCH',
      headers: workerHeaders(secret),
      body: JSON.stringify(body),
      cache: 'no-store',
    },
  )
  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(e.error ?? `patch_job_${res.status}`)
  }
}

async function postFacebook(
  meta: NonNullable<SocialApiSettings['meta']>,
  message: string,
  pageUrl: string,
  imageUrls: string[] = [],
): Promise<string> {
  const pageId = meta.page_id?.trim()
  const token = meta.page_access_token?.trim()
  if (!pageId || !token) throw new Error('facebook_not_configured')
  const pageToken = await resolveFacebookPageAccessToken(pageId, token)
  await validateFacebookPageToken(pageId, pageToken)

  const imageUrl = imageUrls.find((u) => u.startsWith('https://')) ?? ''

  if (!imageUrl) {
    const body = new URLSearchParams({
      message: `${message}\n\n${pageUrl}`.trim(),
      access_token: pageToken,
    })
    const fbRes = await fetch(`${FB_GRAPH}/${encodeURIComponent(pageId)}/feed`, {
      method: 'POST',
      body,
    })
    const fbData = (await fbRes.json()) as {
      id?: string
      error?: { message: string }
    }
    if (!fbRes.ok || fbData.error) {
      throw new Error(fbData.error?.message ?? `fb_${fbRes.status}`)
    }
    return fbData.id ?? ''
  }

  const body = new URLSearchParams({
    url: imageUrl,
    caption: `${message}\n\n${pageUrl}`.trim(),
    access_token: pageToken,
  })
  const photoRes = await fetch(`${FB_GRAPH}/${encodeURIComponent(pageId)}/photos`, {
    method: 'POST',
    body,
  })
  const photoData = (await photoRes.json()) as { id?: string; post_id?: string; error?: { message: string } }
  if (!photoRes.ok || photoData.error) {
    throw new Error(photoData.error?.message ?? `fb_photo_${photoRes.status}`)
  }
  return photoData.post_id ?? photoData.id ?? ''
}

async function postInstagramSingle(
  igId: string,
  token: string,
  caption: string,
  imageUrl: string,
): Promise<string> {
  const createRes = await fetch(`${FB_GRAPH}/${encodeURIComponent(igId)}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: token,
    }),
  })
  const createData = (await createRes.json()) as {
    id?: string
    error?: { message: string }
  }
  if (!createRes.ok || createData.error || !createData.id) {
    throw new Error(createData.error?.message ?? `ig_media_${createRes.status}`)
  }

  await new Promise((r) => setTimeout(r, 2500))

  const pubRes = await fetch(`${FB_GRAPH}/${encodeURIComponent(igId)}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: createData.id,
      access_token: token,
    }),
  })
  const pubData = (await pubRes.json()) as {
    id?: string
    error?: { message: string }
  }
  if (!pubRes.ok || pubData.error) {
    throw new Error(pubData.error?.message ?? `ig_publish_${pubRes.status}`)
  }
  return pubData.id ?? createData.id ?? ''
}

/** Container 'FINISHED' olana kadar bekler (video işleme değişken sürer). */
async function pollMediaContainerReady(
  containerId: string,
  token: string,
  maxWaitMs: number,
  intervalMs: number,
): Promise<void> {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const res = await fetch(
      `${FB_GRAPH}/${encodeURIComponent(containerId)}?fields=status_code&access_token=${encodeURIComponent(token)}`,
      { cache: 'no-store' },
    )
    const data = (await res.json().catch(() => ({}))) as {
      status_code?: string
      error?: { message: string }
    }
    if (!res.ok || data.error) {
      throw new Error(data.error?.message ?? `ig_container_status_${res.status}`)
    }
    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR') throw new Error('ig_media_processing_error')
    if (data.status_code === 'EXPIRED') throw new Error('ig_media_expired')
    await sleep(intervalMs)
  }
  throw new Error('ig_media_processing_timeout')
}

async function postInstagramStory(igId: string, token: string, imageUrl: string): Promise<string> {
  const createRes = await fetch(`${FB_GRAPH}/${encodeURIComponent(igId)}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      media_type: 'STORIES',
      access_token: token,
    }),
  })
  const createData = (await createRes.json()) as { id?: string; error?: { message: string } }
  if (!createRes.ok || createData.error || !createData.id) {
    throw new Error(createData.error?.message ?? `ig_story_media_${createRes.status}`)
  }

  await pollMediaContainerReady(createData.id, token, 30000, 3000)

  const pubRes = await fetch(`${FB_GRAPH}/${encodeURIComponent(igId)}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: createData.id, access_token: token }),
  })
  const pubData = (await pubRes.json()) as { id?: string; error?: { message: string } }
  if (!pubRes.ok || pubData.error) {
    throw new Error(pubData.error?.message ?? `ig_story_publish_${pubRes.status}`)
  }
  return pubData.id ?? createData.id ?? ''
}

async function postInstagramReel(
  igId: string,
  token: string,
  caption: string,
  videoUrl: string,
  coverUrl?: string,
): Promise<string> {
  const payload: Record<string, unknown> = {
    media_type: 'REELS',
    video_url: videoUrl,
    caption,
    share_to_feed: true,
    access_token: token,
  }
  if (coverUrl) payload.cover_url = coverUrl

  const createRes = await fetch(`${FB_GRAPH}/${encodeURIComponent(igId)}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const createData = (await createRes.json()) as { id?: string; error?: { message: string } }
  if (!createRes.ok || createData.error || !createData.id) {
    throw new Error(createData.error?.message ?? `ig_reel_media_${createRes.status}`)
  }

  // Video işleme feed görsellerinden çok daha uzun sürebilir.
  await pollMediaContainerReady(createData.id, token, 150000, 5000)

  const pubRes = await fetch(`${FB_GRAPH}/${encodeURIComponent(igId)}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: createData.id, access_token: token }),
  })
  const pubData = (await pubRes.json()) as { id?: string; error?: { message: string } }
  if (!pubRes.ok || pubData.error) {
    throw new Error(pubData.error?.message ?? `ig_reel_publish_${pubRes.status}`)
  }
  return pubData.id ?? createData.id ?? ''
}

async function postInstagram(
  meta: NonNullable<SocialApiSettings['meta']>,
  caption: string,
  imageUrls: string[],
): Promise<string> {
  const igId = meta.instagram_account_id?.trim()
  const pageId = meta.page_id?.trim()
  const token = meta.page_access_token?.trim()
  if (!igId || !pageId || !token) throw new Error('instagram_not_configured')
  const pageToken = await resolveFacebookPageAccessToken(pageId, token)

  const httpsUrls = imageUrls.filter((u) => u.startsWith('https://')).slice(0, 10)
  if (httpsUrls.length === 0) throw new Error('instagram_requires_https_image')

  if (httpsUrls.length === 1) {
    return postInstagramSingle(igId, pageToken, caption, httpsUrls[0])
  }

  const childIds: string[] = []
  for (const url of httpsUrls.slice(0, 10)) {
    const createRes = await fetch(`${FB_GRAPH}/${encodeURIComponent(igId)}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: url,
        is_carousel_item: true,
        access_token: pageToken,
      }),
    })
    const createData = (await createRes.json()) as {
      id?: string
      error?: { message: string }
    }
    if (!createRes.ok || createData.error || !createData.id) {
      throw new Error(createData.error?.message ?? `ig_carousel_item_${createRes.status}`)
    }
    childIds.push(createData.id)
    await sleep(2500)
  }

  const carouselRes = await fetch(`${FB_GRAPH}/${encodeURIComponent(igId)}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      caption,
      children: childIds.join(','),
      access_token: pageToken,
    }),
  })
  const carouselData = (await carouselRes.json()) as {
    id?: string
    error?: { message: string }
  }
  if (!carouselRes.ok || carouselData.error || !carouselData.id) {
    throw new Error(carouselData.error?.message ?? `ig_carousel_${carouselRes.status}`)
  }

  await sleep(3000)

  const pubRes = await fetch(`${FB_GRAPH}/${encodeURIComponent(igId)}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: carouselData.id,
      access_token: pageToken,
    }),
  })
  const pubData = (await pubRes.json()) as {
    id?: string
    error?: { message: string }
  }
  if (!pubRes.ok || pubData.error) {
    throw new Error(pubData.error?.message ?? `ig_publish_${pubRes.status}`)
  }
  return pubData.id ?? carouselData.id ?? ''
}

async function postPinterest(
  pin: NonNullable<SocialApiSettings['pinterest']>,
  title: string,
  description: string,
  pageUrl: string,
  imageUrl: string,
): Promise<string> {
  const token = pin.access_token?.trim()
  const boardId = pin.board_id?.trim()
  if (!token || !boardId) throw new Error('pinterest_not_configured')
  if (!imageUrl.startsWith('https://')) {
    throw new Error('pinterest_requires_https_image')
  }

  const res = await fetch(PINTEREST_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: boardId,
      title: title.slice(0, 100),
      description: description.slice(0, 500),
      link: pageUrl,
      media_source: {
        source_type: 'image_url',
        url: imageUrl,
      },
    }),
  })
  const data = (await res.json()) as { id?: string; message?: string }
  if (!res.ok) {
    throw new Error(data.message ?? `pinterest_${res.status}`)
  }
  return data.id ?? ''
}

export async function processOneSocialJob(
  apiOrigin: string,
  secret: string,
  job: PendingSocialJob,
  socialApi: SocialApiSettings,
  siteUrl: string,
): Promise<{
  ok: boolean
  network: string
  post_type?: SocialPostType
  job_id: string
  post_id?: string
  error?: string
}> {
  const pageUrl = listingPublicUrl(job.category_code, job.listing_slug)

  const cachedCaption = (job.caption_ai_generated ?? '').trim()
  let plan: SocialPostPlan | null = null
  if (job.allow_ai_caption && !cachedCaption) {
    try {
      plan = await fetchSocialPostPlan(apiOrigin, secret, {
        entity_id: job.entity_id,
        listing_title: job.listing_title,
        listing_url: pageUrl,
        network: job.network,
        category_code: job.category_code,
        allow_ai_caption: job.allow_ai_caption,
        image_keys: job.image_keys,
        template_body: job.template_body,
      })
    } catch {
      plan = null
    }
  }
  const captionBase = job.allow_ai_caption
    ? plan?.caption || cachedCaption || plan?.description || job.listing_title
    : cachedCaption || plan?.caption || plan?.description || job.listing_title
  const caption = ensureListingLink(ensureInstallmentText(captionWithHashtags(captionBase, job)), pageUrl)
  const title = plan?.title || job.listing_title
  const description = plan?.description || captionBase
  const jobKeys = job.image_keys.filter((k) => k.trim() !== '').slice(0, 10)
  const selectedKeys = plan?.image_keys?.length ? plan.image_keys : jobKeys
  const imageUrls = selectedKeys
    .map((k) => absoluteMediaUrl(siteUrl, k))
    .filter((u) => u.startsWith('https://'))
  const coverUrl = listingSocialCoverUrl(job)
  const hasGeneratedCover = selectedKeys.some(isGeneratedSocialCoverKey)
  const postImageUrls = [hasGeneratedCover ? '' : coverUrl, ...imageUrls]
    .filter((u) => u.startsWith('https://'))
    .filter((u, i, arr) => arr.indexOf(u) === i)
    .slice(0, 10)
  const metaPostImageUrls = await metaReadyImageUrls(siteUrl, postImageUrls)

  try {
    if (metaPostImageUrls.length === 0 && postImageUrls.length > 0) {
      throw new Error('social_share_images_unreachable')
    }
    let postId = ''
    switch (job.network) {
      case 'facebook':
        postId = await postFacebook(socialApi.meta ?? {}, caption, pageUrl, metaPostImageUrls)
        break
      case 'instagram': {
        const meta = socialApi.meta ?? {}
        if (job.post_type === 'story') {
          if (metaPostImageUrls.length === 0) throw new Error('instagram_image_required')
          const igId = meta.instagram_account_id?.trim()
          const pageId = meta.page_id?.trim()
          const rawToken = meta.page_access_token?.trim()
          if (!igId || !pageId || !rawToken) throw new Error('instagram_not_configured')
          const pageToken = await resolveFacebookPageAccessToken(pageId, rawToken)
          postId = await postInstagramStory(igId, pageToken, metaPostImageUrls[0])
        } else if (job.post_type === 'reel') {
          // Slayt videosu için gerçek galeri fotoğrafları (kare kırpılmamış) kullanılır.
          const reelSourceUrls = imageUrls.length > 0 ? imageUrls : metaPostImageUrls
          if (reelSourceUrls.length === 0) throw new Error('instagram_reel_images_required')
          const igId = meta.instagram_account_id?.trim()
          const pageId = meta.page_id?.trim()
          const rawToken = meta.page_access_token?.trim()
          if (!igId || !pageId || !rawToken) throw new Error('instagram_not_configured')
          const pageToken = await resolveFacebookPageAccessToken(pageId, rawToken)
          const videoUrl = await generateAndStoreListingReelVideo(siteUrl, job.listing_slug, reelSourceUrls)
          postId = await postInstagramReel(igId, pageToken, caption, videoUrl, metaPostImageUrls[0])
        } else {
          if (metaPostImageUrls.length === 0) throw new Error('instagram_image_required')
          postId = await postInstagram(meta, caption, metaPostImageUrls)
        }
        break
      }
      case 'pinterest':
        if (postImageUrls.length === 0) throw new Error('pinterest_image_required')
        postId = await postPinterest(
          socialApi.pinterest ?? {},
          title,
          description,
          pageUrl,
          postImageUrls[0],
        )
        break
      default:
        throw new Error(`unsupported_network_${job.network}`)
    }

    await patchSocialJob(apiOrigin, secret, job.id, {
      status: 'posted',
      external_post_id: postId,
      caption_ai_generated: caption,
    })
    return { ok: true, network: job.network, post_type: job.post_type, job_id: job.id, post_id: postId }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (isMetaRateLimitError(msg)) {
      // Leave job pending — Meta throttled us; retry later instead of marking failed.
      return { ok: false, network: job.network, post_type: job.post_type, job_id: job.id, error: msg }
    }
    try {
      await patchSocialJob(apiOrigin, secret, job.id, {
        status: 'failed',
        error_message: msg.slice(0, 2000),
        caption_ai_generated: caption || undefined,
      })
    } catch {
      /* patch failure logged upstream */
    }
    return { ok: false, network: job.network, post_type: job.post_type, job_id: job.id, error: msg }
  }
}

export async function enqueueRotationSocialJobs(options?: {
  apiOrigin?: string
  secret?: string
  limit?: number
}): Promise<{ enqueued: number }> {
  const apiOrigin =
    options?.apiOrigin ??
    process.env.INTERNAL_API_ORIGIN ??
    process.env.NEXT_PUBLIC_API_URL ??
    ''
  const secret = options?.secret ?? process.env.TRAVEL_SOCIAL_WORKER_SECRET ?? ''
  const limit = options?.limit ?? 0

  if (!apiOrigin.trim()) throw new Error('api_origin_missing')
  if (!secret.trim()) throw new Error('worker_secret_missing')

  const res = await fetch(
    `${apiOrigin.replace(/\/$/, '')}/api/v1/social/worker/enqueue-rotate?limit=${limit}`,
    {
      method: 'POST',
      headers: workerHeaders(secret),
      cache: 'no-store',
    },
  )
  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(e.error ?? `enqueue_rotate_${res.status}`)
  }
  const data = (await res.json()) as { enqueued?: number }
  return { enqueued: data.enqueued ?? 0 }
}

export async function processPendingSocialJobs(options?: {
  apiOrigin?: string
  secret?: string
  limit?: number
  siteUrl?: string
}): Promise<{
  processed: number
  posted: number
  failed: number
  results: Array<{
    ok: boolean
    network: string
    post_type?: SocialPostType
    job_id: string
    post_id?: string
    error?: string
  }>
}> {
  const apiOrigin =
    options?.apiOrigin ??
    process.env.INTERNAL_API_ORIGIN ??
    process.env.NEXT_PUBLIC_API_URL ??
    ''
  const secret = options?.secret ?? process.env.TRAVEL_SOCIAL_WORKER_SECRET ?? ''
  const limit = options?.limit ?? 5
  const siteUrl = options?.siteUrl ?? getPublicSiteUrl()

  if (!apiOrigin.trim()) throw new Error('api_origin_missing')
  if (!secret.trim()) throw new Error('worker_secret_missing')
  if (!siteUrl.trim()) throw new Error('site_url_missing')

  const { jobs, socialApi } = await fetchPendingSocialJobs(apiOrigin, secret, limit)
  const results = []
  let posted = 0
  let failed = 0

  let processed = 0
  for (const job of jobs) {
    const r = await processOneSocialJob(apiOrigin, secret, job, socialApi, siteUrl)
    results.push(r)
    processed += 1
    if (r.ok) {
      posted += 1
    } else if (r.error && isMetaRateLimitError(r.error)) {
      break
    } else {
      failed += 1
    }
    await sleep(4000)
  }

  return { processed, posted, failed, results }
}
