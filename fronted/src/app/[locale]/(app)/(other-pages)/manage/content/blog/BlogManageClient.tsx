'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  createBlogCategory,
  createBlogPost,
  listBlogCategories,
  listBlogPosts,
  patchBlogCategory,
  deleteBlogPost,
  type BlogCategory,
  type BlogPost,
} from '@/lib/travel-api'
import clsx from 'clsx'
import {
  Calendar,
  Eye,
  EyeOff,
  FileText,
  FolderPlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Tag,
  Trash2,
  X,
  Image as ImageIcon,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import Link from 'next/link'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ImageUpload from '@/components/editor/ImageUpload'
import { slugifyMediaSegment } from '@/lib/upload-media-paths'

const LOCALES = ['tr', 'en', 'de', 'ru', 'zh', 'fr']

function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Category Edit Modal ──────────────────────────────────────────────────────
function CategoryEditModal({
  category,
  token,
  onClose,
  onSaved,
}: {
  category: BlogCategory | null
  token: string
  onClose: () => void
  onSaved: () => void
}) {
  const [slug, setSlug] = useState(category?.slug ?? '')
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [imageUrl, setImageUrl] = useState(category?.image_url ?? '')
  const [metaTitle, setMetaTitle] = useState(category?.meta_title ?? '')
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? 0)
  const [isActive, setIsActive] = useState(category?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isNew = !category

  const handleSave = async () => {
    if (!slug.trim()) { setError('Slug gerekli'); return }
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        await createBlogCategory(token, { slug: slug.trim(), name: name || undefined })
      } else {
        await patchBlogCategory(token, category.id, {
          slug: slug.trim(),
          name: name || null,
          description: description || null,
          image_url: imageUrl || null,
          meta_title: metaTitle || null,
          sort_order: sortOrder,
          is_active: isActive,
        })
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 shadow-xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold">
            {isNew ? 'Yeni Kategori' : 'Kategori Düzenle'}
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Adı</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (isNew) setSlug(toSlug(e.target.value))
              }}
              placeholder="Seyahat İpuçları"
              className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug (URL Yolu)</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="seyahat-ipuclari"
              className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Açıklama</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {!isNew && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Kategori Resmi</label>
                <ImageUpload
                  value={imageUrl}
                  onChange={setImageUrl}
                  folder="blog"
                  subPath={slug.trim() ? `categories/${slugifyMediaSegment(slug)}` : 'categories/yeni'}
                  prefix={slug.trim() ? slugifyMediaSegment(slug) : 'kategori'}
                  aspectRatio="16/9"
                  compact
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SEO Başlığı</label>
                <input
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sıralama</span>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-20 border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-center"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Aktif</span>
                <button
                  onClick={() => setIsActive((v) => !v)}
                  className={clsx('transition-colors', isActive ? 'text-green-500' : 'text-neutral-400')}
                >
                  {isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BlogManageClient() {
  const vitrinPath = useVitrinHref()

  const [token, setToken] = useState('')
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingCats, setLoadingCats] = useState(true)
  const [tab, setTab] = useState<'posts' | 'categories'>('categories')
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all')
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<BlogCategory | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newPostTitle, setNewPostTitle] = useState('')
  const [newPostSlug, setNewPostSlug] = useState('')
  const [newPostSlugEdited, setNewPostSlugEdited] = useState(false)
  const [newPostCat, setNewPostCat] = useState('')
  const [creatingPost, setCreatingPost] = useState(false)
  const [newPostError, setNewPostError] = useState<string | null>(null)
  const [newPostOpen, setNewPostOpen] = useState(false)
  useEffect(() => {
    setToken(getStoredAuthToken() ?? '')
  }, [])

  const loadCategories = useCallback(() => {
    setLoadingCats(true)
    listBlogCategories()
      .then((r) => setCategories(r.categories))
      .catch(() => {})
      .finally(() => setLoadingCats(false))
  }, [])

  const loadPosts = useCallback(() => {
    if (!token) return
    setLoadingPosts(true)
    listBlogPosts({ token, published_only: false })
      .then((r) => setPosts(r.posts))
      .catch(() => {})
      .finally(() => setLoadingPosts(false))
  }, [token])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    if (token) loadPosts()
  }, [token, loadPosts])

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (filterCat && p.category_id !== filterCat) return false
      if (filterStatus === 'published' && !p.published_at) return false
      if (filterStatus === 'draft' && p.published_at) return false
      if (search) {
        const s = search.toLowerCase()
        const matchSlug = p.slug.toLowerCase().includes(s)
        const matchTitle = p.title ? p.title.toLowerCase().includes(s) : false
        if (!matchSlug && !matchTitle) return false
      }
      return true
    })
  }, [posts, filterCat, filterStatus, search])

  const handleDeletePost = async (id: string) => {
    if (!confirm('Bu yazıyı silmek istediğinizden emin misiniz?')) return
    setDeleting(id)
    try {
      await deleteBlogPost(token, id)
      setPosts((prev) => prev.filter((p) => p.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silinemedi')
    } finally {
      setDeleting(null)
    }
  }

  const handleCreatePost = async () => {
    if (!newPostSlug.trim()) { setNewPostError('Başlık (ve URL yolu) gerekli'); return }
    setCreatingPost(true)
    setNewPostError(null)
    try {
      const res = await createBlogPost(token, {
        slug: newPostSlug.trim(),
        category_id: newPostCat || undefined,
      })
      setNewPostOpen(false)
      setNewPostTitle('')
      setNewPostSlug('')
      setNewPostSlugEdited(false)
      setNewPostCat('')
      window.location.href = vitrinPath(`/manage/content/blog/${res.id}`)
    } catch (e) {
      setNewPostError(e instanceof Error ? e.message : 'Oluşturulamadı')
    } finally {
      setCreatingPost(false)
    }
  }

  const catMap = useMemo(() => {
    const m: Record<string, BlogCategory> = {}
    for (const c of categories) m[c.id] = c
    return m
  }, [categories])

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Blog Yönetimi</h1>
            <p className="text-sm text-neutral-500 mt-1">
              {posts.length} yazı · {categories.length} kategori
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { loadPosts(); loadCategories() }}
              className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setNewPostOpen(true); setNewPostTitle(''); setNewPostSlug(''); setNewPostSlugEdited(false); setNewPostCat(''); setNewPostError(null) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Yeni Yazı
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-neutral-900 rounded-2xl p-1 shadow-sm border border-neutral-200 dark:border-neutral-800 w-fit">
          {[
            { key: 'posts', label: 'Yazılar', icon: FileText },
            { key: 'categories', label: 'Kategoriler', icon: Tag },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as 'posts' | 'categories')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                tab === key
                  ? 'bg-primary-600 text-white'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Posts Tab */}
        {tab === 'posts' && (
          <div className="space-y-4">
            {/* No categories warning */}
            {!loadingCats && categories.length === 0 && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <Tag className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div className="flex-1 text-sm text-amber-700 dark:text-amber-300">
                  <span className="font-medium">Kategori bulunamadı.</span> Yazı oluşturmadan önce en az bir kategori eklemeniz önerilir.
                </div>
                <button
                  onClick={() => setTab('categories')}
                  className="px-3 py-1.5 rounded-xl text-sm bg-amber-600 text-white hover:bg-amber-700 whitespace-nowrap"
                >
                  Kategori ekle
                </button>
              </div>
            )}
            {/* Filters */}
            <div className="flex flex-wrap gap-3 bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Başlık veya slug ile ara…"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 focus:outline-none"
              >
                <option value="">Tüm kategoriler</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name ?? c.slug}</option>
                ))}
              </select>
              <div className="flex gap-1 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                {[
                  { key: 'all', label: 'Tümü' },
                  { key: 'published', label: 'Yayında' },
                  { key: 'draft', label: 'Taslak' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(key as typeof filterStatus)}
                    className={clsx(
                      'px-3 py-2 text-sm transition-colors',
                      filterStatus === key
                        ? 'bg-primary-600 text-white'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Posts List */}
            {loadingPosts ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <FileText className="w-12 h-12 text-neutral-300" />
                <p className="text-neutral-500">Henüz blog yazısı yok</p>
                <button
                  onClick={() => setNewPostOpen(true)}
                  className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm"
                >
                  İlk yazıyı oluştur
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                      <th className="px-4 py-3 text-left font-medium text-neutral-500">Başlık / Slug</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-500 hidden md:table-cell">Kategori</th>
                      <th className="px-4 py-3 text-center font-medium text-neutral-500 hidden sm:table-cell">Durum</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-500 hidden lg:table-cell">Tarih</th>
                      <th className="px-4 py-3 text-right font-medium text-neutral-500">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {filteredPosts.map((post) => {
                      const cat = post.category_id ? catMap[post.category_id] : null
                      const isPublished = !!post.published_at
                      return (
                        <tr key={post.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {post.featured_image_url ? (
                                <img
                                  src={post.featured_image_url}
                                  alt=""
                                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                                  <ImageIcon className="w-5 h-5 text-neutral-400" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-neutral-900 dark:text-white truncate max-w-[200px]">
                                  {post.title ?? post.slug}
                                </div>
                                <div className="text-xs text-neutral-400 font-mono">{post.slug}</div>
                                {post.read_time_minutes && (
                                  <div className="text-xs text-neutral-400">{post.read_time_minutes} dk okuma</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {cat ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300">
                                <Tag className="w-3 h-3" />
                                {cat.name ?? cat.slug}
                              </span>
                            ) : (
                              <span className="text-neutral-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-center">
                            {isPublished ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                                <Eye className="w-3 h-3" />
                                Yayında
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                                <EyeOff className="w-3 h-3" />
                                Taslak
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex items-center gap-1 text-xs text-neutral-500">
                              <Calendar className="w-3 h-3" />
                              {fmtDate(post.published_at ?? post.created_at)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={vitrinPath(`/manage/content/blog/${post.id}`)}
                                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-primary-600"
                              >
                                <Pencil className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                disabled={deleting === post.id}
                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 hover:text-red-500 disabled:opacity-50"
                              >
                                {deleting === post.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Categories Tab */}
        {tab === 'categories' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => { setEditingCat(null); setCatModalOpen(true) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm hover:bg-primary-700"
              >
                <FolderPlus className="w-4 h-4" />
                Yeni Kategori
              </button>
            </div>

            {loadingCats ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <Tag className="w-12 h-12 text-neutral-300" />
                <p className="text-neutral-500">Henüz kategori yok</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => {
                  const postCount = posts.filter((p) => p.category_id === cat.id).length
                  return (
                    <div
                      key={cat.id}
                      className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {cat.image_url ? (
                        <img src={cat.image_url} alt="" className="w-full h-28 object-cover" />
                      ) : (
                        <div className="w-full h-28 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center">
                          <Tag className="w-8 h-8 text-primary-400" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white">
                              {cat.name ?? cat.slug}
                            </h3>
                            <p className="text-xs text-neutral-500 font-mono mt-0.5">{cat.slug}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span
                              className={clsx(
                                'text-xs px-2 py-0.5 rounded-full',
                                cat.is_active
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800',
                              )}
                            >
                              {cat.is_active ? 'Aktif' : 'Pasif'}
                            </span>
                          </div>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-neutral-500 mt-2 line-clamp-2">{cat.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                          <span className="text-xs text-neutral-400">{postCount} yazı</span>
                          <button
                            onClick={() => { setEditingCat(cat); setCatModalOpen(true) }}
                            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            <Settings className="w-3 h-3" />
                            Düzenle
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Post Modal */}
      {newPostOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setNewPostOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Yeni Blog Yazısı</h3>
              <button onClick={() => setNewPostOpen(false)}><X className="w-5 h-5 text-neutral-400" /></button>
            </div>
            {categories.length === 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
                <Tag className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Henüz kategori yok. Yazı oluşturabilirsiniz ancak <button className="underline font-medium" onClick={() => { setNewPostOpen(false); setTab('categories') }}>önce kategori oluşturmanız</button> önerilir.</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Başlık *</label>
              <input
                value={newPostTitle}
                onChange={(e) => {
                  setNewPostTitle(e.target.value)
                  if (!newPostSlugEdited) setNewPostSlug(toSlug(e.target.value))
                }}
                placeholder="Blog yazısının başlığı"
                className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                URL Yolu
                <span className="text-xs text-neutral-400 font-normal">(otomatik oluşturulur, düzenleyebilirsiniz)</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-400 whitespace-nowrap">/blog/</span>
                <input
                  value={newPostSlug}
                  onChange={(e) => { setNewPostSlug(e.target.value); setNewPostSlugEdited(true) }}
                  placeholder="blog-yazi-url"
                  className="flex-1 border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreatePost()}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kategori</label>
              <select
                value={newPostCat}
                onChange={(e) => setNewPostCat(e.target.value)}
                className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800"
              >
                <option value="">Kategori seç (opsiyonel)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name ?? c.slug}</option>
                ))}
              </select>
            </div>
            {newPostError && <p className="text-sm text-red-500">{newPostError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNewPostOpen(false)}
                className="px-4 py-2 rounded-xl text-sm border border-neutral-200 dark:border-neutral-700"
              >
                İptal
              </button>
              <button
                onClick={handleCreatePost}
                disabled={creatingPost || !newPostSlug.trim()}
                className="px-4 py-2 rounded-xl text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                {creatingPost && <Loader2 className="w-4 h-4 animate-spin" />}
                Oluştur ve Düzenle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Edit Modal */}
      {catModalOpen && (
        <CategoryEditModal
          category={editingCat}
          token={token}
          onClose={() => { setCatModalOpen(false); setEditingCat(null) }}
          onSaved={loadCategories}
        />
      )}
    </div>
  )
}
