export function shareJpegUrl(siteUrl: string, source: string): string {
  if (!source.startsWith('https://')) return ''
  return `${siteUrl.replace(/\/$/, '')}/api/social/share-jpeg?src=${encodeURIComponent(source)}`
}

export async function probeShareImage(url: string, fetchImpl: typeof fetch = fetch): Promise<{ ok: boolean; error: string }> {
  if (!url.startsWith('https://')) return { ok: false, error: 'invalid_https_url' }
  try {
    const response = await fetchImpl(url, { cache: 'no-store', signal: AbortSignal.timeout(25000) })
    const type = response.headers.get('content-type') ?? ''
    if (response.ok && type.toLowerCase().includes('image/jpeg')) {
      await response.body?.cancel()
      return { ok: true, error: '' }
    }
    // Only expose our own bounded error codes, never upstream text/URLs/tokens.
    let code = ''
    if (type.includes('application/json')) {
      const data = await response.json().catch(() => ({}))
      if (typeof data.error === 'string' && /^(social_share_[a-z_]+|invalid_social_share_image_src)$/.test(data.error)) code = `_${data.error}`
      if (Number.isInteger(data.upstream_status) && data.upstream_status >= 100 && data.upstream_status <= 599) code += `_upstream_${data.upstream_status}`
    } else {
      await response.body?.cancel()
    }
    return { ok: false, error: `http_${response.status}${code}${response.ok ? '_not_jpeg' : ''}` }
  } catch {
    return { ok: false, error: 'network_or_timeout' }
  }
}

/** Try the stored cover, then the same listing's dynamic branded cover. Never use another listing or an unbranded gallery photo. */
export async function resolveSocialCover(siteUrl: string, sources: string[], fetchImpl: typeof fetch = fetch) {
  const errors: string[] = []
  for (const source of [...new Set(sources.filter(Boolean))]) {
    const url = shareJpegUrl(siteUrl, source)
    const probe = await probeShareImage(url, fetchImpl)
    if (probe.ok) return { url, source, error: '' }
    errors.push(probe.error)
  }
  return { url: '', source: '', error: `social_cover_unavailable:${errors.join(',') || 'missing_cover_url'}` }
}
