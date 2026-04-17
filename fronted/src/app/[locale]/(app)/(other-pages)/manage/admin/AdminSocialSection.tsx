'use client'

import {
  createSocialJob,
  createSocialTemplate,
  listSocialJobs,
  listSocialTemplates,
  type SocialNetwork,
  type SocialShareJob,
  type SocialTemplate,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'

const NETWORKS: SocialNetwork[] = ['instagram', 'facebook', 'twitter', 'pinterest']

export default function AdminSocialSection() {
  const [templates, setTemplates] = useState<SocialTemplate[]>([])
  const [jobs, setJobs] = useState<SocialShareJob[]>([])
  const [jobStatusFilter, setJobStatusFilter] = useState('')
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [tplNet, setTplNet] = useState<SocialNetwork>('instagram')
  const [tplName, setTplName] = useState('')
  const [tplBody, setTplBody] = useState('')

  const [jobEntityType, setJobEntityType] = useState('listing')
  const [jobEntityId, setJobEntityId] = useState('')
  const [jobTemplateId, setJobTemplateId] = useState('')
  const [jobImageKeysRaw, setJobImageKeysRaw] = useState('')
  const [jobCaption, setJobCaption] = useState('')

  const jobStatusFilterRef = useRef(jobStatusFilter)
  jobStatusFilterRef.current = jobStatusFilter

  const refresh = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    setLoadErr(null)
    const st = jobStatusFilterRef.current.trim()
    try {
      const [t, j] = await Promise.all([
        listSocialTemplates(token),
        listSocialJobs(token, {
          ...(st ? { status: st } : {}),
          limit: 80,
        }),
      ])
      setTemplates(t.templates)
      setJobs(j.jobs)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'social_load_failed')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function onCreateTemplate(e: FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setLoadErr(null)
    try {
      await createSocialTemplate(token, {
        network: tplNet,
        name: tplName.trim(),
        template_body: tplBody,
      })
      setTplName('')
      setTplBody('')
      await refresh()
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'template_create_failed')
    } finally {
      setBusy(false)
    }
  }

  async function onCreateJob(e: FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    const keys = jobImageKeysRaw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (keys.length === 0) {
      setLoadErr('En az bir görsel storage key gerekir.')
      return
    }
    setBusy(true)
    setLoadErr(null)
    try {
      await createSocialJob(token, {
        entity_type: jobEntityType.trim(),
        entity_id: jobEntityId.trim(),
        ...(jobTemplateId.trim() ? { template_id: jobTemplateId.trim() } : {}),
        image_keys: keys,
        ...(jobCaption.trim() ? { caption_ai_generated: jobCaption.trim() } : {}),
      })
      setJobEntityId('')
      setJobImageKeysRaw('')
      setJobCaption('')
      await refresh()
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'job_create_failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id="admin-social-block"
      className="mt-4 scroll-mt-24 rounded-2xl border border-[color:var(--manage-card-border)] bg-[color:var(--manage-card-bg)] p-6 backdrop-blur-sm"
    >
      <h2 className="text-lg font-semibold text-[color:var(--manage-text)]">Paylaşım Kuyruğu & Şablonlar</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Şablonlar ve paylaşım kuyruğu (<span className="font-mono">admin.social.read</span> /{' '}
        <span className="font-mono">admin.social.write</span>). Worker dış süreçler kuyruğu işleyip durumu{' '}
        <span className="font-mono">posted</span> / <span className="font-mono">failed</span> yapar.
      </p>
      {loadErr ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {loadErr}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void refresh()}
          className="text-sm font-medium text-primary-600 underline disabled:opacity-50 dark:text-primary-400"
        >
          Yenile
        </button>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div>
          <h3 className="text-base font-medium text-neutral-900 dark:text-white">Şablonlar</h3>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
            {templates.length === 0 ? (
              <li className="text-neutral-500">Kayıt yok.</li>
            ) : (
              templates.map((t) => (
                <li key={t.id} className="rounded border border-neutral-100 p-2 dark:border-neutral-800">
                  <span className="font-mono text-xs text-neutral-500">{t.network}</span>{' '}
                  <span className="font-medium">{t.name}</span>
                  <pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap text-xs text-neutral-600 dark:text-neutral-400">
                    {t.template_body}
                  </pre>
                  <span className="text-[10px] text-neutral-400">{t.id}</span>
                </li>
              ))
            )}
          </ul>
          <form className="mt-4 space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-700" onSubmit={(e) => void onCreateTemplate(e)}>
            <Field>
              <Label>Ağ</Label>
              <select
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                value={tplNet}
                onChange={(e) => setTplNet(e.target.value as SocialNetwork)}
              >
                {NETWORKS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <Label>Ad</Label>
              <Input className="mt-1" value={tplName} onChange={(e) => setTplName(e.target.value)} required />
            </Field>
            <Field>
              <Label>Gövde (değişkenler worker tarafından)</Label>
              <Textarea className="mt-1 font-mono text-sm" rows={4} value={tplBody} onChange={(e) => setTplBody(e.target.value)} required />
            </Field>
            <ButtonPrimary type="submit" disabled={busy}>
              {busy ? '…' : 'Şablon ekle'}
            </ButtonPrimary>
          </form>
        </div>

        <div>
          <div className="flex flex-wrap items-end gap-3">
            <Field>
              <Label htmlFor="social-job-status">Kuyruk durumu</Label>
              <Input
                id="social-job-status"
                className="mt-1 font-mono text-sm"
                placeholder="pending | posted | failed (boş=tümü)"
                value={jobStatusFilter}
                onChange={(e) => setJobStatusFilter(e.target.value)}
              />
            </Field>
          </div>
          <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto text-sm">
            {jobs.length === 0 ? (
              <li className="text-neutral-500">Kayıt yok.</li>
            ) : (
              jobs.map((j) => (
                <li key={j.id} className="rounded border border-neutral-100 p-2 font-mono text-xs dark:border-neutral-800">
                  <span className="text-neutral-800 dark:text-neutral-200">{j.status}</span> · {j.entity_type} ·{' '}
                  {j.entity_id}
                  <div className="mt-1 text-[10px] text-neutral-500">
                    görseller: {j.image_keys.length} · {j.id}
                  </div>
                </li>
              ))
            )}
          </ul>
          <form className="mt-4 space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-700" onSubmit={(e) => void onCreateJob(e)}>
            <Field>
              <Label>Varlık türü</Label>
              <Input className="mt-1 font-mono text-sm" value={jobEntityType} onChange={(e) => setJobEntityType(e.target.value)} required />
            </Field>
            <Field>
              <Label>Varlık UUID</Label>
              <Input className="mt-1 font-mono text-sm" value={jobEntityId} onChange={(e) => setJobEntityId(e.target.value)} required />
            </Field>
            <Field>
              <Label>Şablon id (isteğe bağlı)</Label>
              <Input className="mt-1 font-mono text-sm" value={jobTemplateId} onChange={(e) => setJobTemplateId(e.target.value)} />
            </Field>
            <Field>
              <Label>Görsel storage key&apos;leri (virgül veya satır)</Label>
              <Textarea
                className="mt-1 font-mono text-sm"
                rows={3}
                value={jobImageKeysRaw}
                onChange={(e) => setJobImageKeysRaw(e.target.value)}
                placeholder="key1&#10;key2"
                required
              />
            </Field>
            <Field>
              <Label>Alt yazı / AI çıktısı (isteğe bağlı)</Label>
              <Textarea className="mt-1 text-sm" rows={2} value={jobCaption} onChange={(e) => setJobCaption(e.target.value)} />
            </Field>
            <ButtonPrimary type="submit" disabled={busy}>
              {busy ? '…' : 'Kuyruğa ekle'}
            </ButtonPrimary>
          </form>
        </div>
      </div>
    </section>
  )
}
