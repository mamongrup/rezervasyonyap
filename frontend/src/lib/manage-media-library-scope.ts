import type { ManageMediaPickerUploadTarget } from '@/lib/manage-upload-image-form'

export function normalizeMediaPath(raw: string | null | undefined): string {
  return (raw ?? '')
    .trim()
    .replace(/^[\\/]+|[\\/]+$/g, '')
    .split(/[\\/]+/)
    .filter((s) => s && s !== '.' && s !== '..')
    .join('/')
}

export function mediaUploadBasePath(target: Pick<ManageMediaPickerUploadTarget, 'folder' | 'subPath'>): string {
  const top = target.folder.trim()
  const sub = normalizeMediaPath(target.subPath)
  return sub ? `${top}/${sub}` : top
}

export function mediaBrowseAllowed(libraryBase: string, browsePrefix: string): boolean {
  if (!libraryBase) return true
  return browsePrefix === libraryBase || browsePrefix.startsWith(`${libraryBase}/`)
}

function mediaDirname(relPath: string): string {
  const i = relPath.lastIndexOf('/')
  return i === -1 ? '' : relPath.slice(0, i)
}

export function defaultMediaLibraryRootForTarget(
  target: Pick<ManageMediaPickerUploadTarget, 'folder' | 'subPath'>,
): string | undefined {
  const folder = target.folder.trim()
  const sub = normalizeMediaPath(target.subPath)
  if (folder === 'site' && sub.startsWith('page-builder/')) return 'site/page-builder'
  if (folder === 'site' && sub.startsWith('vitrin-kategori/')) return 'site/vitrin-kategori'
  return undefined
}

export function resolveMediaLibraryBase(
  target: Pick<ManageMediaPickerUploadTarget, 'folder' | 'subPath'>,
  libraryRoot?: string,
): string {
  const uploadBase = mediaUploadBasePath(target)
  if (libraryRoot?.trim() === '/') return ''
  const normalized = normalizeMediaPath(libraryRoot) || defaultMediaLibraryRootForTarget(target)
  return normalized && mediaBrowseAllowed(normalized, uploadBase) ? normalized : uploadBase
}

export function initialMediaBrowsePrefix(
  target: Pick<ManageMediaPickerUploadTarget, 'folder' | 'subPath'>,
  libraryRoot?: string,
): string {
  const uploadBase = mediaUploadBasePath(target)
  const libraryBase = resolveMediaLibraryBase(target, libraryRoot)
  return mediaBrowseAllowed(libraryBase, uploadBase) ? uploadBase : libraryBase
}

export function mediaCanBrowseUp(libraryBase: string, browsePrefix: string): boolean {
  return mediaBrowseAllowed(libraryBase, browsePrefix) && browsePrefix !== libraryBase
}

export function parentMediaBrowsePrefix(libraryBase: string, browsePrefix: string): string {
  const parent = mediaDirname(browsePrefix)
  return mediaBrowseAllowed(libraryBase, parent) ? parent || libraryBase : libraryBase
}
