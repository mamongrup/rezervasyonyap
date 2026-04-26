'use client'

import {
  addNavMenuItem,
  createNavMenu,
  createSitePopup,
  deleteNavMenuItem,
  deleteSitePopup,
  listNavMenuItems,
  listNavMenus,
  listSitePopups,
  patchNavMenuItem,
  patchSitePopup,
  type NavMenu,
  type NavMenuItem,
  type SitePopup,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import clsx from 'clsx'
import {
  AlertCircle,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Globe,
  GripVertical,
  Link as LinkIcon,
  Loader2,
  Megaphone,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Bell,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Menu Item Row ─────────────────────────────────────────────────────────────
function MenuItemRow({
  item,
  items,
  token,
  menuId,
  onRefresh,
  busy,
  setBusy,
  isDragOver,
}: {
  item: NavMenuItem
  items: NavMenuItem[]
  token: string
  menuId: string
  onRefresh: () => void
  busy: boolean
  setBusy: (v: boolean) => void
  isDragOver?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(item.label_key)
  const [url, setUrl] = useState(item.url ?? '')
  const [sort, setSort] = useState(String(item.sort_order))
  const [err, setErr] = useState<string | null>(null)

  const parentItem = items.find((i) => i.id === item.parent_id)
  const isPublished = item.is_published !== false

  const save = async () => {
    setBusy(true)
    setErr(null)
    try {
      await patchNavMenuItem(token, menuId, item.id, {
        label_key: label.trim(),
        url: url.trim(),
        sort_order: Number(sort) || 0,
      })
      setEditing(false)
      onRefresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setBusy(false)
    }
  }

  const togglePublish = async () => {
    setBusy(true)
    try {
      await patchNavMenuItem(token, menuId, item.id, { is_published: !isPublished })
      onRefresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Güncellenemedi')
    } finally {
      setBusy(false)
    }
  }

  const del = async () => {
    if (!confirm(`"${item.label_key}" öğesini silmek istediğinizden emin misiniz?`)) return
    setBusy(true)
    try {
      await deleteNavMenuItem(token, menuId, item.id)
      onRefresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Silinemedi')
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Menü Öğesi Adı</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Bağlantı URL&apos;si</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/oteller"
              className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Sıra Numarası</label>
            <input
              type="number"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Kaydet
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 rounded-xl text-sm border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            İptal
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx(
      "flex items-center gap-2 px-3 py-3 rounded-xl border bg-white dark:bg-neutral-900 hover:shadow-sm transition-all",
      isDragOver
        ? "border-primary-400 dark:border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800"
        : "border-neutral-100 dark:border-neutral-800",
      !isPublished && "opacity-60",
    )}>
      {/* Sürükleme tutamacı — yalnızca üst öğelerde görünür */}
      {!item.parent_id ? (
        <GripVertical className="w-4 h-4 text-neutral-300 dark:text-neutral-600 flex-shrink-0 cursor-grab active:cursor-grabbing" />
      ) : (
        <ChevronRight className="w-3.5 h-3.5 text-neutral-300 flex-shrink-0 ms-1" />
      )}

      <div className="flex-1 min-w-0">
        <p className={clsx("font-medium text-sm truncate", isPublished ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-neutral-500 line-through")}>
          {item.label_key}
        </p>
        {item.url && (
          <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5 truncate">
            <LinkIcon className="w-3 h-3 flex-shrink-0" />
            {item.url}
          </p>
        )}
        {parentItem && (
          <p className="text-xs text-neutral-400 mt-0.5">Alt öğe → {parentItem.label_key}</p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Aktif/Pasif toggle */}
        <button
          onClick={togglePublish}
          disabled={busy}
          title={isPublished ? 'Pasife al' : 'Aktif et'}
          className={clsx(
            "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50",
            isPublished
              ? "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
              : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-500",
          )}
        >
          {isPublished
            ? <><ToggleRight className="w-3.5 h-3.5" /><span className="hidden sm:inline">Aktif</span></>
            : <><ToggleLeft className="w-3.5 h-3.5" /><span className="hidden sm:inline">Pasif</span></>
          }
        </button>

        {/* Düzenle */}
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-primary-600"
          title="Düzenle"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        {/* Sil */}
        <button
          onClick={del}
          disabled={busy}
          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 hover:text-red-500 disabled:opacity-50"
          title="Sil"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {err && <p className="text-xs text-red-500 absolute bottom-0">{err}</p>}
    </div>
  )
}

// ─── Popup Row ────────────────────────────────────────────────────────────────
const POPUP_TYPE_LABELS: Record<string, string> = {
  campaign: 'Kampanya',
  generic: 'Genel',
  cookie_notice: 'Çerez Bildirimi',
}

function PopupRow({
  popup,
  token,
  onRefresh,
  busy,
  setBusy,
}: {
  popup: SitePopup
  token: string
  onRefresh: () => void
  busy: boolean
  setBusy: (v: boolean) => void
}) {
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState(popup.popup_type)
  const [key, setKey] = useState(popup.content_key)
  const [active, setActive] = useState(popup.active)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    setBusy(true)
    setErr(null)
    try {
      await patchSitePopup(token, popup.id, { popup_type: type, content_key: key.trim(), active })
      setEditing(false)
      onRefresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setBusy(false)
    }
  }

  const del = async () => {
    if (!confirm(`"${popup.content_key}" popup'ını silmek istediğinizden emin misiniz?`)) return
    setBusy(true)
    try {
      await deleteSitePopup(token, popup.id)
      onRefresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Silinemedi')
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Popup Türü</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800"
            >
              <option value="campaign">Kampanya</option>
              <option value="generic">Genel</option>
              <option value="cookie_notice">Çerez Bildirimi</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Tanımlayıcı Kod</label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setActive((v) => !v)} className={clsx('transition-colors', active ? 'text-green-500' : 'text-neutral-400')}>
            {active ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
          </button>
          <span className="text-sm">{active ? 'Aktif' : 'Pasif'}</span>
        </div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <div className="flex gap-2">
          <button onClick={save} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm hover:bg-primary-700 disabled:opacity-50">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Kaydet
          </button>
          <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl text-sm border border-neutral-200 dark:border-neutral-700">İptal</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', popup.active ? 'bg-green-500' : 'bg-neutral-300')} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{popup.content_key}</p>
        <p className="text-xs text-neutral-400 mt-0.5">{POPUP_TYPE_LABELS[popup.popup_type] ?? popup.popup_type}</p>
      </div>
      <span className={clsx('text-xs px-2 py-0.5 rounded-full flex-shrink-0', popup.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-neutral-100 text-neutral-500')}>
        {popup.active ? 'Aktif' : 'Pasif'}
      </span>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-primary-600">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={del} disabled={busy} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 hover:text-red-500 disabled:opacity-50">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminNavigationSection() {
  const [tab, setTab] = useState<'menus' | 'popups'>('menus')
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [menus, setMenus] = useState<NavMenu[]>([])
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const [items, setItems] = useState<NavMenuItem[]>([])
  const [loadingMenus, setLoadingMenus] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)

  const [newMenuCode, setNewMenuCode] = useState('main')
  const [showNewMenu, setShowNewMenu] = useState(false)

  const [newLabel, setNewLabel] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newSort, setNewSort] = useState('0')
  const [newParent, setNewParent] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [addItemErr, setAddItemErr] = useState<string | null>(null)

  // Drag-and-drop sıralama
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragIdRef = useRef<string | null>(null)

  const [popups, setPopups] = useState<SitePopup[]>([])
  const [loadingPopups, setLoadingPopups] = useState(false)
  const [showNewPopup, setShowNewPopup] = useState(false)
  const [newPopType, setNewPopType] = useState('generic')
  const [newPopKey, setNewPopKey] = useState('')
  const [newPopActive, setNewPopActive] = useState(true)
  const [newPopErr, setNewPopErr] = useState<string | null>(null)

  const refreshMenus = useCallback(async () => {
    setLoadingMenus(true)
    setLoadErr(null)
    try {
      const r = await listNavMenus()
      const sorted = [...r.menus].sort((a, b) => {
        const byCode = a.code.localeCompare(b.code)
        if (byCode !== 0) return byCode
        const aGlobal = a.organization_id == null || a.organization_id === ''
        const bGlobal = b.organization_id == null || b.organization_id === ''
        if (aGlobal && !bGlobal) return -1
        if (!aGlobal && bGlobal) return 1
        return (a.organization_id ?? '').localeCompare(b.organization_id ?? '')
      })
      setMenus(sorted)
      setSelectedMenuId((prev) => {
        if (sorted.length === 0) return null
        if (prev && sorted.some((m) => m.id === prev)) return prev
        const heroGlobal = sorted.find(
          (m) => m.code === 'hero_search' && (m.organization_id == null || m.organization_id === ''),
        )
        const heroAny = sorted.find((m) => m.code === 'hero_search')
        return (heroGlobal ?? heroAny ?? sorted[0]!).id
      })
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Menüler yüklenemedi')
    } finally {
      setLoadingMenus(false)
    }
  }, [])

  const refreshItems = useCallback(async () => {
    if (!selectedMenuId) { setItems([]); return }
    setLoadingItems(true)
    try {
      const r = await listNavMenuItems(selectedMenuId)
      setItems(r.items.sort((a, b) => a.sort_order - b.sort_order))
    } catch {
      /* ignore */
    } finally {
      setLoadingItems(false)
    }
  }, [selectedMenuId])

  const refreshPopups = useCallback(async () => {
    setLoadingPopups(true)
    try {
      const r = await listSitePopups()
      setPopups(r.popups)
    } catch {
      /* ignore */
    } finally {
      setLoadingPopups(false)
    }
  }, [])

  useEffect(() => { void refreshMenus() }, [refreshMenus])
  useEffect(() => { void refreshItems() }, [refreshItems])
  useEffect(() => { if (tab === 'popups') void refreshPopups() }, [tab, refreshPopups])

  const handleCreateMenu = async () => {
    const token = getStoredAuthToken()
    if (!token || !newMenuCode.trim()) return
    setBusy(true)
    try {
      await createNavMenu(token, { code: newMenuCode.trim() })
      setShowNewMenu(false)
      setNewMenuCode('main')
      await refreshMenus()
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Menü oluşturulamadı')
    } finally {
      setBusy(false)
    }
  }

  const handleAddItem = async () => {
    const token = getStoredAuthToken()
    if (!token || !selectedMenuId || !newLabel.trim()) { setAddItemErr('Menü öğesi adı gerekli'); return }
    setBusy(true)
    setAddItemErr(null)
    try {
      await addNavMenuItem(token, selectedMenuId, {
        label_key: newLabel.trim(),
        url: newUrl.trim() || undefined,
        sort_order: Number(newSort) || 0,
        parent_id: newParent.trim() || undefined,
        mega_content_json: '{}',
      })
      setNewLabel(''); setNewUrl(''); setNewSort('0'); setNewParent('')
      setShowAddItem(false)
      await refreshItems()
    } catch (e) {
      setAddItemErr(e instanceof Error ? e.message : 'Öğe eklenemedi')
    } finally {
      setBusy(false)
    }
  }

  const handleCreatePopup = async () => {
    const token = getStoredAuthToken()
    if (!token || !newPopKey.trim()) { setNewPopErr('Tanımlayıcı kod gerekli'); return }
    setBusy(true)
    setNewPopErr(null)
    try {
      await createSitePopup(token, {
        popup_type: newPopType,
        content_key: newPopKey.trim(),
        rules_json: '{}',
        active: newPopActive,
      })
      setShowNewPopup(false)
      setNewPopKey('')
      await refreshPopups()
    } catch (e) {
      setNewPopErr(e instanceof Error ? e.message : 'Popup oluşturulamadı')
    } finally {
      setBusy(false)
    }
  }

  const handleReorder = useCallback(async (fromId: string, toId: string) => {
    if (fromId === toId) return
    const topLevel = items.filter((i) => !i.parent_id).sort((a, b) => a.sort_order - b.sort_order)
    const fromIdx = topLevel.findIndex((i) => i.id === fromId)
    const toIdx = topLevel.findIndex((i) => i.id === toId)
    if (fromIdx === -1 || toIdx === -1) return

    const reordered = [...topLevel]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved!)
    const updates = reordered.map((item, idx) => ({ id: item.id, sort_order: (idx + 1) * 10 }))

    // Anlık güncelleme (optimistic)
    setItems((prev) =>
      prev.map((item) => {
        const u = updates.find((u) => u.id === item.id)
        return u ? { ...item, sort_order: u.sort_order } : item
      }),
    )

    const token = getStoredAuthToken()
    if (!token || !selectedMenuId) return
    setBusy(true)
    try {
      await Promise.all(updates.map(({ id, sort_order }) => patchNavMenuItem(token, selectedMenuId!, id, { sort_order })))
    } catch {
      await refreshItems()
    } finally {
      setBusy(false)
    }
  }, [items, selectedMenuId, refreshItems])

  const selectedMenu = menus.find((m) => m.id === selectedMenuId)
  const topLevelItems = items.filter((i) => !i.parent_id).sort((a, b) => a.sort_order - b.sort_order)
  const childItems = (parentId: string) => items.filter((i) => i.parent_id === parentId)

  const MENU_CODE_LABELS: Record<string, string> = {
    header: 'Üst şerit (site header)',
    main: 'Ana Navigasyon',
    footer: 'Alt Bilgi Menüsü',
    hero_search: 'Hero Arama Menüsü',
    mobile: 'Mobil Menü',
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Navigasyon Yönetimi</h1>
            <p className="text-sm text-neutral-500 mt-1">Site menüleri ve popup bildirimleri</p>
          </div>
          <button
            onClick={() => { void refreshMenus(); void refreshPopups() }}
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loadErr && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {loadErr}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-neutral-900 rounded-2xl p-1 shadow-sm border border-neutral-200 dark:border-neutral-800 w-fit">
          {[
            { key: 'menus', label: 'Menüler', icon: Menu },
            { key: 'popups', label: 'Popuplar', icon: Bell },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                tab === key ? 'bg-primary-600 text-white' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── MENUS TAB ─────────────────────────────────────────────────────── */}
        {tab === 'menus' && (
          <div className="space-y-6">

            {/* Info box */}
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p className="font-semibold flex items-center gap-2"><Globe className="w-4 h-4" /> Menüler nasıl çalışır?</p>
              <p>
                Her menünün bir <strong>kodu</strong> vardır. Üst şerit:{' '}
                <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-xs">header</code> →{' '}
                <strong>GET …/navigation/public/menus/header/items</strong>. Alt bilgi / ekstra bloklar için{' '}
                <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-xs">footer</code>, hero arama için{' '}
                <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-xs">hero_search</code>,{' '}
                <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-xs">main</code> /{' '}
                <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-xs">mobile</code> şablon uyumluluğu içindir.
              </p>
            </div>

            {/* Menu list */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <h2 className="font-semibold text-neutral-900 dark:text-white">Mevcut Menüler</h2>
                <button
                  onClick={() => setShowNewMenu((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm bg-primary-600 text-white hover:bg-primary-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Yeni Menü
                </button>
              </div>

              {showNewMenu && (
                <div className="px-5 py-4 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 space-y-3">
                  <p className="text-sm font-medium">Yeni menü oluştur</p>
                  <div className="flex gap-3 flex-wrap items-end">
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-xs text-neutral-500 mb-1">Menü Kodu</label>
                      <input
                        value={newMenuCode}
                        onChange={(e) => setNewMenuCode(e.target.value)}
                        placeholder="main, footer, mobile…"
                        className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <p className="text-xs text-neutral-400 mt-1">Önerilen: header · main · footer · mobile</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCreateMenu} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm hover:bg-primary-700 disabled:opacity-50">
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Oluştur
                      </button>
                      <button onClick={() => setShowNewMenu(false)} className="px-4 py-2 rounded-xl text-sm border border-neutral-200 dark:border-neutral-700">İptal</button>
                    </div>
                  </div>
                </div>
              )}

              {loadingMenus ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
              ) : menus.length === 0 ? (
                <div className="text-center py-10 text-neutral-500 text-sm">Henüz menü yok</div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {menus.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMenuId(m.id)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors',
                        selectedMenuId === m.id
                          ? 'bg-primary-50 dark:bg-primary-900/10'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
                      )}
                    >
                      <Menu className={clsx('w-4 h-4 flex-shrink-0', selectedMenuId === m.id ? 'text-primary-500' : 'text-neutral-400')} />
                      <div className="flex-1 min-w-0">
                        <p className={clsx('font-medium text-sm', selectedMenuId === m.id ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-900 dark:text-white')}>
                          {MENU_CODE_LABELS[m.code] ?? m.code}
                        </p>
                        <p className="text-xs text-neutral-400 font-mono">
                          {m.code}
                          {m.organization_id
                            ? ` · org ${m.organization_id.slice(0, 8)}…`
                            : ' · site geneli'}
                        </p>
                      </div>
                      <ChevronRight className={clsx('w-4 h-4 flex-shrink-0 transition-transform', selectedMenuId === m.id ? 'text-primary-400 rotate-90' : 'text-neutral-300')} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Menu items */}
            {selectedMenu && (
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-neutral-900 dark:text-white">
                      {MENU_CODE_LABELS[selectedMenu.code] ?? selectedMenu.code} — Öğeler
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">{items.length} öğe · Sıralarını değiştirmek için öğeleri sürükleyin</p>
                  </div>
                  <button
                    onClick={() => { setShowAddItem((v) => !v); setAddItemErr(null) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm bg-primary-600 text-white hover:bg-primary-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Öğe Ekle
                  </button>
                </div>

                {selectedMenu.code === 'header' && (
                  <div className="px-5 py-3 border-b border-amber-100 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <p className="font-medium">Kategoriler mega menüsü</p>
                    <p>
                      “Kategoriler” satırı için öğenin <code className="font-mono bg-amber-100/80 dark:bg-amber-900/50 px-1 rounded">mega_content_json</code> alanında{' '}
                      <code className="font-mono bg-amber-100/80 dark:bg-amber-900/50 px-1 rounded">{'{"mergeMegaMenu":true}'}</code> kullanın; böylece kategori ızgarası ve alt linkler site ayarlarındaki mega menü ile birleşir.
                    </p>
                    <p className="text-amber-800/90 dark:text-amber-300/90">
                      Öğe eklerken şu an varsayılan <code className="font-mono">{"{}"}</code> yazılır; veritabanında veya ileride düzenleme ile bu JSON güncellenebilir.
                    </p>
                  </div>
                )}

                {showAddItem && (
                  <div className="px-5 py-4 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 space-y-3">
                    <p className="text-sm font-medium">Yeni menü öğesi</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">Menü Öğesi Adı *</label>
                        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Oteller" className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">Bağlantı URL&apos;si</label>
                        <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="/oteller" className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">Sıra Numarası</label>
                        <input type="number" value={newSort} onChange={(e) => setNewSort(e.target.value)} className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">Üst Öğe (alt menü için)</label>
                        <select value={newParent} onChange={(e) => setNewParent(e.target.value)} className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800">
                          <option value="">— Üst düzey (alt menü değil)</option>
                          {topLevelItems.map((i) => (
                            <option key={i.id} value={i.id}>{i.label_key}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {addItemErr && <p className="text-sm text-red-500">{addItemErr}</p>}
                    <div className="flex gap-2">
                      <button onClick={handleAddItem} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm hover:bg-primary-700 disabled:opacity-50">
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Ekle
                      </button>
                      <button onClick={() => setShowAddItem(false)} className="px-4 py-2 rounded-xl text-sm border border-neutral-200 dark:border-neutral-700">İptal</button>
                    </div>
                  </div>
                )}

                <div className="p-4 space-y-2">
                  {loadingItems ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                    </div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 text-sm">
                      <LinkIcon className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                      Henüz öğe yok. &ldquo;Öğe Ekle&rdquo; ile başlayın.
                    </div>
                  ) : (
                    <>
                      {topLevelItems.map((item) => (
                        <div
                          key={item.id}
                          className="space-y-1"
                          draggable
                          onDragStart={() => { dragIdRef.current = item.id; setDragId(item.id) }}
                          onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id) }}
                          onDrop={() => {
                            const from = dragIdRef.current
                            setDragId(null); setDragOverId(null); dragIdRef.current = null
                            if (from) void handleReorder(from, item.id)
                          }}
                          onDragEnd={() => { setDragId(null); setDragOverId(null); dragIdRef.current = null }}
                        >
                          <MenuItemRow
                            item={item}
                            items={items}
                            token={getStoredAuthToken() ?? ''}
                            menuId={selectedMenuId!}
                            onRefresh={refreshItems}
                            busy={busy}
                            setBusy={setBusy}
                            isDragOver={dragOverId === item.id && dragId !== item.id}
                          />
                          {childItems(item.id).map((child) => (
                            <div key={child.id} className="ms-6">
                              <MenuItemRow item={child} items={items} token={getStoredAuthToken() ?? ''} menuId={selectedMenuId!} onRefresh={refreshItems} busy={busy} setBusy={setBusy} />
                            </div>
                          ))}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── POPUPS TAB ────────────────────────────────────────────────────── */}
        {tab === 'popups' && (
          <div className="space-y-6">

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <p className="font-semibold flex items-center gap-2"><Megaphone className="w-4 h-4" /> Popuplar nasıl çalışır?</p>
              <p>Site popup&apos;ları ziyaretçilere gösterilen bildirimlerdir. <strong>Kampanya</strong> popup&apos;ları promosyon teklifleri, <strong>Çerez Bildirimi</strong> GDPR/KVKK için kullanılır.</p>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <h2 className="font-semibold text-neutral-900 dark:text-white">Popup Listesi</h2>
                <button
                  onClick={() => { setShowNewPopup((v) => !v); setNewPopErr(null) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm bg-primary-600 text-white hover:bg-primary-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Yeni Popup
                </button>
              </div>

              {showNewPopup && (
                <div className="px-5 py-4 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 space-y-3">
                  <p className="text-sm font-medium">Yeni popup oluştur</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">Popup Türü</label>
                      <select value={newPopType} onChange={(e) => setNewPopType(e.target.value)} className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800">
                        <option value="campaign">Kampanya</option>
                        <option value="generic">Genel</option>
                        <option value="cookie_notice">Çerez Bildirimi</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">Tanımlayıcı Kod *</label>
                      <input value={newPopKey} onChange={(e) => setNewPopKey(e.target.value)} placeholder="yaz-indirimi, cookie-tr…" className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-800 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      <p className="text-xs text-neutral-400 mt-1">Popup içeriğini tanımlamak için kullanılır</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setNewPopActive((v) => !v)} className={clsx('transition-colors', newPopActive ? 'text-green-500' : 'text-neutral-400')}>
                      {newPopActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                    </button>
                    <span className="text-sm">{newPopActive ? 'Aktif olarak oluştur' : 'Pasif olarak oluştur'}</span>
                  </div>
                  {newPopErr && <p className="text-sm text-red-500">{newPopErr}</p>}
                  <div className="flex gap-2">
                    <button onClick={handleCreatePopup} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm hover:bg-primary-700 disabled:opacity-50">
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Oluştur
                    </button>
                    <button onClick={() => setShowNewPopup(false)} className="px-4 py-2 rounded-xl text-sm border border-neutral-200 dark:border-neutral-700">İptal</button>
                  </div>
                </div>
              )}

              <div className="p-4 space-y-2">
                {loadingPopups ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                  </div>
                ) : popups.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 text-sm">
                    <Bell className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    Henüz popup yok
                  </div>
                ) : (
                  popups.map((p) => (
                    <PopupRow key={p.id} popup={p} token={getStoredAuthToken() ?? ''} onRefresh={refreshPopups} busy={busy} setBusy={setBusy} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
