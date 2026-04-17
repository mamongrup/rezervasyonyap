/** API `error` alanı — son kullanıcıya kısa, anlaşılır metin (teknik ayrıntı sunucu günlüğünde). */
export function formatAuthApiError(code: string): string {
  const m: Record<string, string> = {
    session_create_failed: 'Oturum açılamadı. Lütfen bir süre sonra tekrar deneyin. Sorun sürerse yöneticiye bildirin.',
    db_connection_failed: 'Sunucuya bağlanılamıyor. Lütfen daha sonra tekrar deneyin.',
    email_taken_or_invalid: 'Bu e-posta zaten kayıtlı veya kayıt geçersiz.',
    email_password_required: 'E-posta ve şifre gerekli.',
    invalid_credentials: 'E-posta veya şifre hatalı.',
    login_query_failed: 'Giriş şu an yapılamıyor. Lütfen bir süre sonra tekrar deneyin.',
    db_error: 'İşlem tamamlanamadı. Lütfen daha sonra tekrar deneyin.',
    token_create_failed: 'Şifre sıfırlama isteği gönderilemedi. Lütfen daha sonra tekrar deneyin.',
    NEXT_PUBLIC_API_URL_missing: 'Ön yüz yapılandırması eksik. Yöneticiye başvurun.',
  }
  return m[code] ?? code
}
