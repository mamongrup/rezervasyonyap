import { describe, expect, it } from 'vitest'
import {
  cleanTatilbudurDescriptionHtml,
  hasTatilbudurDescriptionJunk,
  stripHotelAmenitiesFromDescriptionHtml,
} from '@/lib/tatilbudur-description-clean'

describe('tatilbudur-description-clean', () => {
  it('cuts Fiyat Tablosu chrome and broken tab links', () => {
    const raw = `<p>Otopark notu geçerli.</p>
<h3>Önemli Notlar</h3>
<p>× #### Fiyat Tablosu Yetişkin ve çocuk dahil gecelik oda fiyatlarıdır.</p>
<p>Oda Müsaitlik Takvimi</p>
<p>Queens Park Göynük</p>
<p>*   ;) *   ;) *   ;)</p>
<p>Genel](https://www.tatilbudur.com/queens-park-goynuk)Plaj & Havuz](https://www.tatilbudur.com/queens-park-goynuk)</p>`

    expect(hasTatilbudurDescriptionJunk(raw)).toBe(true)
    const cleaned = cleanTatilbudurDescriptionHtml(raw)
    expect(cleaned).toContain('Otopark notu geçerli')
    expect(cleaned).not.toMatch(/Fiyat Tablosu/i)
    expect(cleaned).not.toMatch(/Oda Müsaitlik/i)
    expect(cleaned).not.toMatch(/Genel\]\(/)
    expect(cleaned).not.toMatch(/tatilbudur\.com/)
    expect(cleaned).not.toMatch(/\*;\)/)
  })

  it('leaves clean concept HTML untouched', () => {
    const raw = `<p><strong>Konsept:</strong> Ultra Her Şey Dahil</p>
<h3>Konsept Özellikleri</h3>
<p>Kahvaltı (07:00 ile 10:00 saatleri arasında)</p>`
    expect(hasTatilbudurDescriptionJunk(raw)).toBe(false)
    expect(cleanTatilbudurDescriptionHtml(raw)).toBe(raw)
  })

  it('removes the flat amenities section while preserving following hotel content', () => {
    const raw = `<h2>Konaklama</h2><p>Her Şey Dahil.</p>
<h2>Olanaklar</h2><ul><li>Otopark</li><li>24 saat resepsiyon</li></ul>
<h2>Çocuk Politikası</h2><p>0-6 yaş ücretsiz.</p>`

    const cleaned = stripHotelAmenitiesFromDescriptionHtml(raw)
    expect(cleaned).toContain('<h2>Konaklama</h2>')
    expect(cleaned).not.toContain('Olanaklar')
    expect(cleaned).not.toContain('Otopark')
    expect(cleaned).toContain('<h2>Çocuk Politikası</h2>')
  })
})
