/** CMS / JSON kaynaklarında video satırı şekli tutarsız olabildiği için tek forma çevirir. */

export type SectionVideosCoerced = {
  id: string
  title: string
  videoUrl: string
  thumbnail?: string
}

export function coerceSectionVideosConfig(raw: unknown): SectionVideosCoerced[] {
  if (!Array.isArray(raw)) return []
  const out: SectionVideosCoerced[] = []
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i]
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const videoUrl = String(
      o.videoUrl ?? o.video_url ?? o.url ?? o.link ?? o.href ?? o.embedUrl ?? o.embed ?? '',
    ).trim()
    if (!videoUrl) continue
    const title = String(o.title ?? o.label ?? '').trim() || `Video ${out.length + 1}`
    const id = String(o.id ?? '').trim() || `video-${i}`
    const thumbnail = typeof o.thumbnail === 'string' ? o.thumbnail.trim() || undefined : undefined
    out.push({ id, title, videoUrl, thumbnail })
  }
  return out
}
