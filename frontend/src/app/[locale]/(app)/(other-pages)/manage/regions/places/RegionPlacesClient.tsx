'use client'

import clsx from 'clsx'
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Save,
  Settings2,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import { listSiteSettings, upsertSiteSetting } from '@/lib/travel-api'
import {
  DEFAULT_SERVICE_POI_TYPES,
  servicePoiTypeFromLabel,
  type ServicePoiTypeDef,
} from '@/lib/service-poi-types'

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlaceType {
  id: string
  name: string
  googleType: string
  emoji: string
  radiusKm: number
  maxCount: number
  enabled: boolean
}

interface PlaceCategory {
  id: string
  name: string
  icon: string
  types: PlaceType[]
}

// ─── Öntanımlı kategoriler ────────────────────────────────────────────────────
const DEFAULT_CATEGORIES: PlaceCategory[] = [
  {
    id: 'gezilesi',
    name: 'Gezilesi Yerler',
    icon: '🏖️',
    types: [
      { id: 'beach', name: 'Plajlar', googleType: 'beach', emoji: '🏖️', radiusKm: 50, maxCount: 10, enabled: true },
      { id: 'tourist_attraction', name: 'Turistik Alanlar', googleType: 'tourist_attraction', emoji: '🏛️', radiusKm: 75, maxCount: 10, enabled: true },
      { id: 'museum', name: 'Müzeler', googleType: 'museum', emoji: '🎨', radiusKm: 50, maxCount: 8, enabled: true },
      { id: 'amusement_park', name: 'Eğlence Parkları', googleType: 'amusement_park', emoji: '🎡', radiusKm: 75, maxCount: 5, enabled: false },
      { id: 'zoo', name: 'Hayvanat Bahçeleri', googleType: 'zoo', emoji: '🦁', radiusKm: 75, maxCount: 3, enabled: false },
      { id: 'aquarium', name: 'Akvaryumlar', googleType: 'aquarium', emoji: '🐠', radiusKm: 75, maxCount: 3, enabled: false },
      { id: 'campground', name: 'Kamp Alanları', googleType: 'campground', emoji: '⛺', radiusKm: 40, maxCount: 5, enabled: false },
      { id: 'art_gallery', name: 'Sanat Galerileri', googleType: 'art_gallery', emoji: '🖼️', radiusKm: 30, maxCount: 5, enabled: false },
      { id: 'stadium', name: 'Stadyumlar', googleType: 'stadium', emoji: '⚽', radiusKm: 75, maxCount: 3, enabled: false },
    ],
  },
  {
    id: 'yeme_icme',
    name: 'Yeme & İçme',
    icon: '🍽️',
    types: [
      { id: 'restaurant', name: 'Restoranlar', googleType: 'restaurant', emoji: '🍽️', radiusKm: 5, maxCount: 10, enabled: true },
      { id: 'cafe', name: 'Kafeler', googleType: 'cafe', emoji: '☕', radiusKm: 5, maxCount: 10, enabled: false },
      { id: 'bar', name: 'Barlar', googleType: 'bar', emoji: '🍸', radiusKm: 5, maxCount: 8, enabled: false },
      { id: 'bakery', name: 'Fırın & Pastane', googleType: 'bakery', emoji: '🥐', radiusKm: 3, maxCount: 5, enabled: false },
      { id: 'night_club', name: 'Gece Kulüpleri', googleType: 'night_club', emoji: '🎵', radiusKm: 10, maxCount: 5, enabled: false },
    ],
  },
  {
    id: 'temel',
    name: 'Temel İhtiyaçlar',
    icon: '🛒',
    types: [
      { id: 'supermarket', name: 'Marketler', googleType: 'supermarket', emoji: '🛒', radiusKm: 5, maxCount: 10, enabled: true },
      { id: 'pharmacy', name: 'Eczaneler', googleType: 'pharmacy', emoji: '💊', radiusKm: 5, maxCount: 10, enabled: true },
      { id: 'hospital', name: 'Hastaneler', googleType: 'hospital', emoji: '🏥', radiusKm: 30, maxCount: 5, enabled: false },
      { id: 'bank', name: 'Bankalar', googleType: 'bank', emoji: '🏦', radiusKm: 5, maxCount: 8, enabled: false },
      { id: 'atm', name: 'ATM', googleType: 'atm', emoji: '💳', radiusKm: 3, maxCount: 10, enabled: false },
      { id: 'gas_station', name: 'Akaryakıt İstasyonları', googleType: 'gas_station', emoji: '⛽', radiusKm: 10, maxCount: 5, enabled: false },
      { id: 'shopping_mall', name: 'Alışveriş Merkezleri', googleType: 'shopping_mall', emoji: '🛍️', radiusKm: 20, maxCount: 5, enabled: false },
    ],
  },
  {
    id: 'ulasim',
    name: 'Ulaşım',
    icon: '✈️',
    types: [
      { id: 'airport', name: 'Havalimanları', googleType: 'airport', emoji: '✈️', radiusKm: 150, maxCount: 3, enabled: true },
      { id: 'bus_station', name: 'Otobüs Terminalleri', googleType: 'bus_station', emoji: '🚌', radiusKm: 30, maxCount: 5, enabled: true },
      { id: 'train_station', name: 'Tren İstasyonları', googleType: 'train_station', emoji: '🚉', radiusKm: 60, maxCount: 5, enabled: false },
      { id: 'ferry_terminal', name: 'Feribot İskelesi', googleType: 'ferry_terminal', emoji: '⛴️', radiusKm: 30, maxCount: 5, enabled: false },
      { id: 'car_rental', name: 'Araç Kiralama', googleType: 'car_rental', emoji: '🚗', radiusKm: 15, maxCount: 5, enabled: false },
      { id: 'parking', name: 'Otoparklar', googleType: 'parking', emoji: '🅿️', radiusKm: 3, maxCount: 10, enabled: false },
    ],
  },
]

const STORAGE_KEY_CONFIG = 'region_places_config_v1'

function loadConfig(): PlaceCategory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG)
    if (raw) return JSON.parse(raw) as PlaceCategory[]
  } catch { /* ignore */ }
  return DEFAULT_CATEGORIES
}

function saveConfig(cats: PlaceCategory[]) {
  try { localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cats)) } catch { /* ignore */ }
}

// ─── Kategori konfigürasyon paneli ────────────────────────────────────────────
function CategoryConfigPanel({
  categories,
  onChange,
}: {
  categories: PlaceCategory[]
  onChange: (cats: PlaceCategory[]) => void
}) {
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(['gezilesi']))
  const [editingType, setEditingType] = useState<{ catId: string; typeId: string } | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('📍')
  const [showNewCat, setShowNewCat] = useState(false)

  const toggleCat = (id: string) =>
    setOpenCats((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const updateType = (catId: string, typeId: string, patch: Partial<PlaceType>) => {
    onChange(
      categories.map((c) =>
        c.id !== catId ? c : { ...c, types: c.types.map((t) => (t.id !== typeId ? t : { ...t, ...patch })) },
      ),
    )
  }

  const removeType = (catId: string, typeId: string) =>
    onChange(categories.map((c) => c.id !== catId ? c : { ...c, types: c.types.filter((t) => t.id !== typeId) }))

  const addCategory = () => {
    if (!newCatName.trim()) return
    const id = `cat_${Date.now()}`
    onChange([...categories, { id, name: newCatName.trim(), icon: newCatIcon, types: [] }])
    setNewCatName('')
    setShowNewCat(false)
  }

  const removeCategory = (catId: string) => {
    if (!window.confirm('Bu kategori ve altındaki tüm mekan tipleri silinecek. Devam?')) return
    onChange(categories.filter((c) => c.id !== catId))
  }

  const addTypeToCategory = (catId: string) => {
    const id = `type_${Date.now()}`
    onChange(
      categories.map((c) =>
        c.id !== catId ? c : {
          ...c,
          types: [...c.types, { id, name: 'Yeni Tür', googleType: '', emoji: '📍', radiusKm: 10, maxCount: 5, enabled: false }],
        },
      ),
    )
    setEditingType({ catId, typeId: id })
  }

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const open = openCats.has(cat.id)
        const enabledCount = cat.types.filter((t) => t.enabled).length
        return (
          <div key={cat.id} className="rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center gap-3 px-4 py-3">
              <button type="button" onClick={() => toggleCat(cat.id)} className="flex flex-1 items-center gap-3 text-left">
                <span className="text-xl">{cat.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">{cat.name}</p>
                  <p className="text-xs text-neutral-500">{cat.types.length} tür · {enabledCount} aktif</p>
                </div>
                {open ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronRight className="h-4 w-4 text-neutral-400" />}
              </button>
              <button type="button" onClick={() => addTypeToCategory(cat.id)} title="Tür ekle"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800">
                <Plus className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => removeCategory(cat.id)} title="Kategoriyi sil"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {open && (
              <div className="border-t border-neutral-50 dark:border-neutral-800">
                {cat.types.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-neutral-400">Henüz tür yok. + butonuyla ekleyin.</p>
                ) : (
                  <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
                    {cat.types.map((tp) => {
                      const isEditing = editingType?.catId === cat.id && editingType.typeId === tp.id
                      return (
                        <div key={tp.id} className="px-4 py-2.5">
                          {isEditing ? (
                            <div className="grid gap-2">
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <div>
                                  <label className="mb-1 block text-[10px] font-medium text-neutral-500">Emoji</label>
                                  <input value={tp.emoji} onChange={(e) => updateType(cat.id, tp.id, { emoji: e.target.value })} maxLength={4}
                                    className="w-full rounded-lg border border-neutral-200 px-2 py-1 text-center text-sm dark:border-neutral-700 dark:bg-neutral-800" />
                                </div>
                                <div>
                                  <label className="mb-1 block text-[10px] font-medium text-neutral-500">Görünen Ad</label>
                                  <input value={tp.name} onChange={(e) => updateType(cat.id, tp.id, { name: e.target.value })}
                                    className="w-full rounded-lg border border-neutral-200 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
                                </div>
                                <div>
                                  <label className="mb-1 block text-[10px] font-medium text-neutral-500">Google Tipi</label>
                                  <input value={tp.googleType} onChange={(e) => updateType(cat.id, tp.id, { googleType: e.target.value })} placeholder="beach"
                                    className="w-full rounded-lg border border-neutral-200 px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800" />
                                </div>
                                <div className="flex items-end">
                                  <button type="button" onClick={() => setEditingType(null)}
                                    className="w-full rounded-lg bg-[color:var(--manage-primary)] px-2 py-1 text-xs font-medium text-white">
                                    Tamam
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="mb-1 block text-[10px] font-medium text-neutral-500">Yarıçap (km) · maks 50</label>
                                  <input type="number" min={1} max={50} value={tp.radiusKm}
                                    onChange={(e) => updateType(cat.id, tp.id, { radiusKm: Number(e.target.value) })}
                                    className="w-full rounded-lg border border-neutral-200 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
                                </div>
                                <div>
                                  <label className="mb-1 block text-[10px] font-medium text-neutral-500">Maks. Sonuç</label>
                                  <input type="number" min={1} max={20} value={tp.maxCount}
                                    onChange={(e) => updateType(cat.id, tp.id, { maxCount: Number(e.target.value) })}
                                    className="w-full rounded-lg border border-neutral-200 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <input type="checkbox" checked={tp.enabled}
                                onChange={(e) => updateType(cat.id, tp.id, { enabled: e.target.checked })}
                                className="h-4 w-4 rounded accent-[color:var(--manage-primary)]" />
                              <span className="text-base">{tp.emoji}</span>
                              <span className="flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">{tp.name}</span>
                              <span className="hidden font-mono text-[10px] text-neutral-400 sm:block">{tp.googleType || '—'}</span>
                              <span className="hidden text-[10px] text-neutral-400 sm:block">{tp.radiusKm} km</span>
                              <span className="hidden text-[10px] text-neutral-400 sm:block">maks {tp.maxCount}</span>
                              <button type="button" onClick={() => setEditingType({ catId: cat.id, typeId: tp.id })}
                                className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:text-neutral-600">
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button type="button" onClick={() => removeType(cat.id, tp.id)}
                                className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:text-red-500">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="px-4 py-2">
                  <button type="button" onClick={() => addTypeToCategory(cat.id)}
                    className="flex items-center gap-1 text-xs font-medium text-[color:var(--manage-primary)] hover:underline">
                    <Plus className="h-3 w-3" /> Tür ekle
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {showNewCat ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex gap-2">
            <input value={newCatIcon} onChange={(e) => setNewCatIcon(e.target.value)} maxLength={4}
              className="w-12 rounded-lg border border-neutral-200 px-2 py-2 text-center text-sm dark:border-neutral-700 dark:bg-neutral-800" />
            <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Kategori adı" autoFocus
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800" />
            <button type="button" onClick={addCategory}
              className="rounded-lg bg-[color:var(--manage-primary)] px-3 py-2 text-sm font-medium text-white">Ekle</button>
            <button type="button" onClick={() => setShowNewCat(false)}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-700">İptal</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowNewCat(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-200 py-3 text-sm font-medium text-neutral-500 hover:border-[color:var(--manage-primary)] hover:text-[color:var(--manage-primary)] dark:border-neutral-700">
          <Plus className="h-4 w-4" /> Yeni Kategori
        </button>
      )}
    </div>
  )
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export default function RegionPlacesClient() {
  const [categories, setCategories] = useState<PlaceCategory[]>([])
  const [configDirty, setConfigDirty] = useState(false)
  const [servicePoiTypes, setServicePoiTypes] = useState<ServicePoiTypeDef[]>(DEFAULT_SERVICE_POI_TYPES)
  const [servicePoiSaving, setServicePoiSaving] = useState(false)
  const [servicePoiSaved, setServicePoiSaved] = useState(false)
  const [servicePoiErr, setServicePoiErr] = useState<string | null>(null)
  const [newServicePoiDef, setNewServicePoiDef] = useState<ServicePoiTypeDef>({
    type: '',
    label: '',
    googleType: '',
    radius: 10000,
    category: 'amenity',
  })

  useEffect(() => {
    setCategories(loadConfig())
    void loadServicePoiTypes()
  }, [])

  const handleCategoriesChange = (cats: PlaceCategory[]) => {
    setCategories(cats)
    setConfigDirty(true)
  }

  const saveConfigNow = () => {
    saveConfig(categories)
    setConfigDirty(false)
  }

  async function loadServicePoiTypes() {
    const token = getStoredAuthToken()
    if (!token) return
    setServicePoiErr(null)
    try {
      const res = await listSiteSettings(token, { scope: 'platform', key: 'service_poi_types' })
      const raw = res.settings?.[0]?.value_json?.trim() ?? ''
      if (!raw) {
        setServicePoiTypes(DEFAULT_SERVICE_POI_TYPES)
        return
      }
      const parsed = JSON.parse(raw) as ServicePoiTypeDef[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        setServicePoiTypes(parsed)
      } else {
        setServicePoiTypes(DEFAULT_SERVICE_POI_TYPES)
      }
    } catch (e) {
      setServicePoiErr(formatManageApiCatch(e, 'Mesafe türleri yüklenemedi'))
    }
  }

  async function saveServicePoiTypes(nextTypes = servicePoiTypes) {
    const token = getStoredAuthToken()
    if (!token) {
      setServicePoiErr('Kaydetmek için yönetici oturumu gerekli.')
      return
    }
    setServicePoiSaving(true)
    setServicePoiSaved(false)
    setServicePoiErr(null)
    try {
      await upsertSiteSetting(token, { key: 'service_poi_types', value_json: JSON.stringify(nextTypes) })
      setServicePoiSaved(true)
      setTimeout(() => setServicePoiSaved(false), 2000)
    } catch (e) {
      setServicePoiErr(formatManageApiCatch(e, 'Mesafe türleri kaydedilemedi'))
    } finally {
      setServicePoiSaving(false)
    }
  }

  function patchServicePoiType(index: number, patch: Partial<ServicePoiTypeDef>) {
    setServicePoiTypes((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
    setServicePoiSaved(false)
  }

  function addServicePoiType() {
    const label = newServicePoiDef.label.trim()
    const googleType = newServicePoiDef.googleType.trim()
    if (!label || !googleType) return
    setServicePoiTypes((prev) => [
      ...prev,
      {
        ...newServicePoiDef,
        type: newServicePoiDef.type.trim() || servicePoiTypeFromLabel(label),
        label,
        googleType,
        radius: Number.isFinite(newServicePoiDef.radius) ? newServicePoiDef.radius : 10000,
      },
    ])
    setNewServicePoiDef({ type: '', label: '', googleType: '', radius: 10000, category: 'amenity' })
    setServicePoiSaved(false)
  }

  const enabledCount = categories.flatMap((c) => c.types.filter((t) => t.enabled)).length

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Google Maps Mekan Ayarları
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          API anahtarı ve sorgulanacak mekan türlerini burada yapılandırın.
          Bölgeye özgü mekan sorgulama işlemleri <strong>Bölge Düzenleme</strong> sayfasından yapılır.
        </p>
      </div>

      {/* Google Maps API Ayarları */}
      <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
          <Settings2 className="h-5 w-5 text-[color:var(--manage-primary)]" />
          Google Maps API Ayarları
        </h2>
        <p className="max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
          Google Maps API anahtarı tek yerden yönetilir: Yönetim → Ayarlar → Google. Bu sayfada yalnızca
          bölge mekan türleri ve yarıçapları yapılandırılır.
        </p>
      </section>

      {/* İlan Mesafe Türleri */}
      <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              İlan Mesafe Türleri
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
              İlan sayfasındaki “Mesafeler” bölümünde gösterilecek mekan etiketi, Google tipi ve arama mesafesi.
              Kategori: <strong>amenity</strong> → Temel İhtiyaçlar, <strong>transport</strong> → Ulaşım.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setServicePoiTypes(DEFAULT_SERVICE_POI_TYPES)
                setServicePoiSaved(false)
              }}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Varsayılana sıfırla
            </button>
            <button
              type="button"
              disabled={servicePoiSaving}
              onClick={() => void saveServicePoiTypes()}
              className="flex items-center gap-1.5 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {servicePoiSaving ? 'Kaydediliyor…' : servicePoiSaved ? 'Kaydedildi' : 'Kaydet'}
            </button>
          </div>
        </div>

        {servicePoiErr ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {servicePoiErr}
          </p>
        ) : null}

        <div className="space-y-2">
          {servicePoiTypes.map((def, i) => (
            <div
              key={`${def.type}-${i}`}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-950/40"
            >
              <span
                className={clsx(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  def.category === 'transport'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                )}
              >
                {def.category}
              </span>
              <input
                className="w-32 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                value={def.label}
                onChange={(e) => {
                  const label = e.target.value
                  patchServicePoiType(i, { label, type: def.type || servicePoiTypeFromLabel(label) })
                }}
                placeholder="Mekan etiketi"
              />
              <input
                className="w-44 rounded-lg border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
                value={def.googleType}
                onChange={(e) => patchServicePoiType(i, { googleType: e.target.value })}
                placeholder="Google Places tipi"
              />
              <input
                type="number"
                min={100}
                className="w-28 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                value={def.radius}
                onChange={(e) => patchServicePoiType(i, { radius: Number(e.target.value) })}
                placeholder="Mesafe (m)"
              />
              <select
                className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                value={def.category}
                onChange={(e) => patchServicePoiType(i, { category: e.target.value as 'amenity' | 'transport' })}
              >
                <option value="amenity">amenity</option>
                <option value="transport">transport</option>
              </select>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setServicePoiTypes((prev) => {
                      if (i === 0) return prev
                      const next = [...prev]
                      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                      return next
                    })
                    setServicePoiSaved(false)
                  }}
                  disabled={i === 0}
                  className="rounded px-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServicePoiTypes((prev) => {
                      if (i >= prev.length - 1) return prev
                      const next = [...prev]
                      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                      return next
                    })
                    setServicePoiSaved(false)
                  }}
                  disabled={i === servicePoiTypes.length - 1}
                  className="rounded px-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServicePoiTypes((prev) => prev.filter((_, j) => j !== i))
                    setServicePoiSaved(false)
                  }}
                  className="rounded px-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
          <input
            className="w-32 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
            value={newServicePoiDef.label}
            onChange={(e) => {
              const label = e.target.value
              setNewServicePoiDef({ ...newServicePoiDef, label, type: servicePoiTypeFromLabel(label) })
            }}
            placeholder="Mekan etiketi"
          />
          <input
            className="w-44 rounded-lg border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
            value={newServicePoiDef.googleType}
            onChange={(e) => setNewServicePoiDef({ ...newServicePoiDef, googleType: e.target.value })}
            placeholder="Google Places tipi"
          />
          <input
            type="number"
            min={100}
            className="w-28 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
            value={newServicePoiDef.radius}
            onChange={(e) => setNewServicePoiDef({ ...newServicePoiDef, radius: Number(e.target.value) })}
            placeholder="Mesafe (m)"
          />
          <select
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
            value={newServicePoiDef.category}
            onChange={(e) => setNewServicePoiDef({ ...newServicePoiDef, category: e.target.value as 'amenity' | 'transport' })}
          >
            <option value="amenity">amenity</option>
            <option value="transport">transport</option>
          </select>
          <button
            type="button"
            disabled={!newServicePoiDef.label.trim() || !newServicePoiDef.googleType.trim()}
            onClick={addServicePoiType}
            className="rounded-lg bg-neutral-800 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-40 dark:bg-neutral-200 dark:text-neutral-900"
          >
            + Ekle
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          Kaydettikten sonra AI sayfasındaki “Servis Mekan Koordinatları” batch işlemi bu listeyi kullanır.
        </p>
      </section>

      {/* Sorgulanacak Mekan Türleri */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              Sorgulanacak Mekan Türleri
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              {enabledCount} aktif tür · Bu yapılandırma tüm bölge sorgulamalarında kullanılır.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (!window.confirm('Tüm yapılandırmayı varsayılana sıfırla?')) return
                setCategories(DEFAULT_CATEGORIES)
                saveConfig(DEFAULT_CATEGORIES)
                setConfigDirty(false)
              }}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700"
            >
              Varsayılana sıfırla
            </button>
            <button
              type="button"
              onClick={saveConfigNow}
              disabled={!configDirty}
              className={clsx(
                'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all',
                configDirty
                  ? 'bg-[color:var(--manage-primary)] hover:opacity-90'
                  : 'cursor-default bg-neutral-300 dark:bg-neutral-700',
              )}
            >
              <Save className="h-4 w-4" />
              Kaydet
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300">
          💡 Bölgeye özgü mekan sorgulama için ilgili bölgeyi açın ve <strong>Mekanlara Uzaklıklar</strong> kartını kullanın.
        </div>

        <CategoryConfigPanel categories={categories} onChange={handleCategoriesChange} />
      </section>
    </div>
  )
}
