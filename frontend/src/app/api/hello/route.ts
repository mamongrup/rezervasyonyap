/** Şablon uç noktası — üretimde kapalı (bilgi sızdırma / gereksiz yüzey). */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 })
  }
  return new Response('Hello, Next.js!')
}
