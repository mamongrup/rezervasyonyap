import { ImageResponse } from 'next/og'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AD_W = 1080
const AD_H = 1080

const BACKGROUND_IMAGE_URL =
  'https://images.unsplash.com/photo-1507525428034-b723cf961fac?q=90&w=1600&auto=format&fit=crop'

const COLORS = {
  deepNavy: '#082C4C',
  royalBlue: '#0F4C81',
  turquoise: '#20C5D8',
  luxuryGold: '#D4AF37',
  white: '#FFFFFF',
  softWhite: 'rgba(255,255,255,0.78)',
  glass: 'rgba(8,44,76,0.88)',
}

function getAdBranding() {
  return {
    phone: '+90 532 397 7957',
    website: 'rezervasyonyap.tr',
  }
}

async function imageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const input = Buffer.from(await res.arrayBuffer())
    const output = await sharp(input)
      .resize({ width: AD_W, height: AD_H, fit: 'cover' })
      .png()
      .toBuffer()
    return `data:image/png;base64,${output.toString('base64')}`
  } catch {
    return null
  }
}

export async function GET() {
  const branding = getAdBranding()
  const bg = await imageDataUrl(BACKGROUND_IMAGE_URL)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: COLORS.white,
          background: `linear-gradient(135deg, ${COLORS.deepNavy}, ${COLORS.royalBlue})`,
        }}
      >
        {bg ? (
          <img
            src={bg}
            alt=""
            width={AD_W}
            height={AD_H}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background:
              'linear-gradient(90deg, rgba(8,44,76,0.98) 0%, rgba(8,44,76,0.84) 36%, rgba(8,44,76,0.28) 58%, rgba(8,44,76,0.02) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 490,
            height: '100%',
            display: 'flex',
            background: `linear-gradient(135deg, ${COLORS.glass}, rgba(15,76,129,0.82))`,
            borderRight: '1px solid rgba(255,255,255,0.18)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 420,
            top: 0,
            width: 160,
            height: '100%',
            display: 'flex',
            background: `linear-gradient(90deg, ${COLORS.glass} 0%, rgba(8,44,76,0.45) 42%, rgba(8,44,76,0) 100%)`,
            borderTopRightRadius: 999,
            borderBottomRightRadius: 999,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 50,
            top: 50,
            width: 390,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${COLORS.luxuryGold}, #f4d77b)`,
                color: COLORS.deepNavy,
                fontSize: 26,
                fontWeight: 900,
              }}
            >
              ✈
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
              <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: 0.5 }}>LOGO</span>
              <span style={{ color: COLORS.softWhite, fontSize: 13, fontWeight: 700, letterSpacing: 1.8 }}>
                LUXURY TRAVEL AGENCY
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', height: 120 }} />

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{ color: COLORS.luxuryGold, fontSize: 40, fontStyle: 'italic', fontWeight: 500, lineHeight: 1 }}
            >
              HAYALİNDEKİ
            </div>
            <div style={{ color: COLORS.white, fontSize: 96, fontWeight: 900, letterSpacing: 2, lineHeight: 0.94 }}>
              TATİL
            </div>
            <div
              style={{
                fontSize: 37,
                fontWeight: 900,
                color: COLORS.turquoise,
                letterSpacing: 1.5,
                lineHeight: 1,
              }}
            >
              SENİ BEKLİYOR!
            </div>
            <div
              style={{
                width: 92,
                height: 2,
                display: 'flex',
                marginTop: 28,
                background: COLORS.luxuryGold,
              }}
            />
            <div
              style={{
                marginTop: 24,
                color: COLORS.softWhite,
                fontSize: 20,
                lineHeight: 1.42,
                fontWeight: 500,
              }}
            >
              Eşsiz rotalar, konforlu konaklama ve unutulmaz anılar için yanınızdayız.
            </div>
            <div
              style={{
                marginTop: 42,
                width: 300,
                height: 58,
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(90deg, ${COLORS.luxuryGold}, #f0cf68)`,
                color: COLORS.deepNavy,
                fontSize: 19,
                fontWeight: 900,
                letterSpacing: 1,
                boxShadow: '0 18px 36px rgba(0,0,0,0.28)',
              }}
            >
              REZERVASYON YAP
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 50,
            bottom: 58,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: COLORS.luxuryGold,
                color: COLORS.deepNavy,
                fontSize: 14,
              }}
            >
              ☎
            </div>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{branding.phone}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: COLORS.luxuryGold,
                color: COLORS.deepNavy,
                fontSize: 14,
              }}
            >
              🌐
            </div>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{branding.website}</span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 92,
            top: 78,
            width: 180,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ width: 122, height: 2, display: 'flex', borderTop: '2px dashed rgba(255,255,255,0.68)' }} />
          <span style={{ color: COLORS.white, fontSize: 28 }}>✈</span>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 410,
            bottom: 112,
            width: 126,
            height: 126,
            borderRadius: 999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.14)',
            border: `2px solid ${COLORS.luxuryGold}`,
          }}
        >
          <span style={{ color: COLORS.white, fontSize: 28 }}>✈</span>
          <span style={{ color: COLORS.white, fontSize: 12, fontWeight: 900, letterSpacing: 1.2, marginTop: 4 }}>
            TIME TO TRAVEL
          </span>
        </div>
      </div>
    ),
    {
      width: AD_W,
      height: AD_H,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  )
}
