/**
 * Aktarımda Türkçe harfler ASCII `?` olmuş adres / konum / bölge metinlerini onarır.
 * Açıklama motoruyla aynı sözlük + sistematik onarım (Bay?nd?r → Bayındır vb.).
 * Sunucu migration 422 ile uyumlu.
 */
import { repairTurkishContentAscii } from '@/lib/repair-turkish-content-ascii'

export function repairTurkishLocationAscii(input: string | null | undefined): string {
  return repairTurkishContentAscii(input)
}
