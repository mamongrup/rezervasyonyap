export type LegalFaqCategoryId =
  | 'general'
  | 'booking'
  | 'payment'
  | 'cancellation'
  | 'hotels'
  | 'villas'
  | 'tours'
  | 'yachts'
  | 'transport'
  | 'visa'
  | 'account'
  | 'privacy'
  | 'partners'

export type LegalFaqItem = { q: string; a: string }

export type LegalFaqCategory = {
  id: LegalFaqCategoryId
  title: string
  description: string
  items: LegalFaqItem[]
}

export type LegalFaqBundle = {
  metaTitle: string
  metaDescription: string
  pageTitle: string
  pageLead: string
  categoriesHeading: string
  backToCategories: string
  openCategory: string
  questionsCount: string
  categories: LegalFaqCategory[]
}
