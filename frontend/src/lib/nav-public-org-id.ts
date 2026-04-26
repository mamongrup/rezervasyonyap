/**
 * Public navigasyon API'si (`…/navigation/public/menus/.../items`) için isteğe bağlı kurum.
 * Veritabanında `hero_search` (veya header) hem `organization_id IS NULL` hem de belirli bir
 * kuruma bağlı iki satır varsa, önyüz varsayılan olarak **global** menüyü okur; panelde
 * kuruma özel menüyü düzenliyorsanız bu env ile aynı UUID'yi verin.
 */
export function getPublicNavigationOrganizationId(): string | undefined {
  const o = process.env.NEXT_PUBLIC_NAVIGATION_ORGANIZATION_ID?.trim()
  return o || undefined
}
