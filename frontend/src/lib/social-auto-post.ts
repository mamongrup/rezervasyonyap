/**
 * Sosyal paylaşım worker — Facebook / Instagram / Pinterest Graph API.
 * Sunucu tarafında çalışır; `TRAVEL_SOCIAL_WORKER_SECRET` ile korunur.
 */

import { getPublicSiteUrl } from '@/lib/site-branding-seo'
import { preferListingGalleryFullAsset } from '@/lib/listing-gallery-display-url'
import { storageKeyToPublicUrl } from '@/lib/listing-gallery-hero-order'

const FB_GRAPH = 'https://graph.facebook.com/v18.0'
const PINTEREST_API = 'https://api.pinterest.com/v5/pins'

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
}

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
}

export function listingPublicUrl(categoryCode: string, slug: string): string {
  const siteUrl = getPublicSiteUrl()
  const seg = LISTING_SEGMENT[categoryCode] ?? categoryCode
  return `${siteUrl}/${seg}/${slug}`
}

export function absoluteMediaUrl(siteUrl: string, storageKey: string): string {
  const rel = storageKeyToPublicUrl(storageKey.trim())
  if (!rel) return ''
  if (rel.startsWith('http://') || rel.startsWith('https://')) {
    return preferListingGalleryFullAsset(rel)
  }
  const base = siteUrl.replace(/\/$/, '')
  const path = rel.startsWith('/') ? rel : `/${rel}`
  return preferListingGalleryFullAsset(`${base}${path}`)
}

function workerHeaders(secret: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-travel-social-worker-secret': secret,
  }
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

export async function fetchSocialCaption(
  apiOrigin: string,
  secret: string,
  body: {
    listing_title: string
    listing_url: string
    network: string
    allow_ai_caption: boolean
    image_keys: string[]
  },
): Promise<string> {
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
  const data = (await res.json()) as { caption?: string }
  return (data.caption ?? '').trim()
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
): Promise<string> {
  const pageId = meta.page_id?.trim()
  const token = meta.page_access_token?.trim()
  if (!pageId || !token) throw new Error('facebook_not_configured')

  const fbRes = await fetch(`${FB_GRAPH}/${encodeURIComponent(pageId)}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, link: pageUrl, access_token: token }),
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

async function postInstagram(
  meta: NonNullable<SocialApiSettings['meta']>,
  caption: string,
  imageUrl: string,
): Promise<string> {
  const igId = meta.instagram_account_id?.trim()
  const token = meta.page_access_token?.trim()
  if (!igId || !token) throw new Error('instagram_not_configured')
  if (!imageUrl.startsWith('https://')) {
    throw new Error('instagram_requires_https_image')
  }

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
): Promise<{ ok: boolean; network: string; job_id: string; post_id?: string; error?: string }> {
  const pageUrl = listingPublicUrl(job.category_code, job.listing_slug)
  const firstImageKey = job.image_keys.find((k) => k.trim() !== '') ?? ''
  const imageUrl = absoluteMediaUrl(siteUrl, firstImageKey)

  let caption = (job.caption_ai_generated ?? '').trim()
  if (!caption) {
    caption = await fetchSocialCaption(apiOrigin, secret, {
      listing_title: job.listing_title,
      listing_url: pageUrl,
      network: job.network,
      allow_ai_caption: job.allow_ai_caption,
      image_keys: job.image_keys,
    })
  }

  try {
    let postId = ''
    switch (job.network) {
      case 'facebook':
        postId = await postFacebook(socialApi.meta ?? {}, caption, pageUrl)
        break
      case 'instagram':
        if (!imageUrl) throw new Error('instagram_image_required')
        postId = await postInstagram(socialApi.meta ?? {}, caption, imageUrl)
        break
      case 'pinterest':
        if (!imageUrl) throw new Error('pinterest_image_required')
        postId = await postPinterest(
          socialApi.pinterest ?? {},
          job.listing_title,
          caption,
          pageUrl,
          imageUrl,
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
    return { ok: true, network: job.network, job_id: job.id, post_id: postId }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    try {
      await patchSocialJob(apiOrigin, secret, job.id, {
        status: 'failed',
        error_message: msg.slice(0, 2000),
        caption_ai_generated: caption || undefined,
      })
    } catch {
      /* patch failure logged upstream */
    }
    return { ok: false, network: job.network, job_id: job.id, error: msg }
  }
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
  results: Array<{ ok: boolean; network: string; job_id: string; post_id?: string; error?: string }>
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

  for (const job of jobs) {
    const r = await processOneSocialJob(apiOrigin, secret, job, socialApi, siteUrl)
    results.push(r)
    if (r.ok) posted += 1
    else failed += 1
  }

  return { processed: jobs.length, posted, failed, results }
}
