'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  createAdminWorkspaceAnnouncement,
  createAdminWorkspaceTask,
  deleteAdminWorkspaceTask,
  listAdminWorkspaceAnnouncements,
  listAdminWorkspaceTasks,
  listWorkspaceRecipientOrgs,
  listWorkspaceStaffAssignees,
  patchAdminWorkspaceTask,
  type PortalAnnouncement,
  type WorkspaceTask,
} from '@/lib/travel-api'
import { CalendarDays, Loader2, Megaphone, Plus, Trash2, ClipboardList } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type Tab = 'tasks' | 'announcements'

export default function AdminWorkspaceClient() {
  const [tab, setTab] = useState<Tab>('tasks')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [announcements, setAnnouncements] = useState<PortalAnnouncement[]>([])
  const [staffOpts, setStaffOpts] = useState<{ id: string; label: string }[]>([])
  const [saving, setSaving] = useState(false)

  const [tTitle, setTTitle] = useState('')
  const [tBody, setTBody] = useState('')
  const [tDue, setTDue] = useState('')
  const [tRemind, setTRemind] = useState('')
  const [tAssignee, setTAssignee] = useState('')

  const [aAudience, setAAudience] = useState<'supplier' | 'agency'>('supplier')
  const [aTargetAll, setATargetAll] = useState(true)
  const [aTitle, setATitle] = useState('')
  const [aBody, setABody] = useState('')
  const [aExpires, setAExpires] = useState('')
  const [orgOpts, setOrgOpts] = useState<{ id: string; name: string }[]>([])
  const [aOrgs, setAOrgs] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setErr('Oturum bulunamadı.')
      setLoading(false)
      return
    }
    setErr(null)
    setLoading(true)
    try {
      const [tr, an, st] = await Promise.all([
        listAdminWorkspaceTasks(token),
        listAdminWorkspaceAnnouncements(token),
        listWorkspaceStaffAssignees(token),
      ])
      setTasks(tr.tasks)
      setAnnouncements(an.announcements)
      setStaffOpts(st.users)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Yükleme hatası')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token || tab !== 'announcements') return
    void listWorkspaceRecipientOrgs(token, aAudience).then((r) => {
      setOrgOpts(r.organizations.map((o) => ({ id: o.id, name: o.name })))
      setAOrgs(new Set())
    }).catch(() => setOrgOpts([]))
  }, [aAudience, tab])

  async function submitTask(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || !tTitle.trim()) return
    setSaving(true)
    setErr(null)
    try {
      await createAdminWorkspaceTask(token, {
        title: tTitle.trim(),
        body: tBody,
        due_date: tDue || undefined,
        remind_at: tRemind || undefined,
        assignee_user_id: tAssignee || undefined,
      })
      setTTitle('')
      setTBody('')
      setTDue('')
      setTRemind('')
      setTAssignee('')
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Kayıt hatası')
    } finally {
      setSaving(false)
    }
  }

  async function submitAnnouncement(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || !aTitle.trim()) return
    if (!aTargetAll && aOrgs.size === 0) {
      setErr('Hedef seçin veya “tümü” işaretleyin.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      await createAdminWorkspaceAnnouncement(token, {
        audience: aAudience,
        target_all: aTargetAll,
        title: aTitle.trim(),
        body: aBody,
        expires_at: aExpires || undefined,
        recipient_organization_ids: aTargetAll ? undefined : [...aOrgs],
      })
      setATitle('')
      setABody('')
      setAExpires('')
      setATargetAll(true)
      setAOrgs(new Set())
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Kayıt hatası')
    } finally {
      setSaving(false)
    }
  }

  async function removeTask(id: string) {
    if (!confirm('Bu görevi silmek istiyor musunuz?')) return
    const token = getStoredAuthToken()
    if (!token) return
    try {
      await deleteAdminWorkspaceTask(token, id)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Silinemedi')
    }
  }

  async function toggleTaskStatus(t: WorkspaceTask) {
    const token = getStoredAuthToken()
    if (!token) return
    const next = t.status === 'done' ? 'open' : 'done'
    try {
      await patchAdminWorkspaceTask(token, t.id, {
        title: t.title,
        body: t.body,
        due_date: t.due_date ?? '',
        remind_at: t.remind_at ?? '',
        assignee_user_id: t.assignee_user_id ?? '',
        status: next,
      })
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Güncellenemedi')
    }
  }

  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">İş planı & duyurular</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Personel görevlerini takvim / hatırlatma ile yönetin; tedarikçi ve acentelere toplu veya seçili kurumlara duyuru gönderin.
        </p>
      </div>

      <div className="mb-6 flex gap-1 rounded-2xl border border-[color:var(--manage-card-border)] bg-[color:var(--manage-card-bg)] p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab('tasks')}
          className={[
            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
            tab === 'tasks'
              ? 'bg-[color:var(--manage-primary)] text-white shadow-sm'
              : 'text-[color:var(--manage-text-muted)] hover:bg-[color:var(--manage-hover-bg)]',
          ].join(' ')}
        >
          <ClipboardList className="h-4 w-4" />
          Personel görevleri
        </button>
        <button
          type="button"
          onClick={() => setTab('announcements')}
          className={[
            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
            tab === 'announcements'
              ? 'bg-[color:var(--manage-primary)] text-white shadow-sm'
              : 'text-[color:var(--manage-text-muted)] hover:bg-[color:var(--manage-hover-bg)]',
          ].join(' ')}
        >
          <Megaphone className="h-4 w-4" />
          Portal duyuruları
        </button>
      </div>

      {err ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-neutral-400">
          <Loader2 className="h-6 w-6 animate-spin" /> Yükleniyor…
        </div>
      ) : tab === 'tasks' ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <form onSubmit={submitTask} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              <Plus className="h-4 w-4" /> Yeni görev
            </h2>
            <input
              required
              value={tTitle}
              onChange={(e) => setTTitle(e.target.value)}
              placeholder="Başlık *"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            <textarea
              value={tBody}
              onChange={(e) => setTBody(e.target.value)}
              placeholder="Açıklama"
              rows={3}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-xs text-neutral-500">Bitiş tarihi</label>
                <input
                  type="date"
                  value={tDue}
                  onChange={(e) => setTDue(e.target.value)}
                  className="mt-0.5 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500">Hatırlatma (tarih-saat)</label>
                <input
                  type="datetime-local"
                  value={tRemind}
                  onChange={(e) => setTRemind(e.target.value)}
                  className="mt-0.5 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-500">Atanan personel (boş = tüm personel)</label>
              <select
                value={tAssignee}
                onChange={(e) => setTAssignee(e.target.value)}
                className="mt-0.5 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="">— Tüm personel —</option>
                {staffOpts.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor…' : 'Görev oluştur'}
            </button>
          </form>

          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              <CalendarDays className="h-4 w-4" /> Tüm görevler (denetim)
            </h2>
            {tasks.length === 0 ? (
              <p className="text-sm text-neutral-400">Henüz görev yok.</p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">{t.title}</p>
                        {t.body ? <p className="mt-1 text-neutral-600 dark:text-neutral-300">{t.body}</p> : null}
                        <p className="mt-2 text-xs text-neutral-400">
                          {t.assign_to_all_staff ? 'Hedef: tüm personel' : `Atanan: ${t.assignee_label || t.assignee_user_id}`}
                          {t.due_date ? ` · Bitiş: ${t.due_date}` : ''}
                          {t.remind_at ? ` · Hatırlatma: ${t.remind_at}` : ''}
                          {' · '}
                          Durum: {t.status}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => void toggleTaskStatus(t)}
                          className="rounded-lg border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-600"
                        >
                          {t.status === 'done' ? 'Aç' : 'Tamamla'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeTask(t.id)}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <form onSubmit={submitAnnouncement} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Yeni duyuru</h2>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={aAudience === 'supplier'} onChange={() => setAAudience('supplier')} />
                Tedarikçiler
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={aAudience === 'agency'} onChange={() => setAAudience('agency')} />
                Acenteler
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={aTargetAll} onChange={(e) => setATargetAll(e.target.checked)} />
              Tüm {aAudience === 'supplier' ? 'tedarikçiler' : 'acenteler'}
            </label>
            {!aTargetAll ? (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-neutral-200 p-2 dark:border-neutral-700">
                {orgOpts.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 py-1 text-xs">
                    <input
                      type="checkbox"
                      checked={aOrgs.has(o.id)}
                      onChange={(e) => {
                        const n = new Set(aOrgs)
                        if (e.target.checked) n.add(o.id)
                        else n.delete(o.id)
                        setAOrgs(n)
                      }}
                    />
                    {o.name}
                  </label>
                ))}
              </div>
            ) : null}
            <input
              required
              value={aTitle}
              onChange={(e) => setATitle(e.target.value)}
              placeholder="Duyuru başlığı *"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            <textarea
              value={aBody}
              onChange={(e) => setABody(e.target.value)}
              placeholder="İçerik"
              rows={4}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            <div>
              <label className="text-xs text-neutral-500">Son geçerlilik (opsiyonel)</label>
              <input
                type="datetime-local"
                value={aExpires}
                onChange={(e) => setAExpires(e.target.value)}
                className="mt-0.5 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Gönderiliyor…' : 'Duyuruyu yayınla'}
            </button>
          </form>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Gönderilen duyurular</h2>
            {announcements.length === 0 ? (
              <p className="text-sm text-neutral-400">Henüz duyuru yok.</p>
            ) : (
              <ul className="space-y-2">
                {announcements.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <p className="font-medium text-neutral-900 dark:text-white">{a.title}</p>
                    <p className="text-xs text-neutral-400">
                      {a.audience === 'supplier' ? 'Tedarikçi' : 'Acente'} ·{' '}
                      {a.target_all ? 'Tümü' : 'Seçili kurumlar'} · {a.created_at}
                      {a.expires_at ? ` · bitiş ${a.expires_at}` : ''}
                    </p>
                    {a.body ? <p className="mt-2 text-neutral-600 dark:text-neutral-300">{a.body}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
