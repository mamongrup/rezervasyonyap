'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { blogImageSubPath, slugifyMediaSegment } from '@/lib/upload-media-paths'
import ImageUpload from '@/components/editor/ImageUpload'
import RichEditor from '@/components/editor/RichEditor'
import { ManageAiMagicTextButton } from '@/components/manage/ManageAiMagicTextButton'
import { ManageAiTranslateToolbar } from '@/components/manage/ManageAiTranslateToolbar'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { callAiTranslate } from '@/lib/manage-content-ai'
import {
  MANAGE_FORM_CONTAINER_CLASS,
  ManageFormListingSection,
  ManageFormPageHeader,
} from '@/components/manage/ManageFormShell'
import {
  getBlogPost,
  listBlogCategories,
  listBlogTranslations,
  patchBlogPost,
  putBlogPostMeta,
  upsertBlogTranslation,
  type BlogCategory,
  type BlogPost,
  type BlogTranslation,
} from '@/lib/travel-api'
import clsx from 'clsx'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  Image as ImageIcon,
  Loader2,
  Save,
  Search,
  Settings,
  Sparkles,
  Tag,
  X,
  Plus,
} from 'lucide-react'
import { SITE_LOCALE_CATALOG } from '@/lib/i18n-catalog-locales'

const BLOG_AI_LOCALE_OPTIONS = SITE_LOCALE_CATALOG.map((c) => ({
  code: c.code,
  label: c.name,
  flag:
    c.code === 'tr'
      ? '🇹🇷'
      : c.code === 'en'
        ? '🇬🇧'
        : c.code === 'de'
          ? '🇩🇪'
          : c.code === 'ru'
            ? '🇷🇺'
            : c.code === 'fr'
              ? '🇫🇷'
              : c.code === 'zh'
                ? '🇨🇳'
                : '🌐',
}))
const BLOG_TR_TARGET_LOCALES = BLOG_AI_LOCALE_OPTIONS.filter((l) => l.code !== 'tr')
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { use, useCallback, useEffect, useMemo, useState } from 'react'

const LOCALES = SITE_LOCALE_CATALOG.map((c) => c.code)

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

// ─── Hero Gallery (3 images) ──────────────────────────────────────────────────
function HeroGallery({
  images,
  onChange,
  slugBase,
}: {
  images: string[]
  onChange: (imgs: string[]) => void
  /** Klasör blog/{slugBase}/ ve dosya adı {slugBase}-1.avif … */
  slugBase: string
}) {
  const slots = [images[0] ?? '', images[1] ?? '', images[2] ?? '']
  const update = (idx: number, val: string) => {
    const next = [...slots]
    next[idx] = val
    onChange(next.filter((_, i) => i < 3))
  }
  const sub = blogImageSubPath(slugBase)
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">Hero bölümünde gösterilecek 3 resim</p>
      <p className="text-xs font-mono text-neutral-400">
        /uploads/blog/{slugBase}/…
      </p>
      <div className="grid grid-cols-3 gap-3">
        {slots.map((img, idx) => (
          <div key={idx} className="space-y-1">
            <p className="text-xs text-neutral-400 font-medium">Resim {idx + 1}</p>
            <ImageUpload
              value={img}
              onChange={(val) => update(idx, val)}
              folder="blog"
              subPath={sub}
              prefix={slugBase}
              imageIndex={idx + 1}
              aspectRatio={idx === 0 ? '4/3' : '1/1'}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tags Input ───────────────────────────────────────────────────────────────
function TagsInput({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (t: string[]) => void
}) {
  const [input, setInput] = useState('')
  const add = () => {
    const val = input.trim()
    if (val && !tags.includes(val)) {
      onChange([...tags, val])
    }
    setInput('')
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs"
          >
            {t}
            <button onClick={() => onChange(tags.filter((x) => x !== t))}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
          placeholder="Etiket ekle ve Enter'a bas"
          className="flex-1 border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={add}
          className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-sm"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BlogPostEditClient({
  paramsPromise,
}: {
  paramsPromise: Promise<{ postId: string }>
}) {
  const { postId } = use(paramsPromise)
  const params = useParams()
  const locale = (params?.locale as string) ?? 'tr'
  const router = useRouter()
  const vitrinPath = useVitrinHref()

  const [token, setToken] = useState('')
  const [post, setPost] = useState<BlogPost | null>(null)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [translations, setTranslations] = useState<BlogTranslation[]>([])
  const [activeLocale, setActiveLocale] = useState('tr')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'content' | 'images' | 'seo' | 'translate'>('content')
  const [aiTargetLocale, setAiTargetLocale] = useState('en')
  const [aiTranslating, setAiTranslating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<{ title: string; excerpt: string; body: string } | null>(null)
  const [aiPolishTitle, setAiPolishTitle] = useState(false)
  const [aiPolishExcerpt, setAiPolishExcerpt] = useState(false)
  const [aiPolishBody, setAiPolishBody] = useState(false)
  const [aiPolishMeta, setAiPolishMeta] = useState(false)

  // Content fields (slug before blogSlugBase useMemo)
  const [slug, setSlug] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')

  const blogSlugBase = useMemo(() => {
    const s = slug.trim()
    if (s) return slugifyMediaSegment(s)
    return `post-${postId.replace(/-/g, '').slice(0, 12)}`
  }, [slug, postId])

  // Meta fields
  const [featuredImageUrl, setFeaturedImageUrl] = useState('')
  const [heroImages, setHeroImages] = useState<string[]>(['', '', ''])
  const [tags, setTags] = useState<string[]>([])
  const [readTime, setReadTime] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')

  useEffect(() => {
    setToken(getStoredAuthToken() ?? '')
  }, [])

  const loadAll = useCallback(async () => {
    if (!token || !postId) return
    setLoading(true)
    try {
      const [postRes, catsRes, transRes] = await Promise.all([
        getBlogPost(token, postId),
        listBlogCategories(),
        listBlogTranslations(token, postId),
      ])
      const p = postRes.post
      setPost(p)
      setCategories(catsRes.categories)
      setTranslations(transRes.translations)
      setSlug(p.slug)
      setCategoryId(p.category_id ?? '')
      setFeaturedImageUrl(p.featured_image_url ?? '')
      try {
        const heroArr = JSON.parse(p.hero_gallery_json ?? '[]') as string[]
        setHeroImages([heroArr[0] ?? '', heroArr[1] ?? '', heroArr[2] ?? ''])
      } catch { setHeroImages(['', '', '']) }
      try {
        setTags(JSON.parse(p.tags_json ?? '[]') as string[])
      } catch { setTags([]) }
      setReadTime(p.read_time_minutes ?? '')
      setMetaTitle('')
      setMetaDescription('')
      const tr = transRes.translations.find((t) => t.locale === activeLocale)
      setTitle(tr?.title ?? '')
      setExcerpt(tr?.excerpt ?? '')
      setBody(tr?.body ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [token, postId, activeLocale])

  useEffect(() => {
    if (token) loadAll()
  }, [token])

  const switchLocale = (loc: string) => {
    setActiveLocale(loc)
    const tr = translations.find((t) => t.locale === loc)
    setTitle(tr?.title ?? '')
    setExcerpt(tr?.excerpt ?? '')
    setBody(tr?.body ?? '')
  }

  const showSaved = (msg = 'Kaydedildi') => {
    setSavedMsg(msg)
    setTimeout(() => setSavedMsg(null), 3000)
  }

  const handleSaveContent = async () => {
    if (!title.trim()) { setError('Başlık gerekli'); return }
    setSaving(true)
    setError(null)
    try {
      await Promise.all([
        patchBlogPost(token, postId, { slug: slug.trim(), category_id: categoryId || undefined }),
        upsertBlogTranslation(token, postId, {
          locale: activeLocale,
          title: title.trim(),
          body,
          excerpt: excerpt || undefined,
        }),
      ])
      setTranslations((prev) => {
        const idx = prev.findIndex((t) => t.locale === activeLocale)
        const entry: BlogTranslation = { locale: activeLocale, title, body, excerpt }
        if (idx >= 0) { const next = [...prev]; next[idx] = entry; return next }
        return [...prev, entry]
      })
      showSaved('İçerik kaydedildi')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMeta = async () => {
    setSavingMeta(true)
    setError(null)
    try {
      await putBlogPostMeta(token, postId, {
        featured_image_url: featuredImageUrl || null,
        hero_gallery_json: JSON.stringify(heroImages.filter(Boolean)),
        tags_json: JSON.stringify(tags),
        read_time_minutes: readTime ? Number(readTime) : null,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
      })
      showSaved('Meta kaydedildi')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Meta kaydedilemedi')
    } finally {
      setSavingMeta(false)
    }
  }

  const handleAiTranslate = async () => {
    if (!title.trim()) { setAiError('Önce başlık giriniz.'); return }
    setAiTranslating(true)
    setAiError(null)
    setAiResult(null)
    try {
      const pageSlug = slug.trim() || 'blog'
      const [tTitle, tExcerpt, tBody] = await Promise.all([
        callAiTranslate({ text: title, context: 'title', sourceLocale: activeLocale, targetLocale: aiTargetLocale }),
        excerpt.trim()
          ? callAiTranslate({ text: excerpt, context: 'excerpt', sourceLocale: activeLocale, targetLocale: aiTargetLocale })
          : Promise.resolve(''),
        body.trim()
          ? callAiTranslate({
              text: body,
              context: 'body',
              sourceLocale: activeLocale,
              targetLocale: aiTargetLocale,
              pageSlug,
            })
          : Promise.resolve(''),
      ])
      setAiResult({ title: tTitle, excerpt: tExcerpt, body: tBody })
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Çeviri hatası')
    } finally {
      setAiTranslating(false)
    }
  }

  const handleApplyAiTranslation = async () => {
    if (!aiResult) return
    const prevLocale = activeLocale
    switchLocale(aiTargetLocale)
    setTitle(aiResult.title)
    setExcerpt(aiResult.excerpt)
    setBody(aiResult.body)
    setSaving(true)
    try {
      await upsertBlogTranslation(token, postId, {
        locale: aiTargetLocale,
        title: aiResult.title,
        body: aiResult.body,
        excerpt: aiResult.excerpt || undefined,
      })
      setTranslations((prev) => {
        const idx = prev.findIndex((t) => t.locale === aiTargetLocale)
        const entry: BlogTranslation = { locale: aiTargetLocale, title: aiResult.title, body: aiResult.body, excerpt: aiResult.excerpt }
        if (idx >= 0) { const next = [...prev]; next[idx] = entry; return next }
        return [...prev, entry]
      })
      setAiResult(null)
      showSaved(`${aiTargetLocale.toUpperCase()} çevirisi kaydedildi`)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Kayıt başarısız')
      switchLocale(prevLocale)
    } finally {
      setSaving(false)
    }
  }

  const turkishSourceStrings = () => {
    const trT = translations.find((t) => t.locale === 'tr')
    return {
      title: (activeLocale === 'tr' ? title : trT?.title ?? '').trim(),
      excerpt: (activeLocale === 'tr' ? excerpt : trT?.excerpt ?? '').trim(),
      body: (activeLocale === 'tr' ? body : trT?.body ?? '').trim(),
    }
  }

  const handleAiTranslateTrToTarget = async () => {
    if (aiTargetLocale === 'tr') {
      setError('Hedef dil olarak Türkçe dışında bir dil seçin.')
      return
    }
    const src = turkishSourceStrings()
    if (!src.title && !src.body) {
      setError('Önce Türkçe başlık veya içerik girin.')
      return
    }
    setAiTranslating(true)
    setError(null)
    try {
      const pageSlug = slug.trim() || 'blog'
      const [tTitle, tExcerpt, tBody] = await Promise.all([
        src.title
          ? callAiTranslate({ text: src.title, context: 'title', sourceLocale: 'tr', targetLocale: aiTargetLocale })
          : Promise.resolve(''),
        src.excerpt
          ? callAiTranslate({ text: src.excerpt, context: 'excerpt', sourceLocale: 'tr', targetLocale: aiTargetLocale })
          : Promise.resolve(''),
        src.body
          ? callAiTranslate({
              text: src.body,
              context: 'body',
              sourceLocale: 'tr',
              targetLocale: aiTargetLocale,
              pageSlug,
            })
          : Promise.resolve(''),
      ])
      setTranslations((prev) => {
        const idx = prev.findIndex((t) => t.locale === aiTargetLocale)
        const entry: BlogTranslation = {
          locale: aiTargetLocale,
          title: tTitle || prev[idx]?.title || '',
          body: tBody || prev[idx]?.body || '',
          excerpt: tExcerpt || prev[idx]?.excerpt || '',
        }
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = entry
          return next
        }
        return [...prev, entry]
      })
      if (activeLocale === aiTargetLocale) {
        setTitle(tTitle || '')
        setExcerpt(tExcerpt)
        setBody(tBody)
      }
      showSaved(`${aiTargetLocale.toUpperCase()} çevirisi taslakta güncellendi — kaydedin.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Çeviri başarısız')
    } finally {
      setAiTranslating(false)
    }
  }

  const handleMagicPolishTitle = async () => {
    if (!title.trim()) {
      setError('Önce başlık girin.')
      return
    }
    setAiPolishTitle(true)
    setError(null)
    try {
      const out = await callAiTranslate({
        text: title,
        context: 'title',
        sourceLocale: activeLocale,
        targetLocale: activeLocale,
      })
      if (out) setTitle(out.slice(0, 200))
      showSaved('Başlık iyileştirildi.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız')
    } finally {
      setAiPolishTitle(false)
    }
  }

  const handleMagicPolishExcerpt = async () => {
    if (!excerpt.trim()) {
      setError('Önce özet girin.')
      return
    }
    setAiPolishExcerpt(true)
    setError(null)
    try {
      const out = await callAiTranslate({
        text: excerpt,
        context: 'excerpt',
        sourceLocale: activeLocale,
        targetLocale: activeLocale,
      })
      if (out) setExcerpt(out)
      showSaved('Özet iyileştirildi.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız')
    } finally {
      setAiPolishExcerpt(false)
    }
  }

  const handleMagicPolishBody = async () => {
    if (!body.trim()) {
      setError('Önce içerik girin.')
      return
    }
    setAiPolishBody(true)
    setError(null)
    try {
      const pageSlug = slug.trim() || 'blog'
      const out = await callAiTranslate({
        text: body,
        context: 'body',
        sourceLocale: activeLocale,
        targetLocale: activeLocale,
        pageSlug,
      })
      if (out) setBody(out)
      showSaved('İçerik iyileştirildi.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız')
    } finally {
      setAiPolishBody(false)
    }
  }

  const handleFooterAiPolishMeta = async () => {
    const mt = metaTitle.trim()
    const md = metaDescription.trim()
    if (!mt && !md) {
      setError('Önce meta alanlarını doldurun.')
      return
    }
    setAiPolishMeta(true)
    setError(null)
    try {
      const [t1, t2] = await Promise.all([
        mt
          ? callAiTranslate({ text: mt, context: 'seo', sourceLocale: activeLocale, targetLocale: activeLocale })
          : Promise.resolve(''),
        md
          ? callAiTranslate({ text: md, context: 'seo', sourceLocale: activeLocale, targetLocale: activeLocale })
          : Promise.resolve(''),
      ])
      if (t1) setMetaTitle(t1.slice(0, 70))
      if (t2) setMetaDescription(t2.slice(0, 160))
      showSaved('Meta SEO iyileştirildi — SEO sekmesinden kaydedin.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız')
    } finally {
      setAiPolishMeta(false)
    }
  }

  const handlePublishToggle = async () => {
    if (!post) return
    setPublishing(true)
    setError(null)
    try {
      const isPublished = !!post.published_at
      await patchBlogPost(token, postId, {
        published_at: isPublished ? '' : new Date().toISOString(),
      })
      setPost((prev) =>
        prev ? { ...prev, published_at: isPublished ? null : new Date().toISOString() } : prev,
      )
      showSaved(isPublished ? 'Taslağa alındı' : 'Yayınlandı!')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Durum değiştirilemedi')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  const isPublished = !!post?.published_at
  const hasTranslation = (loc: string) => translations.some((t) => t.locale === loc && t.title)

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={vitrinPath('/manage/content/blog')}
              className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-neutral-900 dark:text-white truncate max-w-[200px] sm:max-w-none">
                {title || post?.slug || 'Blog Yazısı'}
              </h1>
              <p className="text-xs text-neutral-400 font-mono">{post?.slug}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ManageAiTranslateToolbar
              locales={BLOG_TR_TARGET_LOCALES}
              targetLocale={aiTargetLocale}
              onTargetLocaleChange={setAiTargetLocale}
              onTranslate={() => void handleAiTranslateTrToTarget()}
              translating={aiTranslating}
            />
            {savedMsg && (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                {savedMsg}
              </span>
            )}
            <button
              onClick={handlePublishToggle}
              disabled={publishing}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                isPublished
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50',
              )}
            >
              {publishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPublished ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{isPublished ? 'Taslağa al' : 'Yayınla'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className={clsx(MANAGE_FORM_CONTAINER_CLASS, 'grid grid-cols-1 gap-8 pb-16 pt-4 sm:pt-6 lg:grid-cols-3')}>
        <div className="lg:col-span-3">
          <ManageFormPageHeader
            title="Blog yazısı düzenle"
            subtitle={
              <>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {title || post?.slug || '—'}
                </span>
                {post?.slug ? (
                  <span className="ml-2 font-mono text-xs text-neutral-400">/{post.slug}</span>
                ) : null}
              </>
            }
          />
        </div>
        {/* Left: Main content */}
        <ManageFormListingSection className="min-w-0 lg:col-span-2">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Tab navigation */}
          <div className="flex gap-1 bg-white dark:bg-neutral-900 rounded-2xl p-1 border border-neutral-200 dark:border-neutral-800 w-fit">
            {[
              { key: 'content', label: 'İçerik', icon: Globe },
              { key: 'images', label: 'Görseller', icon: ImageIcon },
              { key: 'seo', label: 'SEO', icon: Search },
              { key: 'translate', label: 'AI Çeviri', icon: Sparkles },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  activeTab === key
                    ? 'bg-primary-600 text-white'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white',
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Locale tabs */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="flex border-b border-neutral-200 dark:border-neutral-700">
                  {LOCALES.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => switchLocale(loc)}
                      className={clsx(
                        'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                        activeLocale === loc
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
                      )}
                    >
                      <span className="text-base">
                        {loc === 'tr' ? '🇹🇷' : loc === 'en' ? '🇬🇧' : '🌐'}
                      </span>
                      {loc.toUpperCase()}
                      {hasTranslation(loc) && (
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <label className="block text-sm font-medium">Başlık *</label>
                      <ManageAiMagicTextButton
                        loading={aiPolishTitle}
                        onClick={() => void handleMagicPolishTitle()}
                        title="SEO ve yazım için başlık iyileştir"
                      />
                    </div>
                    <input
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value)
                        if (!slug || slug === toSlug(title)) setSlug(toSlug(e.target.value))
                      }}
                      placeholder="Blog yazısı başlığı"
                      className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-4 py-3 text-lg font-medium bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <label className="block text-sm font-medium">Özet</label>
                      <ManageAiMagicTextButton
                        loading={aiPolishExcerpt}
                        onClick={() => void handleMagicPolishExcerpt()}
                        title="Özet iyileştir"
                      />
                    </div>
                    <textarea
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      rows={2}
                      placeholder="Kısa bir özet (liste sayfasında görünür)"
                      className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <label className="block text-sm font-medium">İçerik</label>
                      <ManageAiMagicTextButton
                        loading={aiPolishBody}
                        onClick={() => void handleMagicPolishBody()}
                        title="HTML içerik: SEO, vurgu, linkler"
                      />
                    </div>
                    <div className="border border-neutral-300 dark:border-neutral-600 rounded-xl overflow-hidden">
                      <RichEditor
                        value={body}
                        onChange={setBody}
                        placeholder="Blog içeriğini buraya yazın…"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveContent}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 font-medium"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  İçeriği Kaydet
                </button>
              </div>
            </div>
          )}

          {/* Images Tab */}
          {activeTab === 'images' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-6">
                <div>
                  <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary-500" />
                    Hero Galerisi (3 Resim)
                  </h3>
                  <HeroGallery images={heroImages} onChange={setHeroImages} slugBase={blogSlugBase} />
                </div>
                <hr className="border-neutral-200 dark:border-neutral-700" />
                <div>
                  <h3 className="text-base font-semibold mb-4">Öne Çıkan Resim</h3>
                  <p className="text-sm text-neutral-500 mb-3">Blog listesinde ve paylaşımlarda görünür</p>
                  <ImageUpload
                    value={featuredImageUrl}
                    onChange={setFeaturedImageUrl}
                    folder="blog"
                    subPath={blogImageSubPath(blogSlugBase)}
                    prefix={`${blogSlugBase}-kapak`}
                    aspectRatio="16/9"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSaveMeta}
                  disabled={savingMeta}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 font-medium"
                >
                  {savingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Görselleri Kaydet
                </button>
              </div>
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-5">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary-500" />
                  SEO Ayarları
                </h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Meta Başlığı</label>
                  <input
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder={title || 'Sayfa başlığı…'}
                    className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-neutral-400 mt-1">{metaTitle.length}/60 karakter</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Meta Açıklaması</label>
                  <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    rows={3}
                    placeholder={excerpt || 'Sayfa açıklaması…'}
                    className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                  <p className="text-xs text-neutral-400 mt-1">{metaDescription.length}/160 karakter</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Etiketler</label>
                  <TagsInput tags={tags} onChange={setTags} />
                </div>

                {/* SEO Preview */}
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-800/50">
                  <p className="text-xs text-neutral-400 uppercase font-semibold mb-2">Google önizleme</p>
                  <div className="space-y-1">
                    <p className="text-[#1a0dab] dark:text-[#8ab4f8] text-base font-medium leading-snug truncate">
                      {metaTitle || title || 'Sayfa başlığı'}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400">
                      {typeof window !== 'undefined' ? window.location.host : 'siteniz.com'}/blog/{slug}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                      {metaDescription || excerpt || 'Sayfa açıklaması buraya gelecek…'}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-4 dark:border-violet-900 dark:bg-violet-950/20">
                  <p className="text-sm font-medium text-violet-900 dark:text-violet-200 mb-2">SEO optimizasyonu</p>
                  <p className="text-xs text-violet-800/80 dark:text-violet-300/90 mb-3">
                    Meta başlık ve açıklamayı yapay zeka ile iyileştirir. Önce üstteki alanları doldurun.
                  </p>
                  <button
                    type="button"
                    disabled={aiPolishMeta}
                    onClick={() => void handleFooterAiPolishMeta()}
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-900/50"
                  >
                    {aiPolishMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    AI ile meta iyileştir
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSaveMeta}
                  disabled={savingMeta}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 font-medium"
                >
                  {savingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  SEO Kaydet
                </button>
              </div>
            </div>
          )}
          {/* AI Translate Tab */}
          {activeTab === 'translate' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-5">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-500" />
                  Yapay Zeka ile Çeviri
                </h3>
                <p className="text-sm text-neutral-500">
                  Aktif dildeki içeriği (<strong>{activeLocale.toUpperCase()}</strong>) seçtiğiniz dile otomatik çevirir ve kaydeder.
                </p>

                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium mb-1.5">Kaynak dil</label>
                    <div className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-500">
                      {activeLocale === 'tr' ? '🇹🇷 Türkçe' : activeLocale === 'en' ? '🇬🇧 İngilizce' : activeLocale.toUpperCase()}
                      <span className="ms-2 text-xs">(aktif sekme)</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium mb-1.5">Hedef dil</label>
                    <select
                      value={aiTargetLocale}
                      onChange={(e) => { setAiTargetLocale(e.target.value); setAiResult(null); setAiError(null) }}
                      className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {LOCALES.filter((l) => l !== activeLocale).map((l) => (
                        <option key={l} value={l}>
                          {l === 'tr' ? '🇹🇷 Türkçe' : l === 'en' ? '🇬🇧 İngilizce' : l.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleAiTranslate}
                    disabled={aiTranslating || !title.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 font-medium whitespace-nowrap"
                  >
                    {aiTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {aiTranslating ? 'Çevriliyor…' : 'Çeviriyi Başlat'}
                  </button>
                </div>

                {aiError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {aiError}
                    {aiError.includes('DEEPSEEK_API_KEY') && (
                      <span className="text-xs block mt-1">
                        .env.local dosyasına <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">DEEPSEEK_API_KEY=sk-...</code> ekleyin.
                      </span>
                    )}
                  </div>
                )}

                {aiResult && (
                  <div className="space-y-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Çeviri hazır — {aiTargetLocale.toUpperCase()}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-neutral-500 mb-1 font-medium">Başlık</p>
                        <p className="text-sm text-neutral-800 dark:text-neutral-200">{aiResult.title}</p>
                      </div>
                      {aiResult.excerpt && (
                        <div>
                          <p className="text-xs text-neutral-500 mb-1 font-medium">Özet</p>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-3">{aiResult.excerpt}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-green-200 dark:border-green-800">
                      <button
                        onClick={() => void handleApplyAiTranslation()}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Uygula ve Kaydet
                      </button>
                      <button
                        onClick={() => setAiResult(null)}
                        className="px-4 py-2 rounded-xl text-sm border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs font-medium text-neutral-500 mb-2">Nasıl çalışır?</p>
                  <ul className="text-xs text-neutral-500 space-y-1 list-disc list-inside">
                    <li>Aktif sekmedeki başlık, özet ve içerik çevrilir</li>
                    <li>"Uygula ve Kaydet" ile hedef dil sekmesine otomatik yazılır</li>
                    <li>HTML formatı korunur; sonucu İçerik sekmesinden düzenleyebilirsiniz</li>
                    <li>Çeviri için <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded">DEEPSEEK_API_KEY</code> gereklidir</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </ManageFormListingSection>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Publish Status */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
            <h3 className="text-sm font-semibold mb-3 text-neutral-700 dark:text-neutral-300">Yayın Durumu</h3>
            <div
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
                isPublished
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
              )}
            >
              {isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {isPublished ? 'Yayında' : 'Taslak'}
            </div>
            {post?.published_at && (
              <p className="text-xs text-neutral-400 mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(post.published_at).toLocaleDateString('tr-TR', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </p>
            )}
          </div>

          {/* Post settings */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Yazı Ayarları
            </h3>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">Slug (URL Yolu)</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-transparent font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">Kategori</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none"
              >
                <option value="">Kategori seç</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name ?? c.slug}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">Okuma Süresi (dk)</label>
              <input
                type="number"
                value={readTime}
                onChange={(e) => setReadTime(e.target.value)}
                min={1}
                max={120}
                placeholder="5"
                className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-2">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Hızlı Bağlantılar</h3>
            {post?.slug && (
              <a
                href={vitrinPath(`/blog/${post.slug}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <Eye className="w-4 h-4" />
                Sayfayı görüntüle
              </a>
            )}
            <Link
              href={vitrinPath('/manage/content/blog')}
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Blog listesine dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
