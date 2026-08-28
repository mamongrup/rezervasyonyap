/** İlan galerisi sahne kodları — backend `listing_images.scene_code` ile uyumlu */
export const LISTING_IMAGE_SCENE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Vitrin: otomatik (sıra)' },
  { value: 'exterior', label: 'Dış cephe / yapı' },
  { value: 'sea_view', label: 'Deniz / manzara' },
  { value: 'pool', label: 'Havuz' },
  { value: 'terrace', label: 'Teras / balkon' },
  { value: 'garden', label: 'Bahçe / açık alan' },
  { value: 'living', label: 'Salon / oturma' },
  { value: 'kitchen', label: 'Mutfak' },
  { value: 'dining', label: 'Yemek alanı' },
  { value: 'bedroom', label: 'Yatak odası' },
  { value: 'spa', label: 'Spa / jakuzi' },
  { value: 'sauna', label: 'Sauna' },
  { value: 'hammam', label: 'Hamam' },
  { value: 'bathroom', label: 'Banyo' },
  { value: 'detail', label: 'Detay / dekorasyon' },
  { value: 'unspecified', label: 'Diğer / etiketsiz' },
]

/** AI çıktısı için izinli kodlar (`''` yok — model boş dönerse unspecified kullanılır) */
export const LISTING_IMAGE_SCENE_AI_CODES = [
  'exterior',
  'sea_view',
  'pool',
  'terrace',
  'garden',
  'living',
  'kitchen',
  'dining',
  'bedroom',
  'bathroom',
  'spa',
  'sauna',
  'hammam',
  'detail',
  'unspecified',
] as const

export type ListingImageSceneAiCode = (typeof LISTING_IMAGE_SCENE_AI_CODES)[number]

export function isListingImageSceneAiCode(s: string): s is ListingImageSceneAiCode {
  return (LISTING_IMAGE_SCENE_AI_CODES as readonly string[]).includes(s)
}
