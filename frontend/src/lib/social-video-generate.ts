/**
 * İlan galeri fotoğraflarından Instagram Reels için 9:16 slayt videosu üretimi.
 * Sunucuda `ffmpeg-static` binary'si ile çalışır; ekstra sistem paketi gerekmez.
 */

import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import ffmpegPath from 'ffmpeg-static'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)

const OUTPUT_WIDTH = 1080
const OUTPUT_HEIGHT = 1920
const SECONDS_PER_IMAGE = 3.2
const FPS = 25
const MAX_IMAGES = 6
const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads', 'social-reels')

function safeSlug(raw: string): string {
  return (
    raw
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'listing'
  )
}

function resolvedFfmpegPath(): string {
  const bin = (ffmpegPath ?? '').toString().trim()
  if (!bin) throw new Error('social_reel_ffmpeg_binary_missing')
  return bin
}

async function runFfmpeg(args: string[]): Promise<void> {
  await execFileAsync(resolvedFfmpegPath(), args, { maxBuffer: 1024 * 1024 * 64 })
}

async function downloadImageAsPortraitJpeg(url: string, destPath: string): Promise<void> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`social_reel_image_fetch_${res.status}`)
  const raw = Buffer.from(await res.arrayBuffer())
  const jpeg = await sharp(raw)
    .rotate()
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: 'cover' })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer()
  await fs.writeFile(destPath, jpeg)
}

/** Tek görselden Ken Burns (yavaş yakınlaşma) efektli sabit-süreli video segmenti üretir. */
async function buildZoomSegment(imagePath: string, segmentPath: string): Promise<void> {
  const frames = Math.round(SECONDS_PER_IMAGE * FPS)
  // Zoompan'ın küçük kaynaklarda titremesini önlemek için önce 3x büyütülür (bilinen ffmpeg iş akışı).
  const filter =
    `scale=${OUTPUT_WIDTH * 3}:${OUTPUT_HEIGHT * 3},` +
    `zoompan=z='min(zoom+0.0015,1.2)':d=${frames}:s=${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}:fps=${FPS}`
  await runFfmpeg([
    '-y',
    '-loop', '1',
    '-i', imagePath,
    '-vf', filter,
    '-t', String(SECONDS_PER_IMAGE),
    '-pix_fmt', 'yuv420p',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-profile:v', 'high',
    segmentPath,
  ])
}

async function concatSegments(segmentPaths: string[], listFile: string, outPath: string): Promise<void> {
  const listContent = segmentPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join('\n')
  await fs.writeFile(listFile, listContent)
  await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outPath])
}

async function addSilentAudioTrack(videoOnlyPath: string, finalPath: string): Promise<void> {
  await runFfmpeg([
    '-y',
    '-i', videoOnlyPath,
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-shortest',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    finalPath,
  ])
}

/**
 * İlan galeri görsellerinden 9:16 sessiz slayt videosu üretir ve buffer olarak döner.
 * `imageUrls` genel erişime açık https URL'ler olmalı (Meta ile aynı gereksinim).
 */
export async function generateSlideshowReelBuffer(imageUrls: string[]): Promise<Buffer> {
  const urls = imageUrls.filter((u) => u.startsWith('https://')).slice(0, MAX_IMAGES)
  if (urls.length === 0) throw new Error('social_reel_images_required')

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'social-reel-'))
  try {
    const segmentPaths: string[] = []
    for (let i = 0; i < urls.length; i += 1) {
      const imgPath = path.join(workDir, `src-${i}.jpg`)
      await downloadImageAsPortraitJpeg(urls[i], imgPath)
      const segPath = path.join(workDir, `seg-${i}.mp4`)
      await buildZoomSegment(imgPath, segPath)
      segmentPaths.push(segPath)
    }

    const listFile = path.join(workDir, 'concat.txt')
    const videoOnlyPath = path.join(workDir, 'video-only.mp4')
    await concatSegments(segmentPaths, listFile, videoOnlyPath)

    const finalPath = path.join(workDir, 'final.mp4')
    await addSilentAudioTrack(videoOnlyPath, finalPath)

    return await fs.readFile(finalPath)
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

/**
 * Slayt videosunu üretir, `public/uploads/social-reels/<slug>/` altına yazar ve
 * `{siteUrl}/uploads/...` biçiminde herkese açık HTTPS URL döner (Meta bu URL'i çeker).
 */
export async function generateAndStoreListingReelVideo(
  siteUrl: string,
  listingSlug: string,
  imageUrls: string[],
): Promise<string> {
  const buffer = await generateSlideshowReelBuffer(imageUrls)
  const slug = safeSlug(listingSlug)
  const dir = path.join(UPLOADS_ROOT, slug)
  await fs.mkdir(dir, { recursive: true })
  const name = `reel-${Date.now()}.mp4`
  await fs.writeFile(path.join(dir, name), buffer)
  const base = siteUrl.replace(/\/$/, '')
  return `${base}/uploads/social-reels/${slug}/${name}`
}
