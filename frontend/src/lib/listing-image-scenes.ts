/** İlan galerisi sahne kodları — backend `listing_images.scene_code` ile uyumlu */
export const LISTING_IMAGE_SCENE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Vitrin: otomatik (sıra)' },
  { value: 'sea_view', label: 'Deniz / manzara' },
  { value: 'pool', label: 'Havuz' },
  { value: 'living', label: 'Salon / oturma' },
  { value: 'bedroom', label: 'Yatak odası' },
  { value: 'sauna', label: 'Sauna' },
  { value: 'hammam', label: 'Hamam' },
  { value: 'bathroom', label: 'Banyo' },
  { value: 'unspecified', label: 'Diğer / etiketsiz' },
]

/** AI çıktısı için izinli kodlar (`''` yok — model boş dönerse unspecified kullanılır) */
export const LISTING_IMAGE_SCENE_AI_CODES = [
  'sea_view',
  'pool',
  'living',
  'bedroom',
  'bathroom',
  'sauna',
  'hammam',
  'unspecified',
] as const

export type ListingImageSceneAiCode = (typeof LISTING_IMAGE_SCENE_AI_CODES)[number]

export function isListingImageSceneAiCode(s: string): s is ListingImageSceneAiCode {
  return (LISTING_IMAGE_SCENE_AI_CODES as readonly string[]).includes(s)
}
