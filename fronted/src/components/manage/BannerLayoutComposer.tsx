'use client'

import {
  type FreeformBannerDocV2,
  type FreeformLayer,
  SNAP_THRESHOLD,
  clamp01,
  docToJson,
  freeformToReactSnippet,
  parseFreeformDoc,
  snapMoveBox1D,
  snapResizeBox,
} from '@/lib/freeform-banner-spec'
import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type GuideLine = { id: string; axis: 'h' | 'v'; pos: number }

function guidesToDocShape(lines: GuideLine[]): { horizontal: number[]; vertical: number[] } {
  const horizontal = lines
    .filter((g) => g.axis === 'h')
    .map((g) => g.pos)
    .sort((a, b) => a - b)
  const vertical = lines
    .filter((g) => g.axis === 'v')
    .map((g) => g.pos)
    .sort((a, b) => a - b)
  return { horizontal, vertical }
}

/** BOM / sondaki virgül; `[...]` yer tutucusu JSON değildir */
function parseBannerImportJson(text: string): unknown {
  let t = text.replace(/^\uFEFF/, '').trim()
  if (t === '') throw new Error('Alan boş.')
  if (/\[\s*\.\.\.\s*\]/.test(t)) {
    throw new Error(
      'Geçersiz "[...]" kullanımı. Üstteki dışa aktarılan tam JSON\'u yapıştırın (yer tutucu bırakmayın).',
    )
  }
  t = t.replace(/,(\s*[}\]])/g, '$1')
  return JSON.parse(t) as unknown
}

function docShapeToGuides(doc: { horizontal: number[]; vertical: number[] }): GuideLine[] {
  const out: GuideLine[] = []
  doc.horizontal.forEach((pos, i) => {
    out.push({ id: `guide-h-${i}-${pos}`, axis: 'h', pos })
  })
  doc.vertical.forEach((pos, i) => {
    out.push({ id: `guide-v-${i}-${pos}`, axis: 'v', pos })
  })
  return out
}

/** 16:9 şablonu: dikey kılavuz yoksa tam ortada (%50) bir tane ekle — sol/sağ çalışması için */
function ensure16x9CenterGuide(
  aspect: FreeformBannerDocV2['outerAspect'],
  guides: GuideLine[],
): GuideLine[] {
  if (aspect !== '16/9') return guides
  if (guides.some((g) => g.axis === 'v')) return guides
  return [...guides, { id: newId(), axis: 'v', pos: 0.5 }]
}

const ASPECTS: FreeformBannerDocV2['outerAspect'][] = ['16/9', '21/9', '2/1', '4/3']

/** Editör katmanı — hangi galeri sırası (0,1,2) bu kutuya bağlı */
type ComposerLayer = FreeformLayer & { gallerySlot: 0 | 1 | 2 }

function newId(): string {
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function nextGallerySlot(existing: { gallerySlot: 0 | 1 | 2 }[]): 0 | 1 | 2 {
  const used = new Set(existing.map((l) => l.gallerySlot))
  for (const s of [0, 1, 2] as const) {
    if (!used.has(s)) return s
  }
  return 2
}

function defaultLayer(
  src: string,
  gallerySlot: 0 | 1 | 2,
  aspect: FreeformBannerDocV2['outerAspect'],
): ComposerLayer {
  if (aspect === '16/9') {
    const w = 0.44
    const h = 0.46
    const x = 0.52
    return {
      id: newId(),
      x,
      y: (1 - h) / 2,
      w: Math.min(w, 1 - x - 0.01),
      h,
      focusX: 50,
      focusY: 50,
      src,
      gallerySlot,
    }
  }
  const w = 0.38
  const h = 0.42
  return {
    id: newId(),
    x: (1 - w) / 2,
    y: (1 - h) / 2,
    w,
    h,
    focusX: 50,
    focusY: 50,
    src,
    gallerySlot,
  }
}

type DragKind =
  | { type: 'move'; id: string; offsetX: number; offsetY: number; w: number; h: number }
  | {
      type: 'resize'
      id: string
      handle: 'nw' | 'ne' | 'sw' | 'se'
      startX: number
      startY: number
      ox: number
      oy: number
      ow: number
      oh: number
    }
  | { type: 'crop'; id: string; startX: number; startY: number; ofx: number; ofy: number }
  | { type: 'guide'; id: string; axis: 'h' | 'v'; startPos: number; startNorm: number }

export default function BannerLayoutComposer() {
  const boardRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<DragKind | null>(null)
  const [aspect, setAspect] = useState<FreeformBannerDocV2['outerAspect']>('16/9')
  const [layers, setLayers] = useState<ComposerLayer[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [cropMode, setCropMode] = useState(false)
  const [jsonImport, setJsonImport] = useState('')
  const [importErr, setImportErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [guides, setGuides] = useState<GuideLine[]>([])
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null)

  const selected = layers.find((l) => l.id === selectedId) ?? null

  const vGuidePos = useMemo(() => guides.filter((g) => g.axis === 'v').map((g) => g.pos), [guides])
  const hGuidePos = useMemo(() => guides.filter((g) => g.axis === 'h').map((g) => g.pos), [guides])

  const exportDoc = useCallback((): FreeformBannerDocV2 => {
    const g = guidesToDocShape(guides)
    const hasGuides = g.horizontal.length > 0 || g.vertical.length > 0
    return {
      version: 2,
      outerAspect: aspect,
      layers: layers.map((l) => ({
        id: l.id,
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
        focusX: l.focusX,
        focusY: l.focusY,
        slotIndex: l.gallerySlot,
        ...(l.src.startsWith('blob:') ? {} : { src: l.src }),
      })),
      ...(hasGuides ? { guides: g } : {}),
    }
  }, [aspect, layers, guides])

  const copyLayoutJson = async () => {
    await navigator.clipboard.writeText(docToJson(exportDoc()))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const copyReact = async () => {
    await navigator.clipboard.writeText(freeformToReactSnippet(aspect))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const applyImport = () => {
    try {
      const raw = parseBannerImportJson(jsonImport)
      const doc = parseFreeformDoc(raw)
      if (!doc) {
        setImportErr('Geçersiz JSON (version: 2, outerAspect, layers gerekli).')
        return
      }
      setAspect(doc.outerAspect)
      setLayers(
        doc.layers.map((l, i) => ({
          ...l,
          src: l.src ?? '',
          gallerySlot: Math.min(2, Math.max(0, l.slotIndex ?? i)) as 0 | 1 | 2,
        })),
      )
      {
        const base = doc.guides ? docShapeToGuides(doc.guides) : []
        setGuides(ensure16x9CenterGuide(doc.outerAspect, base))
      }
      setSelectedGuideId(null)
      setImportErr(null)
    } catch (e) {
      const msg =
        e instanceof SyntaxError
          ? `JSON sözdizimi: ${e.message}`
          : e instanceof Error
            ? e.message
            : 'JSON ayrıştırılamadı.'
      setImportErr(msg)
    }
  }

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    setLayers((prev) => {
      const toAdd: ComposerLayer[] = []
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        if (!f.type.startsWith('image/')) continue
        const slot = nextGallerySlot([...prev, ...toAdd])
        toAdd.push(defaultLayer(URL.createObjectURL(f), slot, aspect))
      }
      if (toAdd.length === 0) return prev
      const newId = toAdd[toAdd.length - 1]!.id
      setTimeout(() => setSelectedId(newId), 0)
      return [...prev, ...toAdd]
    })
  }


  const getBoardRect = () => boardRef.current?.getBoundingClientRect()

  const updateLayer = useCallback((id: string, patch: Partial<ComposerLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }, [])

  const updateGuidePos = useCallback((id: string, pos: number) => {
    setGuides((prev) => prev.map((g) => (g.id === id ? { ...g, pos: clamp01(pos) } : g)))
  }, [])

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current
      const rect = getBoardRect()
      if (!d || !rect) return
      const nx = clamp01((e.clientX - rect.left) / rect.width)
      const ny = clamp01((e.clientY - rect.top) / rect.height)

      if (d.type === 'guide') {
        const delta = d.axis === 'v' ? nx - d.startNorm : ny - d.startNorm
        updateGuidePos(d.id, d.startPos + delta)
        return
      }

      if (d.type === 'move') {
        const rawX = nx - d.offsetX
        const rawY = ny - d.offsetY
        let x = clamp01(Math.min(rawX, 1 - d.w))
        let y = clamp01(Math.min(rawY, 1 - d.h))
        x = snapMoveBox1D(x, d.w, vGuidePos, SNAP_THRESHOLD)
        y = snapMoveBox1D(y, d.h, hGuidePos, SNAP_THRESHOLD)
        updateLayer(d.id, { x, y })
        return
      }

      if (d.type === 'crop') {
        const px = (e.clientX - d.startX) * 0.35
        const py = (e.clientY - d.startY) * 0.35
        updateLayer(d.id, {
          focusX: Math.min(100, Math.max(0, d.ofx - px)),
          focusY: Math.min(100, Math.max(0, d.ofy - py)),
        })
        return
      }

      if (d.type === 'resize') {
        const right = d.ox + d.ow
        const bottom = d.oy + d.oh
        const min = 0.06
        let x = d.ox
        let y = d.oy
        let w = d.ow
        let h = d.oh

        if (d.handle === 'se') {
          w = Math.max(min, nx - d.ox)
          h = Math.max(min, ny - d.oy)
        } else if (d.handle === 'sw') {
          const newX = Math.min(nx, right - min)
          w = Math.max(min, right - newX)
          x = newX
          h = Math.max(min, ny - d.oy)
        } else if (d.handle === 'ne') {
          w = Math.max(min, nx - d.ox)
          const newY = Math.min(ny, bottom - min)
          h = Math.max(min, bottom - newY)
          y = newY
        } else if (d.handle === 'nw') {
          const newX = Math.min(nx, right - min)
          const newY = Math.min(ny, bottom - min)
          w = Math.max(min, right - newX)
          h = Math.max(min, bottom - newY)
          x = newX
          y = newY
        }

        x = clamp01(x)
        y = clamp01(y)
        w = clamp01(w)
        h = clamp01(h)
        if (x + w > 1) w = 1 - x
        if (y + h > 1) h = 1 - y

        const snapped = snapResizeBox(x, y, w, h, vGuidePos, hGuidePos, SNAP_THRESHOLD)
        updateLayer(d.id, snapped)
      }
    },
    [updateLayer, updateGuidePos, vGuidePos, hGuidePos],
  )

  const endDrag = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', endDrag)
  }, [onPointerMove])

  const startMove = (e: React.PointerEvent, layer: ComposerLayer) => {
    if (cropMode) return
    e.stopPropagation()
    setSelectedGuideId(null)
    const rect = getBoardRect()
    if (!rect) return
    const nx = (e.clientX - rect.left) / rect.width
    const ny = (e.clientY - rect.top) / rect.height
    dragRef.current = {
      type: 'move',
      id: layer.id,
      offsetX: nx - layer.x,
      offsetY: ny - layer.y,
      w: layer.w,
      h: layer.h,
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
  }

  const startResize = (
    e: React.PointerEvent,
    layer: ComposerLayer,
    handle: 'nw' | 'ne' | 'sw' | 'se',
  ) => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedGuideId(null)
    const rect = getBoardRect()
    if (!rect) return
    const startX = (e.clientX - rect.left) / rect.width
    const startY = (e.clientY - rect.top) / rect.height
    dragRef.current = {
      type: 'resize',
      id: layer.id,
      handle,
      startX,
      startY,
      ox: layer.x,
      oy: layer.y,
      ow: layer.w,
      oh: layer.h,
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
  }

  const startCrop = (e: React.PointerEvent, layer: ComposerLayer) => {
    if (!cropMode) return
    e.stopPropagation()
    setSelectedGuideId(null)
    dragRef.current = {
      type: 'crop',
      id: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      ofx: layer.focusX,
      ofy: layer.focusY,
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
  }

  const startGuideDrag = (e: React.PointerEvent, g: GuideLine) => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedGuideId(g.id)
    setSelectedId(null)
    const rect = getBoardRect()
    if (!rect) return
    const nnx = (e.clientX - rect.left) / rect.width
    const nny = (e.clientY - rect.top) / rect.height
    dragRef.current = {
      type: 'guide',
      id: g.id,
      axis: g.axis,
      startPos: g.pos,
      startNorm: g.axis === 'v' ? nnx : nny,
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
  }

  const addGuide = (axis: 'h' | 'v') => {
    setGuides((prev) => [...prev, { id: newId(), axis, pos: 0.5 }])
    setSelectedGuideId(null)
    setSelectedId(null)
  }

  useEffect(() => {
    setGuides((prev) => ensure16x9CenterGuide(aspect, prev))
  }, [aspect])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') return
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (!selectedGuideId) return
      e.preventDefault()
      setGuides((prev) => prev.filter((x) => x.id !== selectedGuideId))
      setSelectedGuideId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedGuideId])

  const removeLayer = (id: string) => {
    setLayers((prev) => {
      const l = prev.find((x) => x.id === id)
      if (l?.src.startsWith('blob:')) URL.revokeObjectURL(l.src)
      return prev.filter((x) => x.id !== id)
    })
    setSelectedId((s) => (s === id ? null : s))
  }

  const bringForward = (id: string) => {
    setLayers((prev) => {
      const i = prev.findIndex((l) => l.id === id)
      if (i < 0 || i >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[i], next[i + 1]] = [next[i + 1]!, next[i]!]
      return next
    })
  }

  const sendBackward = (id: string) => {
    setLayers((prev) => {
      const i = prev.findIndex((l) => l.id === id)
      if (i <= 0) return prev
      const next = [...prev]
      ;[next[i - 1]!, next[i]!] = [next[i]!, next[i - 1]!]
      return next
    })
  }

  const aspectStyle = useMemo(() => aspect.replace('/', ' / '), [aspect])

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-6">
      <header className="flex flex-col gap-3 border-b border-[color:var(--manage-sidebar-border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            Banner düzen motoru
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[color:var(--manage-text-muted)]">
            Boş tuvale görselleri ekleyin; dikey/yatay <strong className="text-[color:var(--manage-text)]">katman çizgileri</strong> ile
            kesim bölgelerini işaretleyin. Çerçeveyi sürükleyip boyutlandırın; kırp modunda kadrajı ayarlayın. Çizgilere yaklaşınca
            görseller hizalanır. Yerleşim ve çizgiler JSON ile dışa aktarılır.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95"
          >
            Resim ekle
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => {
              setLayers((prev) => {
                prev.forEach((l) => {
                  if (l.src.startsWith('blob:')) URL.revokeObjectURL(l.src)
                })
                return []
              })
              setGuides(ensure16x9CenterGuide(aspect, []))
              setSelectedGuideId(null)
              setSelectedId(null)
            }}
            className="rounded-lg border border-[color:var(--manage-sidebar-border)] px-3 py-2 text-sm text-[color:var(--manage-text)] hover:bg-[color:var(--manage-page-bg)]"
          >
            Tuvale sıfırla
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 xl:flex-row xl:items-start">
        {/* Sol: araç çubuğu */}
        <div className="flex w-full shrink-0 flex-col gap-4 xl:w-56">
          <div className="rounded-xl border border-[color:var(--manage-sidebar-border)] bg-[color:var(--manage-sidebar-bg)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--manage-text-muted)]">
              Tuval
            </p>
            <label className="mt-2 block text-xs text-[color:var(--manage-text-muted)]">En-boy</label>
            <select
              value={aspect}
              onChange={(e) => setAspect(e.target.value as FreeformBannerDocV2['outerAspect'])}
              className="mt-1 w-full rounded-lg border border-[color:var(--manage-sidebar-border)] bg-[color:var(--manage-page-bg)] px-3 py-2 text-sm"
            >
              {ASPECTS.map((a) => (
                <option key={a} value={a}>
                  {a.replace('/', ' : ')}
                </option>
              ))}
            </select>
            {aspect === '16/9' && (
              <p className="mt-2 text-xs leading-snug text-[color:var(--manage-text-muted)]">
                Bu şablonda tuval <strong className="text-[color:var(--manage-text)]">ortadan dikey</strong> bölünür
                (sol / sağ). Yeni eklenen görseller varsayılan olarak{' '}
                <strong className="text-[color:var(--manage-text)]">sağ yarıda</strong> açılır; boyut ve konumu
                sürükleyerek düzenleyin.
              </p>
            )}
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-[color:var(--manage-text)]">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="rounded border-[color:var(--manage-sidebar-border)]"
              />
              Referans ızgarası
            </label>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-[color:var(--manage-text)]">
              <input
                type="checkbox"
                checked={cropMode}
                onChange={(e) => setCropMode(e.target.checked)}
                className="rounded border-[color:var(--manage-sidebar-border)]"
              />
              Kırp modu (görsel üzerinde sürükle)
            </label>

            <div className="mt-5 border-t border-[color:var(--manage-sidebar-border)] pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--manage-text-muted)]">
                Katman çizgileri
              </p>
              <p className="mt-1.5 text-xs leading-snug text-[color:var(--manage-text-muted)]">
                Kesim ve hizalama kılavuzu. Çizgiyi sürükleyin; görseller yaklaşınca yapışır (snap).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addGuide('v')}
                  className="rounded-lg border border-[color:var(--manage-sidebar-border)] px-4 py-2 text-xs font-medium text-[color:var(--manage-text)] hover:bg-[color:var(--manage-page-bg)]"
                >
                  + Dikey
                </button>
                <button
                  type="button"
                  onClick={() => addGuide('h')}
                  className="rounded-lg border border-[color:var(--manage-sidebar-border)] px-4 py-2 text-xs font-medium text-[color:var(--manage-text)] hover:bg-[color:var(--manage-page-bg)]"
                >
                  + Yatay
                </button>
              </div>
              {guides.length > 0 && (
                <ul className="mt-3 max-h-28 space-y-1 overflow-auto text-xs text-[color:var(--manage-text-muted)]">
                  {guides.map((g) => (
                    <li key={g.id} className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGuideId(g.id)
                          setSelectedId(null)
                        }}
                        className={clsx(
                          'truncate rounded px-1 py-0.5 text-[color:var(--manage-text)]',
                          selectedGuideId === g.id && 'bg-[color:var(--manage-primary)]/15 font-medium',
                        )}
                      >
                        {g.axis === 'v' ? 'Dikey' : 'Yatay'} · {(g.pos * 100).toFixed(1)}%
                      </button>
                      <button
                        type="button"
                        onClick={() => setGuides((prev) => prev.filter((x) => x.id !== g.id))}
                        className="shrink-0 text-red-600 dark:text-red-400"
                        aria-label="Çizgiyi sil"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {selected && (
            <div className="rounded-xl border border-[color:var(--manage-sidebar-border)] bg-[color:var(--manage-sidebar-bg)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--manage-text-muted)]">
                Seçili katman
              </p>
              <p className="mt-2 font-mono text-xs text-[color:var(--manage-text)]">
                x {selected.x.toFixed(3)} · y {selected.y.toFixed(3)}
                <br />
                w {selected.w.toFixed(3)} · h {selected.h.toFixed(3)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => bringForward(selected.id)}
                  className="rounded border px-2 py-1 text-xs"
                >
                  Öne
                </button>
                <button
                  type="button"
                  onClick={() => sendBackward(selected.id)}
                  className="rounded border px-2 py-1 text-xs"
                >
                  Arkaya
                </button>
                <button
                  type="button"
                  onClick={() => removeLayer(selected.id)}
                  className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-600 dark:text-red-400"
                >
                  Sil
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Orta: çalışma alanı */}
        <div className="min-w-0 flex-1">
          <div
            className="rounded-xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-black/10 dark:bg-[#141414] dark:ring-white/10"
            onPointerDown={() => setSelectedId(null)}
          >
            <p className="mb-4 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-500">
              Çalışma alanı
            </p>
            <div
              ref={boardRef}
              className={clsx(
                'relative mx-auto w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black/5 dark:bg-neutral-100',
                showGrid &&
                  'bg-[linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[length:24px_24px] dark:bg-[linear-gradient(rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.06)_1px,transparent_1px)]',
              )}
              style={{ aspectRatio: aspectStyle }}
              onPointerDown={(e) => e.stopPropagation()}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'copy'
              }}
              onDrop={(e) => {
                e.preventDefault()
                addFiles(e.dataTransfer.files)
              }}
            >
              {layers.length === 0 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-neutral-400 transition hover:bg-neutral-50 hover:text-neutral-600"
                >
                  <span className="rounded-full border border-dashed border-neutral-300 px-4 py-3 text-neutral-500">
                    Resim sürükleyin veya tıklayın
                  </span>
                  <span className="text-xs">Boş tuval · {aspect.replace('/', ' : ')}</span>
                </button>
              )}

              {layers.map((layer, i) => {
                const isSel = layer.id === selectedId
                return (
                  <div
                    key={layer.id}
                    role="presentation"
                    className={clsx(
                      'absolute overflow-hidden shadow-md ring-1 transition-shadow',
                      isSel
                        ? 'z-20 ring-2 ring-[color:var(--manage-primary)]'
                        : 'z-10 ring-black/10 hover:ring-black/25 dark:ring-black/20',
                    )}
                    style={{
                      left: `${layer.x * 100}%`,
                      top: `${layer.y * 100}%`,
                      width: `${layer.w * 100}%`,
                      height: `${layer.h * 100}%`,
                      zIndex: i + 1,
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      setSelectedId(layer.id)
                      if (!cropMode) startMove(e, layer)
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob önizleme */}
                    <img
                      src={layer.src}
                      alt=""
                      draggable={false}
                      className={clsx(
                        'h-full w-full select-none object-cover',
                        cropMode && isSel && 'cursor-grab active:cursor-grabbing',
                      )}
                      style={{
                        objectPosition: `${layer.focusX}% ${layer.focusY}%`,
                      }}
                      onPointerDown={(e) => {
                        if (!cropMode || !isSel) return
                        e.stopPropagation()
                        startCrop(e, layer)
                      }}
                    />

                    {isSel && !cropMode && (
                      <>
                        {(['nw', 'ne', 'sw', 'se'] as const).map((h) => (
                          <button
                            key={h}
                            type="button"
                            aria-label={`Boyut ${h}`}
                            className="absolute z-30 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white bg-[color:var(--manage-primary)] shadow"
                            style={{
                              ...(h === 'nw' && { left: 0, top: 0 }),
                              ...(h === 'ne' && { left: '100%', top: 0 }),
                              ...(h === 'sw' && { left: 0, top: '100%' }),
                              ...(h === 'se' && { left: '100%', top: '100%' }),
                            }}
                            onPointerDown={(e) => startResize(e, layer, h)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )
              })}

              {/* Katman kılavuz çizgileri — üstte, tıklanabilir */}
              {guides.map((g) => (
                <div
                  key={g.id}
                  role="presentation"
                  className={clsx(
                    'absolute z-[25] touch-none',
                    g.axis === 'v' ? 'top-0 bottom-0 cursor-ew-resize' : 'left-0 right-0 cursor-ns-resize',
                    selectedGuideId === g.id ? 'z-[26]' : '',
                  )}
                  style={
                    g.axis === 'v'
                      ? {
                          left: `${g.pos * 100}%`,
                          width: 14,
                          marginLeft: -7,
                        }
                      : {
                          top: `${g.pos * 100}%`,
                          height: 14,
                          marginTop: -7,
                        }
                  }
                  onPointerDown={(e) => startGuideDrag(e, g)}
                >
                  <div
                    className={clsx(
                      'pointer-events-none absolute bg-amber-500 shadow-sm',
                      g.axis === 'v'
                        ? 'top-0 bottom-0 left-1/2 w-px -translate-x-1/2'
                        : 'left-0 right-0 top-1/2 h-px -translate-y-1/2',
                    )}
                  />
                  {selectedGuideId === g.id && (
                    <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-0.5 -translate-x-1/2 whitespace-nowrap rounded bg-amber-600 px-1 py-0.5 text-[9px] font-medium text-white shadow">
                      {(g.pos * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="mt-3 text-center text-xs text-[color:var(--manage-text-muted)]">
            İpucu: katmanı taşımak için çerçeveyi sürükleyin; köşelerden boyutlandırın; kırp modunda görseli kaydırın.
            Çizgileri taşımak için çizgi üzerinde sürükleyin; seçili çizgiyi Delete ile silin.
          </p>
        </div>

        {/* Sağ: katman listesi */}
        <div className="w-full shrink-0 xl:w-52">
          <div className="rounded-xl border border-[color:var(--manage-sidebar-border)] bg-[color:var(--manage-sidebar-bg)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--manage-text-muted)]">
              Katmanlar
            </p>
            {layers.length === 0 ? (
              <p className="mt-3 text-sm text-[color:var(--manage-text-muted)]">Henüz görsel yok.</p>
            ) : (
              <ul className="mt-3 max-h-64 space-y-1 overflow-auto">
                {[...layers].reverse().map((l, idx) => (
                  <li key={l.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setSelectedId(l.id)}
                      className={clsx(
                        'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm',
                        selectedId === l.id
                          ? 'bg-[color:var(--manage-primary)]/15 font-medium text-[color:var(--manage-text)]'
                          : 'hover:bg-[color:var(--manage-page-bg)]',
                      )}
                    >
                      <span className="flex h-8 w-10 shrink-0 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={l.src} alt="" className="h-full w-full object-cover" />
                      </span>
                      <span className="truncate">Katman {layers.length - idx}</span>
                    </button>
                    <div className="flex items-center justify-between gap-2 px-2 pb-1 text-[10px] text-[color:var(--manage-text-muted)]">
                      <span className="shrink-0">Site galeri</span>
                      <select
                        value={l.gallerySlot}
                        onChange={(e) =>
                          updateLayer(l.id, {
                            gallerySlot: Number(e.target.value) as 0 | 1 | 2,
                          })
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-[100px] rounded border border-[color:var(--manage-sidebar-border)] bg-[color:var(--manage-page-bg)] px-1 py-0.5 text-[color:var(--manage-text)]"
                      >
                        <option value={0}>1. görsel</option>
                        <option value={1}>2. görsel</option>
                        <option value={2}>3. görsel</option>
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Dışa aktar */}
      <section className="rounded-xl border border-[color:var(--manage-sidebar-border)] bg-[color:var(--manage-sidebar-bg)] p-5">
        <h2 className="text-sm font-semibold text-[color:var(--manage-text)]">Dışa aktar</h2>
        <p className="mt-1 text-xs text-[color:var(--manage-text-muted)]">
          Blob adresleri JSON’da yok; üretimde görselleri kendi URL’lerinizle eşleyin.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyLayoutJson}
            className="rounded-lg bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-medium text-white"
          >
            {copied ? 'Kopyalandı' : 'Yerleşim JSON'}
          </button>
          <button
            type="button"
            onClick={copyReact}
            className="rounded-lg border border-[color:var(--manage-sidebar-border)] px-4 py-2 text-sm"
          >
            React şablonu
          </button>
        </div>
        <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-[color:var(--manage-page-bg)] p-3 font-mono text-[11px] leading-relaxed text-[color:var(--manage-text)]">
          {docToJson(exportDoc())}
        </pre>
      </section>

      <section className="rounded-xl border border-dashed border-[color:var(--manage-sidebar-border)] p-4">
        <h2 className="text-sm font-semibold">JSON içe aktar (version 2)</h2>
        <textarea
          value={jsonImport}
          onChange={(e) => setJsonImport(e.target.value)}
          rows={6}
          className="mt-2 w-full rounded-lg border border-[color:var(--manage-sidebar-border)] bg-[color:var(--manage-page-bg)] px-3 py-2 font-mono text-xs"
          placeholder='{"version":2,"outerAspect":"16/9","layers":[]}'
        />
        <p className="mt-1 text-[11px] text-[color:var(--manage-text-muted)]">
          Üstteki dışa aktarılan bloğu olduğu gibi yapıştırın; <code className="rounded bg-[color:var(--manage-page-bg)] px-0.5">[...]</code> gibi
          kısaltmalar geçerli JSON değildir.
        </p>
        {importErr && <p className="mt-2 text-xs text-red-600">{importErr}</p>}
        <button
          type="button"
          onClick={applyImport}
          className="mt-2 rounded-lg border px-3 py-1.5 text-sm"
        >
          Uygula
        </button>
      </section>

    </div>
  )
}
