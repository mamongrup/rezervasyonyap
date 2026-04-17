import type { ReactNode } from 'react'

// Tüm kategori sayfalarında statik/ISR dengesi:
// - İlk açılış hızlı
// - Arka planda düzenli yenileme
export const revalidate = 60

export default function CategoriesLayout({ children }: { children: ReactNode }) {
  return children
}
