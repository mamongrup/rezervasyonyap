import { INDEXNOW_KEY } from '@/lib/seo/indexnow'

export const dynamic = 'force-static'

export async function GET() {
  return new Response(INDEXNOW_KEY, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
