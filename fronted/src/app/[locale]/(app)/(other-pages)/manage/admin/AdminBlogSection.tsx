'use client'

import {
  createBlogCategory,
  createBlogPost,
  getSeoMetadata,
  listBlogCategories,
  listBlogPosts,
  listBlogTranslations,
  listLocales,
  patchBlogPost,
  upsertBlogTranslation,
  upsertSeoMetadata,
  type BlogCategory,
  type BlogPost,
  type BlogTranslation,
  type LocaleRow,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

type BlogSeoFields = {
  title: string
  description: string
  keywords: string
  canonical_path: string
  og_image_storage_key: string
  robots: string
}

function emptyBlogSeo(): BlogSeoFields {
  return {
    title: '',
    description: '',
    keywords: '',
    canonical_path: '',
    og_image_storage_key: '',
    robots: '',
  }
}

export default function AdminBlogSection() {
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [locales, setLocales] = useState<LocaleRow[]>([])
  const [translations, setTranslations] = useState<BlogTranslation[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [catSlug, setCatSlug] = useState('')
  const [catParent, setCatParent] = useState('')

  const [postSlug, setPostSlug] = useState('')

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [patchSlug, setPatchSlug] = useState('')
  const [patchCategoryId, setPatchCategoryId] = useState('')
  const [patchPublishedAt, setPatchPublishedAt] = useState('')

  const [trLocale, setTrLocale] = useState('tr')
  const [trTitle, setTrTitle] = useState('')
  const [trBody, setTrBody] = useState('')

  const [seoLocale, setSeoLocale] = useState('tr')
  const [blogSeo, setBlogSeo] = useState<BlogSeoFields>(emptyBlogSeo)
  const [seoMsg, setSeoMsg] = useState<string | null>(null)

  const loadLists = useCallback(async () => {
    const token = getStoredAuthToken()
    setLoadErr(null)
    try {
      const [c, loc] = await Promise.all([listBlogCategories(), listLocales()])
      setCategories(c.categories)
      setLocales(loc.locales.filter((l) => l.is_active))
      if (token) {
        const p = await listBlogPosts({ published_only: false, limit: 200, token })
        setPosts(p.posts)
      } else {
        setPosts([])
      }
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'blog_load_failed')
    }
  }, [])

  useEffect(() => {
    void loadLists()
  }, [loadLists])

  const loadTranslations = useCallback(async (postId: string) => {
    const token = getStoredAuthToken()
    if (!token) return
    setLoadErr(null)
    try {
      const r = await listBlogTranslations(token, postId)
      setTranslations(r.translations)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'blog_tr_load_failed')
    }
  }, [])

  useEffect(() => {
    if (selectedPostId) void loadTranslations(selectedPostId)
    else setTranslations([])
  }, [selectedPostId, loadTranslations])

  useEffect(() => {
    if (!selectedPostId) {
      setBlogSeo(emptyBlogSeo())
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const { metadata } = await getSeoMetadata({
          entity_type: 'blog_post',
          entity_id: selectedPostId,
          locale: seoLocale,
        })
        if (cancelled) return
        if (metadata) {
          setBlogSeo({
            title: metadata.title ?? '',
            description: metadata.description ?? '',
            keywords: metadata.keywords ?? '',
            canonical_path: metadata.canonical_path ?? '',
            og_image_storage_key: metadata.og_image_storage_key ?? '',
            robots: metadata.robots ?? '',
          })
        } else {
          setBlogSeo(emptyBlogSeo())
        }
      } catch {
        if (!cancelled) setBlogSeo(emptyBlogSeo())
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedPostId, seoLocale])

  function selectPost(p: BlogPost) {
    setSelectedPostId(p.id)
    setPatchSlug(p.slug)
    setPatchCategoryId(p.category_id ?? '')
    setPatchPublishedAt(p.published_at ?? '')
  }

  async function onCreateCategory(e: FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    if (!catSlug.trim()) return
    setBusy(true)
    setLoadErr(null)
    try {
      await createBlogCategory(token, {
        slug: catSlug.trim(),
        ...(catParent.trim() ? { parent_id: catParent.trim() } : {}),
      })
      setCatSlug('')
      setCatParent('')
      await loadLists()
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : 'blog_cat_create_failed')
    } finally {
      setBusy(false)
    }
  }

  async function onCreatePost(e: FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    if (!postSlug.trim()) return
    setBusy(true)
    setLoadErr(null)
    try {
      await createBlogPost(token, { slug: postSlug.trim() })
      setPostSlug('')
      await loadLists()
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : 'blog_post_create_failed')
    } finally {
      setBusy(false)
    }
  }

  async function onPatchPost(e: FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || !selectedPostId) return
    setBusy(true)
    setLoadErr(null)
    try {
      await patchBlogPost(token, selectedPostId, {
        ...(patchSlug.trim() ? { slug: patchSlug.trim() } : {}),
        ...(patchCategoryId.trim() ? { category_id: patchCategoryId.trim() } : {}),
        published_at: patchPublishedAt.trim(),
      })
      const refreshed = await listBlogPosts({ published_only: false, limit: 200, token })
      setPosts(refreshed.posts)
      const np = refreshed.posts.find((x) => x.id === selectedPostId)
      if (np) selectPost(np)
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : 'blog_post_patch_failed')
    } finally {
      setBusy(false)
    }
  }

  async function onSaveBlogSeo(e: FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || !selectedPostId) return
    setBusy(true)
    setSeoMsg(null)
    setLoadErr(null)
    try {
      await upsertSeoMetadata(
        {
          entity_type: 'blog_post',
          entity_id: selectedPostId,
          locale: seoLocale.trim(),
          title: blogSeo.title.trim(),
          description: blogSeo.description.trim(),
          keywords: blogSeo.keywords.trim(),
          canonical_path: blogSeo.canonical_path.trim(),
          og_image_storage_key: blogSeo.og_image_storage_key.trim(),
          robots: blogSeo.robots.trim(),
        },
        token,
      )
      setSeoMsg('SEO kaydedildi.')
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : 'blog_seo_save_failed')
    } finally {
      setBusy(false)
    }
  }

  async function onUpsertTranslation(e: FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || !selectedPostId) return
    if (!trLocale.trim() || !trTitle.trim()) {
      setLoadErr('locale ve title zorunlu.')
      return
    }
    setBusy(true)
    setLoadErr(null)
    try {
      await upsertBlogTranslation(token, selectedPostId, {
        locale: trLocale.trim(),
        title: trTitle.trim(),
        body: trBody,
      })
      setTrTitle('')
      setTrBody('')
      await loadTranslations(selectedPostId)
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : 'blog_tr_upsert_failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id="admin-blog-block"
      className="mt-10 scroll-mt-24 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40"
    >
      <h2 className="text-lg font-medium">Blog</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Kategori / yazı / çeviri yönetimi. Yazı listesi ve düzenleme için oturum +{' '}
        <span className="font-mono">admin.users.read</span> gerekir.         Yayın tarihini boş bırakıp kaydederek taslağa alın (API boş string → null).{' '}
        <span className="font-mono">category_id</span> yalnızca dolu gönderildiğinde güncellenir.
      </p>
      {loadErr ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {loadErr}
        </p>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void loadLists()}
          className="text-sm font-medium text-primary-600 underline disabled:opacity-50 dark:text-primary-400"
        >
          Yenile
        </button>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div>
          <h3 className="text-base font-medium text-neutral-900 dark:text-white">Kategoriler</h3>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto font-mono text-xs text-neutral-600 dark:text-neutral-400">
            {categories.map((c) => (
              <li key={c.id}>
                {c.slug} <span className="text-neutral-400">({c.id.slice(0, 8)}…)</span>
              </li>
            ))}
          </ul>
          <form className="mt-4 space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-700" onSubmit={(e) => void onCreateCategory(e)}>
            <Field>
              <Label>Slug (URL Yolu)</Label>
              <Input className="mt-1 font-mono text-sm" value={catSlug} onChange={(e) => setCatSlug(e.target.value)} required />
            </Field>
            <Field>
              <Label>parent_id (UUID, isteğe bağlı)</Label>
              <Input className="mt-1 font-mono text-sm" value={catParent} onChange={(e) => setCatParent(e.target.value)} />
            </Field>
            <ButtonPrimary type="submit" disabled={busy}>
              Kategori ekle
            </ButtonPrimary>
          </form>
        </div>

        <div>
          <h3 className="text-base font-medium text-neutral-900 dark:text-white">Yazılar</h3>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
            {posts.length === 0 ? (
              <li className="text-neutral-500">Oturum yoksa veya yazı yoksa liste boş.</li>
            ) : (
              posts.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={
                      selectedPostId === p.id
                        ? 'text-left font-medium text-primary-600 dark:text-primary-400'
                        : 'text-left text-neutral-700 hover:underline dark:text-neutral-300'
                    }
                    onClick={() => selectPost(p)}
                  >
                    {p.slug}
                    <span className="ms-2 font-mono text-xs text-neutral-400">
                      {p.published_at ? 'yayında' : 'taslak'}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <form className="mt-4 space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-700" onSubmit={(e) => void onCreatePost(e)}>
            <Field>
              <Label>Yeni yazı slug</Label>
              <Input className="mt-1 font-mono text-sm" value={postSlug} onChange={(e) => setPostSlug(e.target.value)} required />
            </Field>
            <ButtonPrimary type="submit" disabled={busy}>
              Yazı oluştur (taslak)
            </ButtonPrimary>
          </form>
        </div>
      </div>

      {selectedPostId != null ? (
        <div className="mt-10 border-t border-neutral-200 pt-6 dark:border-neutral-700">
          <h3 className="text-base font-medium text-neutral-900 dark:text-white">Seçili yazı</h3>
          <p className="mt-1 font-mono text-xs text-neutral-500">{selectedPostId}</p>

          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={(e) => void onPatchPost(e)}>
            <Field>
              <Label>Slug (URL Yolu)</Label>
              <Input className="mt-1 font-mono text-sm" value={patchSlug} onChange={(e) => setPatchSlug(e.target.value)} />
            </Field>
            <Field>
              <Label>Kategori ID (UUID, yalnızca değiştirmek için)</Label>
              <Input className="mt-1 font-mono text-sm" value={patchCategoryId} onChange={(e) => setPatchCategoryId(e.target.value)} />
            </Field>
            <Field className="md:col-span-2">
              <Label>published_at (ISO 8601 veya boş = taslak)</Label>
              <Input
                className="mt-1 font-mono text-sm"
                placeholder="2026-04-01T12:00:00Z veya boş"
                value={patchPublishedAt}
                onChange={(e) => setPatchPublishedAt(e.target.value)}
              />
            </Field>
            <ButtonPrimary type="submit" disabled={busy}>
              Yazıyı güncelle
            </ButtonPrimary>
          </form>

          <h4 className="mt-8 text-sm font-medium text-neutral-900 dark:text-white">Çeviriler</h4>
          <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs">
            {translations.map((t) => (
              <li key={t.locale} className="rounded border border-neutral-100 p-2 dark:border-neutral-800">
                <span className="font-mono font-medium">{t.locale}</span> — {t.title}
                <pre className="mt-1 max-h-16 overflow-auto whitespace-pre-wrap text-neutral-600 dark:text-neutral-400">{t.body}</pre>
              </li>
            ))}
          </ul>

          <form className="mt-4 space-y-3" onSubmit={(e) => void onUpsertTranslation(e)}>
            <Field>
              <Label>Locale</Label>
              {locales.length > 0 ? (
                <select
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                  value={trLocale}
                  onChange={(e) => setTrLocale(e.target.value)}
                >
                  {locales.map((l) => (
                    <option key={l.id} value={l.code}>
                      {l.code} — {l.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input className="mt-1 font-mono text-sm" value={trLocale} onChange={(e) => setTrLocale(e.target.value)} placeholder="tr" />
              )}
            </Field>
            <Field>
              <Label>Başlık</Label>
              <Input className="mt-1" value={trTitle} onChange={(e) => setTrTitle(e.target.value)} required />
            </Field>
            <Field>
              <Label>Gövde (HTML / markdown — siteniz nasıl render ediyorsa)</Label>
              <Textarea className="mt-1 text-sm" rows={6} value={trBody} onChange={(e) => setTrBody(e.target.value)} />
            </Field>
            <ButtonPrimary type="submit" disabled={busy}>
              Çeviri kaydet
            </ButtonPrimary>
          </form>

          <details className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
            <summary className="cursor-pointer text-sm font-medium text-neutral-900 dark:text-white">
              SEO (arama ve paylaşım) — <span className="font-mono">blog_post</span>
            </summary>
            {seoMsg ? (
              <p className="mt-2 text-sm text-green-700 dark:text-green-400" role="status">
                {seoMsg}
              </p>
            ) : null}
            <form className="mt-4 space-y-3" onSubmit={(e) => void onSaveBlogSeo(e)}>
              <Field>
                <Label>SEO locale</Label>
                {locales.length > 0 ? (
                  <select
                    className="mt-1 w-full max-w-xs rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                    value={seoLocale}
                    onChange={(e) => {
                      setSeoLocale(e.target.value)
                      setSeoMsg(null)
                    }}
                  >
                    {locales.map((l) => (
                      <option key={l.id} value={l.code}>
                        {l.code} — {l.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    className="mt-1 max-w-xs font-mono text-sm"
                    value={seoLocale}
                    onChange={(e) => {
                      setSeoLocale(e.target.value)
                      setSeoMsg(null)
                    }}
                  />
                )}
              </Field>
              <Field>
                <Label>Meta Başlık</Label>
                <Input className="mt-1" value={blogSeo.title} onChange={(e) => setBlogSeo((s) => ({ ...s, title: e.target.value }))} />
              </Field>
              <Field>
                <Label>Meta Açıklama</Label>
                <Textarea
                  className="mt-1 text-sm"
                  rows={3}
                  value={blogSeo.description}
                  onChange={(e) => setBlogSeo((s) => ({ ...s, description: e.target.value }))}
                />
              </Field>
              <Field>
                <Label>Keywords</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={blogSeo.keywords}
                  onChange={(e) => setBlogSeo((s) => ({ ...s, keywords: e.target.value }))}
                />
              </Field>
              <Field>
                <Label>Canonical path</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={blogSeo.canonical_path}
                  onChange={(e) => setBlogSeo((s) => ({ ...s, canonical_path: e.target.value }))}
                  placeholder="/blog/..."
                />
              </Field>
              <Field>
                <Label>OG Görseli (Görsel Anahtarı)</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={blogSeo.og_image_storage_key}
                  onChange={(e) => setBlogSeo((s) => ({ ...s, og_image_storage_key: e.target.value }))}
                />
              </Field>
              <Field>
                <Label>Robots</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={blogSeo.robots}
                  onChange={(e) => setBlogSeo((s) => ({ ...s, robots: e.target.value }))}
                  placeholder="index,follow"
                />
              </Field>
              <ButtonPrimary type="submit" disabled={busy}>
                SEO kaydet
              </ButtonPrimary>
            </form>
          </details>
        </div>
      ) : null}
    </section>
  )
}
