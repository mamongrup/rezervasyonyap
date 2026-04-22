'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { useManageT } from '@/lib/manage-i18n-context'
import {
  addNavMenuItem,
  deleteNavMenuItem,
  listNavMenuItems,
  listNavMenus,
  patchNavMenuItem,
  type NavMenu,
  type NavMenuItem,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Field, Label } from '@/shared/fieldset'
import { useCallback, useEffect, useState } from 'react'

export default function HeroMenuManageClient() {
  const t = useManageT()
  const [menus, setMenus] = useState<NavMenu[]>([])
  const [menuId, setMenuId] = useState<string>('')
  const [items, setItems] = useState<NavMenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [draft, setDraft] = useState<Record<string, Partial<NavMenuItem>>>({})

  const loadMenus = useCallback(async () => {
    const r = await listNavMenus()
    const list = Array.isArray(r.menus) ? r.menus : []
    setMenus(list)
    const hero = list.find((m) => m.code === 'hero_search')
    if (hero) setMenuId(hero.id)
    else if (list.length > 0) setMenuId(list[0].id)
    else setMenuId('')
  }, [])

  const loadItems = useCallback(async (mid: string) => {
    if (!mid) {
      setItems([])
      return
    }
    const r = await listNavMenuItems(mid)
    setItems(Array.isArray(r.items) ? r.items : [])
    setDraft({})
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void loadMenus()
      .catch(() => {
        if (!cancelled) setErr(t('hero_menu.load_error'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadMenus, t])

  useEffect(() => {
    if (!menuId) return
    let cancelled = false
    void loadItems(menuId)
      .catch(() => {
        if (!cancelled) setErr(t('hero_menu.load_error'))
      })
    return () => {
      cancelled = true
    }
  }, [menuId, loadItems, t])

  const merged = (row: NavMenuItem): NavMenuItem => ({
    ...row,
    is_published: row.is_published !== false,
  })

  const field = (id: string, key: keyof NavMenuItem, fallback: NavMenuItem): string | number | boolean => {
    const d = draft[id]?.[key]
    if (d !== undefined) return d as string | number | boolean
    const base = merged(fallback)
    return base[key] as string | number | boolean
  }

  const setField = (id: string, key: keyof NavMenuItem, value: string | number | boolean) => {
    setDraft((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: value },
    }))
  }

  const saveRow = async (row: NavMenuItem) => {
    const token = getStoredAuthToken()
    if (!token) return
    const d = draft[row.id] ?? {}
    const parentRaw = (d.parent_id !== undefined ? d.parent_id : row.parent_id) as string | null
    const parent_id =
      parentRaw === '' || parentRaw === null ? '' : (parentRaw as string)
    setSavingId(row.id)
    setErr(null)
    try {
      const m = merged(row)
      await patchNavMenuItem(token, menuId, row.id, {
        sort_order: (d.sort_order !== undefined ? d.sort_order : m.sort_order) as number,
        label_key: (d.label_key !== undefined ? d.label_key : m.label_key) as string,
        url: (d.url !== undefined ? d.url : m.url ?? '') as string,
        mega_content_json: (d.mega_content_json !== undefined ? d.mega_content_json : m.mega_content_json) as string,
        is_published: (d.is_published !== undefined ? d.is_published : m.is_published) as boolean,
        parent_id,
      })
      await loadItems(menuId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('hero_menu.load_error'))
    } finally {
      setSavingId(null)
    }
  }

  const addRow = async () => {
    const token = getStoredAuthToken()
    if (!token || !menuId) return
    setErr(null)
    try {
      await addNavMenuItem(token, menuId, {
        label_key: 'hero.tab.new',
        sort_order: items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 10 : 10,
        url: '/',
        mega_content_json: '{"icon":"home"}',
        is_published: true,
      })
      await loadItems(menuId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('hero_menu.load_error'))
    }
  }

  const removeRow = async (id: string) => {
    const token = getStoredAuthToken()
    if (!token || !menuId) return
    if (!window.confirm('OK?')) return
    setErr(null)
    try {
      await deleteNavMenuItem(token, menuId, id)
      await loadItems(menuId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('hero_menu.load_error'))
    }
  }

  const parentOptions = (selfId: string) => {
    const opts: { value: string; label: string }[] = [{ value: '', label: t('hero_menu.root_parent') }]
    for (const i of items) {
      if (i.id === selfId) continue
      opts.push({ value: i.id, label: i.label_key })
    }
    return opts
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">{t('hero_menu.refresh')}…</p>
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{t('hero_menu.page_title')}</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{t('hero_menu.intro')}</p>

      {err ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <Field className="min-w-[220px]">
          <Label>{t('hero_menu.menu_label')}</Label>
          <select
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            value={menuId}
            onChange={(e) => setMenuId(e.target.value)}
          >
            {menus.length === 0 ? (
              <option value="">{t('hero_menu.no_menus')}</option>
            ) : (
              menus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code}
                  {m.organization_id ? ` · ${m.organization_id.slice(0, 8)}…` : ''}
                </option>
              ))
            )}
          </select>
        </Field>
        <ButtonPrimary
          type="button"
          onClick={() => {
            void loadMenus().then(() => (menuId ? loadItems(menuId) : undefined))
          }}
        >
          {t('hero_menu.refresh')}
        </ButtonPrimary>
        <ButtonPrimary type="button" onClick={() => void addRow()} disabled={!menuId}>
          {t('hero_menu.add_row')}
        </ButtonPrimary>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700">
              <th className="py-2 pe-2">{t('hero_menu.col_sort')}</th>
              <th className="py-2 pe-2">{t('hero_menu.col_label_key')}</th>
              <th className="py-2 pe-2">{t('hero_menu.col_url')}</th>
              <th className="py-2 pe-2">{t('hero_menu.col_parent')}</th>
              <th className="py-2 pe-2">{t('hero_menu.col_published')}</th>
              <th className="py-2 pe-2">{t('hero_menu.col_mega')}</th>
              <th className="py-2 pe-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-b border-neutral-100 dark:border-neutral-800">
                <td className="py-2 pe-2 align-top">
                  <Input
                    type="number"
                    className="w-20"
                    value={String(field(row.id, 'sort_order', row))}
                    onChange={(e) => setField(row.id, 'sort_order', parseInt(e.target.value, 10) || 0)}
                  />
                </td>
                <td className="py-2 pe-2 align-top">
                  <Input
                    value={String(field(row.id, 'label_key', row))}
                    onChange={(e) => setField(row.id, 'label_key', e.target.value)}
                  />
                </td>
                <td className="py-2 pe-2 align-top">
                  <Input
                    value={String(field(row.id, 'url', row) ?? '')}
                    onChange={(e) => setField(row.id, 'url', e.target.value)}
                  />
                </td>
                <td className="py-2 pe-2 align-top">
                  <select
                    className="w-full min-w-[140px] rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                    value={
                      field(row.id, 'parent_id', row) === null || field(row.id, 'parent_id', row) === ''
                        ? ''
                        : String(field(row.id, 'parent_id', row))
                    }
                    onChange={(e) => setField(row.id, 'parent_id', e.target.value)}
                  >
                    {parentOptions(row.id).map((o) => (
                      <option key={o.value || 'root'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pe-2 align-top">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={Boolean(field(row.id, 'is_published', row))}
                    onChange={(e) => setField(row.id, 'is_published', e.target.checked)}
                  />
                </td>
                <td className="py-2 pe-2 align-top">
                  <textarea
                    className="min-h-[3rem] w-full min-w-[160px] rounded-lg border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-600 dark:bg-neutral-900"
                    value={String(field(row.id, 'mega_content_json', row))}
                    onChange={(e) => setField(row.id, 'mega_content_json', e.target.value)}
                  />
                </td>
                <td className="py-2 pe-2 align-top whitespace-nowrap">
                  <button
                    type="button"
                    className="text-primary-600 hover:underline dark:text-primary-400"
                    disabled={savingId === row.id}
                    onClick={() => void saveRow(row)}
                  >
                    {t('hero_menu.save')}
                  </button>
                  <button
                    type="button"
                    className="ms-2 text-red-600 hover:underline dark:text-red-400"
                    onClick={() => void removeRow(row.id)}
                  >
                    {t('hero_menu.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
