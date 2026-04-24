'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  addCmsBlock,
  createCmsPage,
  deleteCmsBlock,
  getCmsPage,
  listCmsBlocks,
  listCmsPages,
  patchCmsBlock,
  patchCmsPage,
  reorderCmsBlocks,
  type CmsBlock,
  type CmsPage,
} from '@/lib/travel-api'
import clsx from 'clsx'
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  ImageIcon,
  LayoutTemplate,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import Image from 'next/image'
import { ManageFormPageHeader } from '@/components/manage/ManageFormShell'
import { ManageAiMagicTextButton } from '@/components/manage/ManageAiMagicTextButton'
import { callAiTranslate } from '@/lib/manage-content-ai'
import { defaultLocale } from '@/lib/i18n-config'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import StructuredCmsBlockEditor, { STRUCTURED_BLOCK_TYPES } from './StructuredCmsBlockEditor'
import { cmsPageMediaSubPath, slugifyMediaSegment } from '@/lib/upload-media-paths'

const BLOCK_TYPES = [
  { code: 'hero', label: 'Hero (başlık + mozaik görseller)' },
  { code: 'rich_html', label: 'Metin — HTML editör' },
  { code: 'text', label: 'Metin — düz paragraf' },
  { code: 'image_text', label: 'Modül: Görsel + metin' },
  { code: 'stats', label: 'Modül: Rakamlar / istatistik' },
  { code: 'client_say', label: 'Modül: Misafir yorumları' },
  { code: 'founders', label: 'Modül: Kurucu kartları' },
  { code: 'become_provider', label: 'Modül: İlan verin (CTA)' },
  { code: 'newsletter', label: 'Modül: Bülten' },
  { code: 'image', label: 'Görsel' },
  { code: 'gallery', label: 'Galeri' },
  { code: 'cta', label: 'Eylem Çağrısı (CTA)' },
  { code: 'listing_grid', label: 'İlan Listesi' },
  { code: 'testimonials', label: 'Yorumlar' },
  { code: 'faq', label: 'SSS' },
  { code: 'contact', label: 'İletişim Formu' },
  { code: 'map', label: 'Harita' },
  { code: 'html', label: 'Özel HTML' },
]

function defaultConfigForBlockType(code: string): string {
  switch (code) {
    case 'hero':
      return JSON.stringify({ heading: '', subheading: '', images: ['', '', ''] })
    case 'rich_html':
      return JSON.stringify({
        title: '',
        content: '<p>Buraya HTML veya düz metin yazın. Güvenli etiketler: p, strong, em, ul, ol, li, a, br.</p>',
        align: 'left',
      })
    case 'image_text':
      return JSON.stringify({
        title: 'Başlık',
        subtitle: '',
        content: '<p>Açıklama metni</p>',
        imageUrl: '',
        imageAlt: '',
        imagePosition: 'right',
      })
    case 'stats':
      return JSON.stringify({
        title: '🚀 Rakamlarla Biz',
        items: [
          { value: '50.000+', label: 'Aylık aktif gezgin', emoji: '🧭' },
          { value: '12.000+', label: 'Yayında ilan', emoji: '🏨' },
          { value: '81 İl', label: 'Türkiye geneli', emoji: '🗺️' },
        ],
      })
    case 'client_say':
      return JSON.stringify({
        heading: 'Misafirlerimiz Ne Diyor? 🏅',
        subHeading: 'Bizimle seyahat eden gezginlerin gerçek yorumları.',
      })
    case 'founders':
      return JSON.stringify({
        heading: '⛱ Kurucularımız',
        subheading: 'Seyahat sektörünü daha erişilebilir, şeffaf ve verimli hale getirmek için bir araya geldik',
        members: [
          {
            name: 'Ad Soyad',
            job: 'Unvan',
            avatarUrl: '/uploads/external/02562cf14d6979ef57f7.avif',
          },
        ],
      })
    case 'become_provider':
      return JSON.stringify({
        heading: 'Siz de Aramıza Katılın',
        subheading:
          'Otel, tatil evi, tur, yat, araç kiralama — her türlü seyahat hizmetinizi platformumuza ekleyin.',
        ctaText: 'İlan Oluştur',
        ctaHref: '/manage',
        secondaryCtaText: 'Daha Fazla Bilgi',
        secondaryCtaHref: '#',
        bgVariant: 'gradient',
      })
    case 'newsletter':
      return JSON.stringify({
        title: 'Haberdar Olun',
        description: 'Yeni destinasyonlar ve kampanyalar için bültenimize abone olun.',
        buttonText: 'Abone Ol',
        gradient: 'from-primary-600 to-primary-700',
      })
    default:
      return JSON.stringify({ title: '', text: '' })
  }
}

const TEMPLATES = [
  { code: 'default', label: 'Varsayılan' },
  { code: 'landing', label: 'Açılış Sayfası' },
  { code: 'fullwidth', label: 'Tam Genişlik' },
  { code: 'sidebar', label: 'Yan Panelli' },
]

// ─── Hero block image slot ─────────────────────────────────────────────────────

function CmsImageSlot({
  index,
  value,
  pageSlug,
  onChange,
}: {
  index: number
  value: string
  pageSlug: string
  onChange: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('folder', 'icerik')
    form.append('subPath', cmsPageMediaSubPath(pageSlug))
    form.append('prefix', `${slugifyMediaSegment(pageSlug)}-hero`)
    form.append('index', String(index + 1))
    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: form, credentials: 'include' })
      const data = (await res.json()) as { ok: boolean; url?: string }
      if (data.ok && data.url) onChange(data.url)
    } finally {
      setUploading(false)
    }
  }

  const labels = ['Sol üst', 'Sol alt', 'Sağ (tall)']

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
        Görsel {index + 1} — {labels[index]}
      </span>
      <div
        className={`relative flex h-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          value
            ? 'border-emerald-200 bg-neutral-50 dark:bg-neutral-800'
            : 'border-neutral-200 bg-neutral-50 hover:border-blue-300 dark:border-neutral-700 dark:bg-neutral-800'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files[0]
          if (f) void handleFile(f)
        }}
      >
        {value ? (
          <>
            <Image src={value} alt="" fill className="object-cover" unoptimized={value.startsWith('/uploads/')} />
            <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
              <Upload className="h-4 w-4 text-white" />
              <span className="text-xs text-white">Değiştir</span>
            </div>
          </>
        ) : uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-neutral-400">
            <ImageIcon className="h-6 w-6" />
            <span className="text-[10px]">Yükle / URL</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f) }}
        />
      </div>
      <input
        type="text"
        placeholder="URL girin…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] dark:border-neutral-700 dark:bg-neutral-800"
      />
      {value && (
        <button onClick={() => onChange('')} className="text-[10px] text-red-500 hover:text-red-700 text-left">
          Kaldır
        </button>
      )}
    </div>
  )
}

// ─── Hero block editor ─────────────────────────────────────────────────────────

function HeroBlockEditor({
  configJson,
  pageSlug,
  onChange,
}: {
  configJson: string
  pageSlug: string
  onChange: (json: string) => void
}) {
  let parsed: Record<string, unknown> = {}
  try { parsed = JSON.parse(configJson) } catch { /* ignore */ }

  const heading = (parsed.heading as string) ?? ''
  const subheading = (parsed.subheading as string) ?? ''
  const images = (parsed.images as string[] | undefined) ?? ['', '', '']

  const [aiPolish, setAiPolish] = useState<'h' | 's' | null>(null)

  function update(patch: Record<string, unknown>) {
    onChange(JSON.stringify({ ...parsed, ...patch }))
  }

  function setImage(i: number, url: string) {
    const next = [...images]
    next[i] = url
    update({ images: next })
  }

  const mergeConfig = (patch: Record<string, unknown>) => {
    let base: Record<string, unknown> = {}
    try {
      base = JSON.parse(configJson) as Record<string, unknown>
    } catch {
      /* ignore */
    }
    onChange(JSON.stringify({ ...base, ...patch }))
  }

  const polishHeading = async () => {
    if (!heading.trim()) return
    setAiPolish('h')
    try {
      const out = await callAiTranslate({
        text: heading,
        context: 'title',
        sourceLocale: defaultLocale,
        targetLocale: defaultLocale,
      })
      if (out) mergeConfig({ heading: out.slice(0, 200) })
    } finally {
      setAiPolish(null)
    }
  }

  const polishSub = async () => {
    if (!subheading.trim()) return
    setAiPolish('s')
    try {
      const out = await callAiTranslate({
        text: subheading,
        context: 'excerpt',
        sourceLocale: defaultLocale,
        targetLocale: defaultLocale,
        pageSlug,
      })
      if (out) mergeConfig({ subheading: out.slice(0, 300) })
    } finally {
      setAiPolish(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Başlık</label>
            <ManageAiMagicTextButton loading={aiPolish === 'h'} onClick={() => void polishHeading()} />
          </div>
          <input
            type="text"
            value={heading}
            onChange={(e) => update({ heading: e.target.value })}
            placeholder="Hero başlığı"
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Alt başlık</label>
            <ManageAiMagicTextButton loading={aiPolish === 's'} onClick={() => void polishSub()} />
          </div>
          <input
            type="text"
            value={subheading}
            onChange={(e) => update({ subheading: e.target.value })}
            placeholder="Hero alt başlığı"
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-neutral-500">Mozaik Görseller</p>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <CmsImageSlot
              key={i}
              index={i}
              value={images[i] ?? ''}
              pageSlug={pageSlug}
              onChange={(url) => setImage(i, url)}
            />
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-neutral-400">
          3 görsel de yüklendiğinde ön yüzde mozaik düzen görünür.
        </p>
      </div>
    </div>
  )
}

// ─── Block Card ────────────────────────────────────────────────────────────────

function BlockCard({
  block,
  onDelete,
  onMoveUp,
  onMoveDown,
  onEdit,
  isFirst,
  isLast,
}: {
  block: CmsBlock
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onEdit: (b: CmsBlock) => void
  isFirst: boolean
  isLast: boolean
}) {
  const bType = BLOCK_TYPES.find((t) => t.code === block.block_type)
  let preview = ''
  try {
    const cfg = JSON.parse(block.config_json)
    preview = cfg.title ?? cfg.heading ?? cfg.text?.slice(0, 60) ?? ''
  } catch { /* ignore */ }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <GripVertical className="h-4 w-4 shrink-0 text-neutral-300" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-[color:var(--manage-primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--manage-primary)]">
            {bType?.label ?? block.block_type}
          </span>
          {preview ? <span className="truncate text-xs text-neutral-500">{preview}</span> : null}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" disabled={isFirst} onClick={onMoveUp} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800">
          <ChevronUp className="h-4 w-4" />
        </button>
        <button type="button" disabled={isLast} onClick={onMoveDown} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800">
          <ChevronDown className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onEdit(block)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={onDelete} className="rounded-lg p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function PageEditor({
  page: initialPage,
  token,
  onClose,
  onUpdated,
}: {
  page: CmsPage
  token: string
  onClose: () => void
  onUpdated: () => void
}) {
  const [page, setPage] = useState(initialPage)
  const [blocks, setBlocks] = useState<CmsBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [slug, setSlug] = useState(initialPage.slug)
  const [template, setTemplate] = useState(initialPage.template_code)
  const [published, setPublished] = useState(initialPage.is_published)
  const [saving, setSaving] = useState(false)
  const [editBlock, setEditBlock] = useState<CmsBlock | null>(null)
  const [editJson, setEditJson] = useState('')
  const [editType, setEditType] = useState('')
  const [addingBlock, setAddingBlock] = useState(false)
  const [newBlockType, setNewBlockType] = useState('text')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listCmsBlocks(token, initialPage.id)
      .then((res) => { setBlocks(res.blocks.sort((a, b) => a.sort_order - b.sort_order)) })
      .finally(() => setLoading(false))
  }, [token, initialPage.id])

  const handleSavePage = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await patchCmsPage(token, page.id, { slug, template_code: template, is_published: published })
      setPage((p) => ({ ...p, slug, template_code: template, is_published: published }))
      onUpdated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }, [token, page.id, slug, template, published, onUpdated])

  const handleAddBlock = useCallback(async () => {
    setAddingBlock(true)
    try {
      const defaultJson = defaultConfigForBlockType(newBlockType)
      await addCmsBlock(token, page.id, {
        block_type: newBlockType,
        sort_order: (blocks[blocks.length - 1]?.sort_order ?? 0) + 10,
        config_json: defaultJson,
      })
      const newBlocks = await listCmsBlocks(token, page.id)
      setBlocks(newBlocks.blocks.sort((a, b) => a.sort_order - b.sort_order))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Blok eklenemedi')
    } finally {
      setAddingBlock(false)
    }
  }, [token, page.id, newBlockType, blocks])

  const handleDeleteBlock = useCallback(async (blockId: string) => {
    if (!window.confirm('Bu blok silinsin mi?')) return
    try {
      await deleteCmsBlock(token, page.id, blockId)
      setBlocks((prev) => prev.filter((b) => b.id !== blockId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silinemedi')
    }
  }, [token, page.id])

  const handleMoveBlock = useCallback(async (idx: number, dir: 'up' | 'down') => {
    const newBlocks = [...blocks]
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    ;[newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]]
    setBlocks(newBlocks)
    await reorderCmsBlocks(token, page.id, newBlocks.map((b) => b.id))
  }, [token, page.id, blocks])

  const handleSaveBlock = useCallback(async () => {
    if (!editBlock) return
    setSaving(true)
    try {
      await patchCmsBlock(token, page.id, editBlock.id, { block_type: editType, config_json: editJson })
      setBlocks((prev) => prev.map((b) => b.id === editBlock.id ? { ...b, block_type: editType, config_json: editJson } : b))
      setEditBlock(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Blok kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }, [token, page.id, editBlock, editType, editJson])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">CMS sayfa</span>
          <button type="button" aria-label="Kapat" onClick={onClose}><X className="h-5 w-5 text-neutral-400" /></button>
        </div>

        {error ? <div className="border-b border-red-100 bg-red-50 px-6 py-2 text-sm text-red-700">{error}</div> : null}

        <div className="p-6 space-y-5">
          <ManageFormPageHeader
            className="mb-0"
            title="Sayfa düzenle"
            subtitle={<span className="font-mono text-neutral-600 dark:text-neutral-300">/{page.slug}</span>}
          />
          {/* Page meta */}
          <form onSubmit={handleSavePage} className="space-y-4 rounded-xl border border-neutral-100 p-4 dark:border-neutral-800">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Sayfa Ayarları</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Slug (URL Yolu)</label>
                <input value={slug} onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Şablon</label>
                <select value={template} onChange={(e) => setTemplate(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                  {TEMPLATES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="rounded" />
              Yayınla
            </label>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </button>
          </form>

          {/* Blocks */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">İçerik Blokları</h3>
              <div className="flex gap-2">
                <select value={newBlockType} onChange={(e) => setNewBlockType(e.target.value)}
                  className="rounded-xl border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800">
                  {BLOCK_TYPES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
                </select>
                <button type="button" disabled={addingBlock} onClick={() => void handleAddBlock()}
                  className="flex items-center gap-1 rounded-xl bg-[color:var(--manage-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--manage-primary)]">
                  {addingBlock ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Blok Ekle
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-neutral-400"><Loader2 className="h-4 w-4 animate-spin" />Yükleniyor…</div>
            ) : blocks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-200 py-8 text-center text-sm text-neutral-400 dark:border-neutral-700">
                Henüz blok yok. Yukarıdan blok ekleyin.
              </p>
            ) : (
              <div className="space-y-2">
                {blocks.map((b, idx) => (
                  <BlockCard
                    key={b.id}
                    block={b}
                    isFirst={idx === 0}
                    isLast={idx === blocks.length - 1}
                    onDelete={() => void handleDeleteBlock(b.id)}
                    onMoveUp={() => void handleMoveBlock(idx, 'up')}
                    onMoveDown={() => void handleMoveBlock(idx, 'down')}
                    onEdit={(bl) => { setEditBlock(bl); setEditType(bl.block_type); setEditJson(bl.config_json) }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Block editor */}
          {editBlock ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300">Blok Düzenle</h4>
                <button type="button" onClick={() => setEditBlock(null)} className="text-blue-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <select value={editType} onChange={(e) => setEditType(e.target.value)}
                className="mb-3 w-full rounded-xl border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                {BLOCK_TYPES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
              </select>

              {editType === 'hero' ? (
                <HeroBlockEditor
                  configJson={editJson}
                  pageSlug={page.slug}
                  onChange={setEditJson}
                />
              ) : STRUCTURED_BLOCK_TYPES.has(editType) ? (
                <StructuredCmsBlockEditor
                  key={`${editBlock.id}-${editType}`}
                  blockType={editType}
                  configJson={editJson}
                  onChange={setEditJson}
                />
              ) : (
                <>
                  <label className="mb-1 block text-xs text-neutral-500">Config JSON</label>
                  <textarea value={editJson} onChange={(e) => setEditJson(e.target.value)} rows={6}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-xs focus:outline-none dark:border-neutral-700 dark:bg-neutral-800" />
                </>
              )}

              <button type="button" onClick={() => void handleSaveBlock()} disabled={saving}
                className="mt-3 flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Bloğu Kaydet
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CmsPagesClient() {
  const [pages, setPages] = useState<CmsPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editPage, setEditPage] = useState<CmsPage | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newSlug, setNewSlug] = useState('')
  const [creating, setCreating] = useState(false)
  const token = getStoredAuthToken() ?? ''

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listCmsPages(token)
      setPages(res.pages)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { void load() }, [load])

  const handleCreate = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await createCmsPage(token, { slug: newSlug, is_published: false })
      setShowNew(false)
      setNewSlug('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Oluşturulamadı')
    } finally {
      setCreating(false)
    }
  }, [token, newSlug, load])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40">
            <LayoutTemplate className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">CMS Sayfalar</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Sayfa oluşturun, blok ekleyin, yayına alın. Genel adres:{' '}
              <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">/p/slug</code> —{' '}
              <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">about</code> slug’ı
              ayrıca <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">/about</code>{' '}
              üzerinden gösterilir.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700">
            <Loader2 className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <button type="button" onClick={() => setShowNew((v) => !v)} className="flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            <Plus className="h-4 w-4" />Yeni sayfa
          </button>
        </div>
      </div>

      {error ? <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}<button type="button" onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button></div> : null}

      {showNew ? (
        <form onSubmit={handleCreate} className="mb-4 flex gap-3 rounded-2xl border border-[color:var(--manage-primary)] bg-white p-4 shadow-sm dark:bg-neutral-900">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-neutral-500">Slug (URL Yolu)</label>
            <input required value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="hakkimizda"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800" />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" disabled={creating} className="flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Oluştur
            </button>
            <button type="button" onClick={() => setShowNew(false)} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700">İptal</button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Yükleniyor…</div>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <LayoutTemplate className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">Henüz sayfa yok. Yeni sayfa oluşturun.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-50 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:bg-neutral-800/50">
                <th className="py-3 pl-5 text-left">Slug (URL Yolu)</th>
                <th className="py-3 text-left">Şablon</th>
                <th className="py-3 text-left">Durum</th>
                <th className="py-3 pr-5 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                  <td className="py-3 pl-5 font-mono text-xs text-neutral-800 dark:text-neutral-200">/{p.slug}</td>
                  <td className="py-3 text-xs text-neutral-500">{TEMPLATES.find((t) => t.code === p.template_code)?.label ?? p.template_code}</td>
                  <td className="py-3">
                    <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-medium',
                      p.is_published ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800')}>
                      {p.is_published ? 'Yayında' : 'Taslak'}
                    </span>
                  </td>
                  <td className="py-3 pr-5 text-right">
                    <button type="button" onClick={() => setEditPage(p)}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400">
                      <Pencil className="h-3 w-3" />Düzenle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editPage ? (
        <PageEditor page={editPage} token={token} onClose={() => setEditPage(null)} onUpdated={load} />
      ) : null}
    </div>
  )
}
