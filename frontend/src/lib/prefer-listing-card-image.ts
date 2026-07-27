/**
 * Vitrin kartı kapak URL’si.
 *
 * Sağlayıcının verdiği doğrulanmış URL'yi değiştirmiyoruz. Bookeder
 * `Photos/Big` adreslerini `Photos/Medium` olarak tahmin etmek bazı tesislerde
 * var olmayan bir dosyaya gidiyor ve kartı boş bırakıyordu.
 */
export function preferListingCardImageUrl(url: string): string {
  return (url ?? '').trim()
}
