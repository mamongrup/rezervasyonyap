'use client'

/**
 * Kategori bazında konaklama kuralları şablonları (giriş/çıkış saati hariç).
 * İlan vitrininde seçilen kurallar bu şablondan gösterilir.
 */
import { getStoredAuthToken } from '@/lib/auth-storage'
import { categoryLabelTr } from '@/lib/catalog-category-ui'
import {
  getAuthMe,
  getManageCategoryAccommodationRules,
  putManageCategoryAccommodationRules,
  type CategoryAccommodationRuleItem,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Field, Label } from '@/shared/fieldset'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

const ORG_STORAGE_KEY = 'catalog_manage_organization_id'

const LABEL_KEYS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
] as const

function StatusMsg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return (
    <p
      className={`mt-2 rounded-lg px-3 py-2 text-xs ${
        msg.ok
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
          : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300'
      }`}
    >
      {msg.text}
    </p>
  )
}

export default function CatalogCategoryAccommodationRulesClient({
  code,
  organizationId: organizationIdProp,
}: {
  code: string
  organizationId?: string
}) {
  const [rules, setRules] = useState<CategoryAccommodationRuleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [orgId, setOrgId] = useState('')
  const [needOrg, setNeedOrg] = useState(false)

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) return
    void getAuthMe(token)
      .then((me) => {
        const perms = Array.isArray(me.permissions) ? me.permissions : []
        const roles = Array.isArray(me.roles) ? me.roles : []
        const admin =
          roles.some((r) => r.role_code === 'admin') ||
          perms.some((p) => p === 'admin.users.read' || p.startsWith('admin.'))
        setNeedOrg(admin)
        if (admin && typeof window !== 'undefined') {
          setOrgId(window.localStorage.getItem(ORG_STORAGE_KEY) ?? '')
        }
      })
      .catch(() => {})
  }, [])

  const orgQ = useMemo(() => {
    if (organizationIdProp?.trim()) return { organizationId: organizationIdProp.trim() }
    if (needOrg && orgId.trim()) return { organizationId: orgId.trim() }
    return undefined
  }, [organizationIdProp, needOrg, orgId])

  const load = useCallback(() => {
    const token = getStoredAuthToken()
    if (!token) return
    if (needOrg && !orgId.trim() && !organizationIdProp?.trim()) {
      setLoading(false)
      return
    }
    setLoading(true)
    void getManageCategoryAccommodationRules(token, code, orgQ)
      .then(setRules)
      .catch(() => setRules([]))
      .finally(() => setLoading(false))
  }, [code, orgQ, needOrg, orgId, organizationIdProp])

  useEffect(() => {
    load()
  }, [load])

  function addRule() {
    setRules((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        severity: 'ok',
        labels: { tr: '', en: '' },
      },
    ])
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  function patchRule(id: string, patch: Partial<CategoryAccommodationRuleItem>) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function setLabel(id: string, localeCode: string, text: string) {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, labels: { ...r.labels, [localeCode]: text } }
          : r,
      ),
    )
  }

  function saveOrg() {
    if (typeof window !== 'undefined' && orgId.trim()) {
      window.localStorage.setItem(ORG_STORAGE_KEY, orgId.trim())
    }
    load()
  }

  async function save() {
    const token = getStoredAuthToken()
    if (!token) return
    if (needOrg && !orgId.trim() && !organizationIdProp?.trim()) {
      setMsg({ ok: false, text: 'Yönetici için kurum UUID gerekli.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      await putManageCategoryAccommodationRules(token, code, rules, orgQ)
      setMsg({ ok: true, text: 'Konaklama kuralları kaydedildi.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 pb-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {categoryLabelTr(code)}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Kurallar</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Giriş ve çıkış saatleri burada tanımlanmaz; vitrinde ayrı gösterilir. Burada oluşturduğunuz maddeleri ilan
          düzenlemede işaretleyerek vitrine yansıtırsınız.
        </p>
      </div>

      {needOrg && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
          <Field className="min-w-[200px] flex-1">
            <Label className="text-xs">Kurum (UUID)</Label>
            <Input
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="mt-1 font-mono text-xs"
            />
          </Field>
          <ButtonPrimary type="button" onClick={saveOrg} className="text-xs">
            Yükle
          </ButtonPrimary>
        </div>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </p>
      ) : (
        <div className="space-y-4">
          {rules.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-700 dark:bg-neutral-900"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <Field className="min-w-[140px]">
                  <Label className="text-xs">Önem</Label>
                  <select
                    value={r.severity}
                    onChange={(e) =>
                      patchRule(r.id, {
                        severity: e.target.value === 'warn' ? 'warn' : 'ok',
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                  >
                    <option value="ok">Onay (yeşil)</option>
                    <option value="warn">Uyarı (turuncu)</option>
                  </select>
                </Field>
                <button
                  type="button"
                  onClick={() => removeRule(r.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Kaldır
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {LABEL_KEYS.map((lk) => (
                  <Field key={lk.code}>
                    <Label className="text-xs">{lk.label}</Label>
                    <Input
                      className="mt-1"
                      value={r.labels[lk.code] ?? ''}
                      onChange={(e) => setLabel(r.id, lk.code, e.target.value)}
                      placeholder="Kural metni"
                    />
                  </Field>
                ))}
              </div>
              <p className="mt-2 font-mono text-[10px] text-neutral-400">id: {r.id}</p>
            </div>
          ))}

          <button
            type="button"
            onClick={addRule}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-primary-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-primary-300 dark:hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" /> Kural ekle
          </button>

          <StatusMsg msg={msg} />
          <ButtonPrimary type="button" disabled={busy} onClick={() => void save()}>
            {busy ? '…' : 'Kaydet'}
          </ButtonPrimary>
        </div>
      )}
    </div>
  )
}
