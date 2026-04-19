'use client'

import { useEffect, useState } from 'react'

function parse(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return {}
  }
}

type Props = {
  blockType: string
  configJson: string
  onChange: (json: string) => void
}

export default function StructuredCmsBlockEditor({ blockType, configJson, onChange }: Props) {
  const p = parse(configJson)
  const merge = (patch: Record<string, unknown>) => {
    onChange(JSON.stringify({ ...p, ...patch }))
  }

  if (blockType === 'rich_html') {
    return (
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Başlık (isteğe bağlı)</label>
          <input
            type="text"
            value={(p.title as string) ?? ''}
            onChange={(e) => merge({ title: e.target.value })}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">İçerik (HTML — &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt; vb.)</label>
          <textarea
            value={(p.content as string) ?? ''}
            onChange={(e) => merge({ content: e.target.value })}
            rows={12}
            placeholder="<p>Paragraflarınız...</p>"
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Hizalama</label>
          <select
            value={(p.align as string) ?? 'left'}
            onChange={(e) => merge({ align: e.target.value })}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="left">Sol</option>
            <option value="center">Orta</option>
            <option value="right">Sağ</option>
          </select>
        </div>
      </div>
    )
  }

  if (blockType === 'image_text') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-neutral-500">Başlık</label>
          <input
            type="text"
            value={(p.title as string) ?? ''}
            onChange={(e) => merge({ title: e.target.value })}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-neutral-500">Alt başlık</label>
          <input
            type="text"
            value={(p.subtitle as string) ?? ''}
            onChange={(e) => merge({ subtitle: e.target.value })}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-neutral-500">Metin (HTML)</label>
          <textarea
            value={(p.content as string) ?? ''}
            onChange={(e) => merge({ content: e.target.value })}
            rows={5}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Görsel URL</label>
          <input
            type="url"
            value={(p.imageUrl as string) ?? ''}
            onChange={(e) => merge({ imageUrl: e.target.value })}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Görsel konumu</label>
          <select
            value={(p.imagePosition as string) ?? 'right'}
            onChange={(e) => merge({ imagePosition: e.target.value })}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="left">Metin sağda</option>
            <option value="right">Metin solda</option>
          </select>
        </div>
      </div>
    )
  }

  if (blockType === 'stats') {
    return <StatsBlockFields p={p} merge={merge} configJson={configJson} />
  }

  if (blockType === 'client_say') {
    return (
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Başlık</label>
          <input
            type="text"
            value={(p.heading as string) ?? ''}
            onChange={(e) => merge({ heading: e.target.value })}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Alt başlık</label>
          <input
            type="text"
            value={((p.subHeading ?? p.subheading) as string) ?? ''}
            onChange={(e) => merge({ subHeading: e.target.value })}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
      </div>
    )
  }

  if (blockType === 'founders') {
    return <FoundersBlockFields p={p} merge={merge} configJson={configJson} />
  }

  if (blockType === 'newsletter' || blockType === 'become_provider') {
    return (
      <div>
        <p className="mb-2 text-xs text-neutral-500">
          Bu modül yapılandırması JSON olarak saklanır. Örnek için mevcut bir sayfadan kopyalayın veya aşağıdaki şemayı
          kullanın.
        </p>
        <textarea
          value={configJson}
          onChange={(e) => onChange(e.target.value)}
          rows={14}
          className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
    )
  }

  return null
}

export const STRUCTURED_BLOCK_TYPES = new Set([
  'rich_html',
  'image_text',
  'stats',
  'client_say',
  'founders',
  'newsletter',
  'become_provider',
])

function StatsBlockFields({
  p,
  merge,
  configJson,
}: {
  p: Record<string, unknown>
  merge: (patch: Record<string, unknown>) => void
  configJson: string
}) {
  const [raw, setRaw] = useState(() => JSON.stringify((p.items as unknown[]) ?? [], null, 2))
  useEffect(() => {
    const q = parse(configJson)
    setRaw(JSON.stringify((q.items as unknown[]) ?? [], null, 2))
  }, [configJson])
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Bölüm başlığı</label>
        <input
          type="text"
          value={(p.title as string) ?? ''}
          onChange={(e) => merge({ title: e.target.value })}
          placeholder="🚀 Rakamlarla Biz"
          className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">
          İstatistikler (JSON dizi — kaydetmek için alanın dışına tıklayın veya Tab)
        </label>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={() => {
            try {
              merge({ items: JSON.parse(raw) as unknown[] })
            } catch {
              /* */
            }
          }}
          rows={8}
          className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
    </div>
  )
}

function FoundersBlockFields({
  p,
  merge,
  configJson,
}: {
  p: Record<string, unknown>
  merge: (patch: Record<string, unknown>) => void
  configJson: string
}) {
  const [raw, setRaw] = useState(() => JSON.stringify((p.members as unknown[]) ?? [], null, 2))
  useEffect(() => {
    const q = parse(configJson)
    setRaw(JSON.stringify((q.members as unknown[]) ?? [], null, 2))
  }, [configJson])
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Başlık (emoji ile)</label>
        <input
          type="text"
          value={(p.heading as string) ?? ''}
          onChange={(e) => merge({ heading: e.target.value })}
          className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Alt başlık</label>
        <input
          type="text"
          value={(p.subheading as string) ?? ''}
          onChange={(e) => merge({ subheading: e.target.value })}
          className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">
          Kurucular dizisi (JSON — <code className="text-[10px]">name</code>, <code className="text-[10px]">job</code>,{' '}
          <code className="text-[10px]">avatarUrl</code>)
        </label>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={() => {
            try {
              merge({ members: JSON.parse(raw) as unknown[] })
            } catch {
              /* */
            }
          }}
          rows={12}
          className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
    </div>
  )
}
