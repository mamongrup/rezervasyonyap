import { describe, expect, it } from 'vitest'
import { roomGalleryFallback } from './hotel-room-gallery-fallback'

describe('roomGalleryFallback', () => {
  it('yalnızca oda olarak etiketlenen iç mekân görsellerini döndürür', () => {
    const result = roomGalleryFallback(
      [
        { storage_key: '/pool.jpg', alt_text_key: 'Pool' },
        { storage_key: '/room-1.jpg', alt_text_key: 'Room' },
        { storage_key: '/room-2.jpg', alt_text_key: 'Guest room' },
        { storage_key: '/bathroom.jpg', alt_text_key: 'Bathroom' },
        { storage_key: '/lobby.jpg', alt_text_key: 'Lobby' },
      ],
      '1 King bed',
    )

    expect(result).toHaveLength(3)
    expect(result).toContain('/room-1.jpg')
    expect(result).toContain('/room-2.jpg')
    expect(result).toContain('/bathroom.jpg')
    expect(result).not.toContain('/pool.jpg')
    expect(result).not.toContain('/lobby.jpg')
  })

  it('oda etiketi yoksa yanlış tesis fotoğrafı kullanmaz', () => {
    expect(
      roomGalleryFallback(
        [
          { storage_key: '/pool.jpg', alt_text_key: 'Pool' },
          { storage_key: '/lobby.jpg', alt_text_key: 'Lobby' },
        ],
        'Standard room',
      ),
    ).toEqual([])
  })
})
