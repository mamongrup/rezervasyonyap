/** Meta Page/User token süresi dolmuş veya iptal edilmiş — yeniden denemek işe yaramaz. */
export function isMetaAuthError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('error validating access token') ||
    m.includes('session has expired') ||
    m.includes('session has been invalidated') ||
    m.includes('password has been changed') ||
    m.includes('invalid oauth') ||
    m.includes('oauth exception') ||
    m.includes('(#190)') ||
    m.includes('meta_token_invalid') ||
    m.includes('meta_access_token_invalid') ||
    m.includes('facebook_page_token_invalid') ||
    m.includes('facebook_page_token_required') ||
    m.includes('facebook_page_token_mismatch') ||
    m.includes('erişim anahtarı geçersiz') ||
    m.includes('page access token yenileyin') ||
    m.includes('page access token kaydedin') ||
    (m.includes('access token') && (m.includes('expired') || m.includes('invalidated'))) ||
    m === 'invalid_session'
  )
}
