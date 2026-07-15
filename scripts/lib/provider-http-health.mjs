export function detailHttpStatus(error) {
  const message = `${error?.message ?? ''} ${error?.cause?.message ?? ''}`
  const match = message.match(/Detay HTTP\s+(\d{3})/i)
  return match ? Number(match[1]) : 0
}

export function nextProviderHttpHealth(previousConsecutive400, error, threshold = 3) {
  const status = detailHttpStatus(error)
  const consecutive400 = status === 400 ? Number(previousConsecutive400 || 0) + 1 : 0
  const immediateProviderFailure = status === 403 || status === 408 || status === 429 || status >= 500
  return {
    status,
    consecutive400,
    shouldPause: immediateProviderFailure || consecutive400 >= threshold,
  }
}
