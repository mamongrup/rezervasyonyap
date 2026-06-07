/**
 * İlan görsel yolları — frontend/src/lib/upload-media-paths.ts ile uyumlu.
 * Örnek: uploads/listings/ilanlar/yatlar/grand-sailor-bs-58/00-photo.avif
 */

import path from 'node:path'

function transliterateTr(s) {
  return String(s)
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/İ/g, 'i')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/I/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\u0307/g, '')
    .normalize('NFC')
}

export function listingCategoryFolder(code) {
  const k = String(code || '').trim().toLowerCase()
  const map = {
    hotel: 'oteller',
    holiday_home: 'tatil-evleri',
    yacht_charter: 'yatlar',
    car_rental: 'arac-kiralama',
    tour: 'turlar',
    activity: 'aktiviteler',
    flight: 'ucuslar',
    transfer: 'transferler',
    ferry: 'feribotlar',
    cruise: 'gemi-turlari',
    visa: 'vizeler',
    cinema_ticket: 'sinema',
    beach_lounger: 'plaj-sezlong',
  }
  return map[k] ?? k.replace(/_/g, '-')
}

export function slugifyMediaSegment(s) {
  return (
    transliterateTr(String(s || '').trim())
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 96) || 'item'
  )
}

/** `ilanlar/yatlar/slug` — uploads/listings öneki hariç */
export function listingImageSubPath(categoryCode, listingSlug) {
  const b = slugifyMediaSegment(listingSlug)
  const cat = listingCategoryFolder(categoryCode)
  return `ilanlar/${cat}/${b}`
}

export function listingStoragePrefix(categoryCode, listingSlug) {
  return `uploads/listings/${listingImageSubPath(categoryCode, listingSlug)}`
}

export function listingStorageKey(categoryCode, listingSlug, fileName) {
  return `${listingStoragePrefix(categoryCode, listingSlug)}/${fileName}`
}

export function listingUploadDir(uploadsRoot, categoryCode, listingSlug) {
  const sub = listingImageSubPath(categoryCode, listingSlug)
  return path.join(uploadsRoot, ...sub.split('/'))
}

export function resolveListingMediaSubPath({ categoryCode, slug, mediaSubPath } = {}) {
  if (mediaSubPath) return String(mediaSubPath).replace(/^\/+|\/+$/g, '')
  if (!categoryCode || !slug) return slugifyMediaSegment(slug || 'item')
  return listingImageSubPath(categoryCode, slug)
}

/** Eski yolları `ilanlar/{kategori}/{slug}/` önekine çevirir (dosya adı korunur). */
export function remapStorageKey(oldKey, categoryCode, listingSlug) {
  const key = String(oldKey || '').trim().replace(/^\/+/, '')
  if (!key.startsWith('uploads/listings/')) return key
  const targetPrefix = `${listingStoragePrefix(categoryCode, listingSlug)}/`
  if (key.startsWith(targetPrefix)) return key
  const fileName = key.split('/').pop()
  if (!fileName) return key
  const cat = listingCategoryFolder(categoryCode)
  const slugSeg = slugifyMediaSegment(listingSlug)
  const withoutIlanlar = `uploads/listings/${cat}/${slugSeg}/`
  if (key.startsWith(withoutIlanlar)) return `${targetPrefix}${fileName}`
  return `${targetPrefix}${fileName}`
}

export function remapPublicUploadUrl(url, categoryCode, listingSlug) {
  const raw = String(url || '').trim()
  if (!raw || raw.startsWith('http://') || raw.startsWith('https://')) return raw
  const noLead = raw.replace(/^\/+/, '')
  if (!noLead.startsWith('uploads/listings/')) return raw
  const q = noLead.indexOf('?')
  const pathOnly = q === -1 ? noLead : noLead.slice(0, q)
  const suffix = q === -1 ? '' : noLead.slice(q)
  const fileName = pathOnly.split('/').pop()
  if (!fileName) return raw
  const newKey = listingStorageKey(categoryCode, listingSlug, fileName)
  return `/${newKey}${suffix}`
}
