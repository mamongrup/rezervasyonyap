'use client'

import { useEffect, useState, useCallback } from 'react'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { SUBCATEGORY_REGISTRY, subcategoryColorClasses } from '@/data/subcategory-registry'
import type { SubcategoryEntry } from '@/data/subcategory-registry'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import I18nFieldEditor from '@/components/manage/i18n/I18nFieldEditor'
import { compactI18nField, type I18nFieldMap } from '@/lib/i18n-field'
import {
  Plus, Pencil, Trash2, Save, X, Loader2,
  ChevronDown, ChevronUp, Eye, EyeOff, AlertCircle, CheckCircle2,
} from 'lucide-react'

type EditForm = Omit<SubcategoryEntry, 'id'> & { id?: string }

const COLORS = ['red','rose','orange','amber','yellow','green','emerald','teal','cyan','sky','blue','indigo','violet','stone','neutral']

const BLANK_FORM: EditForm = {
  slug: '', parentCategorySlug: '', name: '', nameEn: '', emoji: '📌',
  description: '', descriptionEn: '', color: 'blue', order: 99, enabled: true,
  name_i18n: {}, description_i18n: {},
}

function mergeLegacy(legacy: { tr?: string; en?: string }, i18n: I18nFieldMap | undefined): I18nFieldMap {
  const out: I18nFieldMap = { ...(i18n ?? {}) }
  if (!out.tr && legacy.tr) out.tr = legacy.tr
  if (!out.en && legacy.en) out.en = legacy.en
  return out
}

function generateId(slug: string, parent: string) {
  return `${parent}-${slug}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
}

export default function SubcategoriesManageClient() {
  const token = getStoredAuthToken() ?? ''

  const [items, setItems]             = useState<SubcategoryEntry[]>([])
  const [activeParent, setActiveParent] = useState<string>('oteller')
  const [editId, setEditId]           = useState<string | null>(null)
  const [form, setForm]               = useState<EditForm>({ ...BLANK_FORM })
  const [saving, setSaving]           = useState(false)
  const [saveStatus, setSaveStatus]   = useState<'idle'|'ok'|'error'>('idle')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Başlangıçta statik registry'den yükle
  useEffect(() => {
    // localStorage'daki override varsa onu kullan (offline fallback)
    const stored = localStorage.getItem('travel_subcategories')
    if (stored) {
      try { setItems(JSON.parse(stored) as SubcategoryEntry[]); return } catch {}
    }
    setItems([...SUBCATEGORY_REGISTRY])
  }, [])

  const filteredItems = items
    .filter((i) => i.parentCategorySlug === activeParent)
    .sort((a, b) => a.order - b.order)

  // Kaydet (localStorage + backend deneme)
  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveStatus('idle')
    try {
      localStorage.setItem('travel_subcategories', JSON.stringify(items))
      // Backend entegrasyonu hazır olduğunda burayı açın:
      // await saveSubcategoryConfig(token, items)
      setSaveStatus('ok')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }, [items])

  // Form submit (ekle veya güncelle)
  const handleFormSubmit = () => {
    const id = editId ?? generateId(form.slug, form.parentCategorySlug)
    const entry: SubcategoryEntry = { ...form, id }

    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = entry
        return next
      }
      return [...prev, entry]
    })
    setEditId(null)
    setForm({ ...BLANK_FORM, parentCategorySlug: activeParent })
  }

  const handleEdit = (item: SubcategoryEntry) => {
    setEditId(item.id)
    setForm({ ...item })
  }

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    setDeleteConfirm(null)
  }

  const handleToggle = (id: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, enabled: !i.enabled } : i))
  }

  const handleReorder = (id: string, dir: 'up' | 'down') => {
    const arr = [...filteredItems]
    const idx = arr.findIndex((i) => i.id === id)
    if (dir === 'up' && idx > 0) {
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
    } else if (dir === 'down' && idx < arr.length - 1) {
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
    }
    const reordered = arr.map((item, i) => ({ ...item, order: i + 1 }))
    setItems((prev) => [
      ...prev.filter((i) => i.parentCategorySlug !== activeParent),
      ...reordered,
    ])
  }

  const startAdd = () => {
    setEditId(null)
    setForm({ ...BLANK_FORM, parentCategorySlug: activeParent, order: filteredItems.length + 1 })
  }

  const cancelEdit = () => {
    setEditId(null)
    setForm({ ...BLANK_FORM, parentCategorySlug: activeParent })
  }

  const isEditing = editId !== null || form.slug !== ''

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Başlık */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Alt Kategori Yönetimi
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Her ana kategorinin alt kategorilerini düzenleyin, ekleyin veya silin.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Değişiklikleri Kaydet
        </button>
      </div>

      {saveStatus === 'ok' && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/10 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" /> Değişiklikler kaydedildi.
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/10 dark:text-red-400">
          <AlertCircle className="h-4 w-4" /> Kayıt sırasında bir hata oluştu.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* ── Sol — Ana Kategori Seçimi ──────────────────────────────────── */}
        <div className="space-y-1.5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Ana Kategori
          </p>
          {CATEGORY_REGISTRY.map((cat) => {
            const count = items.filter((i) => i.parentCategorySlug === cat.slug).length
            const active = activeParent === cat.slug
            return (
              <button
                key={cat.slug}
                onClick={() => { setActiveParent(cat.slug); cancelEdit() }}
                className={[
                  'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                    : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
                ].join(' ')}
              >
                <span className="flex items-center gap-2">
                  <span>{cat.emoji}</span>
                  <span>{cat.name}</span>
                </span>
                <span className={[
                  'rounded-full px-2 py-0.5 text-xs font-bold',
                  active ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40' : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400',
                ].join(' ')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Sağ — Alt Kategori Listesi + Form ─────────────────────────── */}
        <div className="space-y-4">
          {/* Ekle butonu */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-neutral-900 dark:text-white">
              {CATEGORY_REGISTRY.find((c) => c.slug === activeParent)?.name ?? ''} — Alt Kategoriler
              <span className="ml-2 text-sm font-normal text-neutral-400">({filteredItems.length})</span>
            </h2>
            <button
              onClick={startAdd}
              className="flex items-center gap-1.5 rounded-xl border border-dashed border-primary-400 px-3 py-1.5 text-sm font-medium text-primary-600 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-400 dark:hover:bg-primary-900/20"
            >
              <Plus className="h-4 w-4" /> Yeni Ekle
            </button>
          </div>

          {/* Form (ekle / düzenle) */}
          {(isEditing || editId !== null) && (
            <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5 dark:border-primary-800 dark:bg-primary-900/10">
              <p className="mb-4 text-sm font-semibold text-primary-700 dark:text-primary-300">
                {editId ? '✏️ Düzenle' : '➕ Yeni Alt Kategori'}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Emoji */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Emoji</label>
                  <input
                    type="text"
                    value={form.emoji}
                    onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-2xl focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    maxLength={4}
                  />
                </div>
                {/* Renk */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Renk</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COLORS.map((c) => {
                      const cls = subcategoryColorClasses(c)
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, color: c }))}
                          className={[
                            'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                            cls.iconBg,
                            form.color === c ? 'border-neutral-900 dark:border-white scale-110' : 'border-transparent',
                          ].join(' ')}
                          title={c}
                        />
                      )
                    })}
                  </div>
                </div>
                {/* Çoklu dil: Ad (6 dil) */}
                <div className="sm:col-span-2">
                  <I18nFieldEditor
                    label="Ad"
                    description="Tüm sitedeki dillerde görünür. TR zorunlu; diğer diller boşsa fallback uygulanır."
                    value={mergeLegacy({ tr: form.name, en: form.nameEn }, form.name_i18n)}
                    onChange={(next) => {
                      const compact = compactI18nField(next)
                      setForm((f) => ({
                        ...f,
                        name: compact.tr ?? '',
                        nameEn: compact.en ?? '',
                        name_i18n: compact,
                      }))
                    }}
                    placeholder="Alt kategori adı"
                  />
                </div>
                {/* Slug */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Slug (URL) *</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    placeholder="butik-oteller"
                  />
                </div>
                {/* Özel URL */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Özel URL (isteğe bağlı)</label>
                  <input
                    type="text"
                    value={form.href ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, href: e.target.value || undefined }))}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    placeholder="/oteller/all?type=butik"
                  />
                </div>
                {/* Çoklu dil: Açıklama (6 dil) */}
                <div className="sm:col-span-2">
                  <I18nFieldEditor
                    label="Açıklama"
                    description="Vitrin kartlarında alt başlık olarak gösterilir."
                    value={mergeLegacy({ tr: form.description, en: form.descriptionEn }, form.description_i18n)}
                    onChange={(next) => {
                      const compact = compactI18nField(next)
                      setForm((f) => ({
                        ...f,
                        description: compact.tr ?? '',
                        descriptionEn: compact.en ?? '',
                        description_i18n: compact,
                      }))
                    }}
                    rows={2}
                    requireTr={false}
                    placeholder="Kısa açıklama"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={!form.name.trim() || !form.slug.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {editId ? 'Güncelle' : 'Ekle'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400"
                >
                  <X className="h-3.5 w-3.5" /> İptal
                </button>
              </div>
            </div>
          )}

          {/* Liste */}
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 py-12 text-center dark:border-neutral-700">
              <p className="text-neutral-400">Bu kategoride henüz alt kategori yok.</p>
              <button onClick={startAdd} className="mt-3 text-sm font-medium text-primary-600 hover:underline">
                İlk alt kategoriyi ekle
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item, idx) => {
                const c = subcategoryColorClasses(item.color)
                return (
                  <div
                    key={item.id}
                    className={[
                      'flex items-center gap-3 rounded-2xl border p-3 transition-colors',
                      item.enabled
                        ? 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                        : 'border-dashed border-neutral-200 bg-neutral-50 opacity-60 dark:border-neutral-700 dark:bg-neutral-900/50',
                    ].join(' ')}
                  >
                    {/* Sıralama */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleReorder(item.id, 'up')}
                        disabled={idx === 0}
                        className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20 dark:text-neutral-600"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleReorder(item.id, 'down')}
                        disabled={idx === filteredItems.length - 1}
                        className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20 dark:text-neutral-600"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Emoji */}
                    <span className={[
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg',
                      c.iconBg,
                    ].join(' ')}>
                      {item.emoji}
                    </span>

                    {/* İçerik */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-neutral-900 dark:text-white">{item.name}</p>
                        {item.nameEn && (
                          <p className="text-xs text-neutral-400">{item.nameEn}</p>
                        )}
                        <span className={[
                          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                          c.bg, c.text,
                        ].join(' ')}>
                          {item.color}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 font-mono">/{item.slug}</p>
                      {item.description && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex shrink-0 items-center gap-1">
                      {/* Aktif/pasif */}
                      <button
                        onClick={() => handleToggle(item.id)}
                        className={[
                          'rounded-lg p-1.5 transition-colors',
                          item.enabled
                            ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                            : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800',
                        ].join(' ')}
                        title={item.enabled ? 'Pasife al' : 'Aktife al'}
                      >
                        {item.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      {/* Düzenle */}
                      <button
                        onClick={() => handleEdit(item)}
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {/* Sil */}
                      {deleteConfirm === item.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Sil
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="rounded-lg px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
                          >
                            İptal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Alt önizleme */}
          {filteredItems.length > 0 && (
            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Görünüm Önizlemesi
              </p>
              <div className="flex flex-wrap gap-2">
                {filteredItems.filter((i) => i.enabled).map((sub) => {
                  const c = subcategoryColorClasses(sub.color)
                  return (
                    <div
                      key={sub.id}
                      className={[
                        'flex items-center gap-2 rounded-2xl border px-3 py-1.5',
                        c.bg, c.border,
                      ].join(' ')}
                    >
                      <span>{sub.emoji}</span>
                      <span className={['text-xs font-medium', c.text].join(' ')}>{sub.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
