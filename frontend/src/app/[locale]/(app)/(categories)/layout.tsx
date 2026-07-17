import type { ReactNode } from 'react'

// Tüm kategori sayfalarında statik/ISR dengesi:
// - İlk açılış hızlı
// - Arka planda düzenli yenileme
// 60s çok sıktı: her kategori/locale/filtre kombinasyonu dakikada bir tüm
// fetch'leri + snapshot'ları diske yeniden yazıyordu (yüksek disk I/O). 300s.
export const revalidate = 300

export default function CategoriesLayout({ children }: { children: ReactNode }) {
  return children
}
