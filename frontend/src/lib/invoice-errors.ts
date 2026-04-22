/** Backend `error` alanı (JSON) veya mesaj gövdesi — kullanıcıya Türkçe metin. */
const TR: Record<string, string> = {
  nothing_to_invoice: 'Bu dönem ve para birimi için faturalanacak tahakkuk satırı yok.',
  invalid_currency: 'Geçersiz veya desteklenmeyen para birimi kodu.',
  mixed_currency:
    'Seçilen dönemde birden fazla para birimi var. Önce “Önizle” yapın ve tek bir PB (ör. TRY) belirtin.',
  already_cancelled: 'Bu fatura zaten iptal edilmiş.',
  cannot_cancel: 'Bu fatura iptal edilemiyor.',
  cannot_patch_notes: 'Not yalnızca kesilmiş (iptal edilmemiş) faturalarda güncellenebilir.',
  invoice_not_found: 'Fatura bulunamadı veya erişim yok.',
  list_invoices_failed: 'Fatura listesi alınamadı.',
  get_invoice_failed: 'Fatura detayı alınamadı.',
  cancel_status_failed: 'Fatura durumu okunamadı.',
  agency_invoices_400: 'İstek geçersiz.',
  supplier_invoices_400: 'İstek geçersiz.',
}

export function formatInvoiceApiError(message: string): string {
  const key = message.trim()
  if (TR[key]) return TR[key]
  if (/^\d{3}$/.test(key)) return `Sunucu yanıtı (${key}).`
  return key
}

export function invoiceErrorFromUnknown(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'İşlem başarısız'
  return formatInvoiceApiError(msg)
}
