'use client'

import { formatManageApiError } from '@/lib/manage-api-error-tr'
import { getStoredAuthToken } from '@/lib/auth-storage'
import type { HotelFacilityAccordionSection } from '@/lib/hotel-facility-sections'
import {
  parseHotelVitrinMeta,
  serializeHotelVitrinMeta,
  type HotelVitrinFaqItem,
  type HotelVitrinMeta,
} from '@/lib/hotel-vitrin-meta'
import { getVerticalMeta, putVerticalMeta } from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonThird from '@/shared/ButtonThird'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { PlusCircle, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

function emptySection(): HotelFacilityAccordionSection {
  return { id: `section_${Date.now()}`, title: '', items: [], bodyHtml: null }
}

function emptyFaq(): HotelVitrinFaqItem {
  return { q: '', a: '' }
}

export default function HotelVitrinContentEditor({
  listingId,
  organizationId,
  labels,
}: {
  listingId: string
  organizationId?: string
  labels?: {
    title?: string
    intro?: string
    generalTerms?: string
    generalTermsHint?: string
    facilitySections?: string
    facilitySectionsHint?: string
    sectionTitle?: string
    sectionItems?: string
    sectionBody?: string
    faqTitle?: string
    faqHint?: string
    faqQuestion?: string
    faqAnswer?: string
    addSection?: string
    addFaq?: string
    save?: string
    saving?: string
    saved?: string
    loading?: string
  }
}) {
  const lt = {
    title: labels?.title ?? 'Vitrin metinleri',
    intro:
      labels?.intro ??
      'Tesis detay sayfasındaki «Genel şartlar», ek tesis bölümleri ve özel SSS maddeleri.',
    generalTerms: labels?.generalTerms ?? 'Genel şartlar (HTML)',
    generalTermsHint:
      labels?.generalTermsHint ?? 'Kurallar / tesis detayları akordeonunun altında gösterilir.',
    facilitySections: labels?.facilitySections ?? 'Ek tesis bölümleri',
    facilitySectionsHint:
      labels?.facilitySectionsHint ??
      'Örn. «Genel bilgiler», «Yeme & içme» — madde listesi veya HTML gövde.',
    sectionTitle: labels?.sectionTitle ?? 'Bölüm başlığı',
    sectionItems: labels?.sectionItems ?? 'Madde listesi (her satır bir madde)',
    sectionBody: labels?.sectionBody ?? 'HTML gövde (isteğe bağlı)',
    faqTitle: labels?.faqTitle ?? 'Özel SSS maddeleri',
    faqHint:
      labels?.faqHint ??
      'Check-in, iptal vb. otomatik maddelere eklenir. Boş bırakılan satırlar kaydedilmez.',
    faqQuestion: labels?.faqQuestion ?? 'Soru',
    faqAnswer: labels?.faqAnswer ?? 'Yanıt',
    addSection: labels?.addSection ?? 'Bölüm ekle',
    addFaq: labels?.addFaq ?? 'SSS ekle',
    save: labels?.save ?? 'Vitrin metinlerini kaydet',
    saving: labels?.saving ?? 'Kaydediliyor…',
    saved: labels?.saved ?? 'Vitrin metinleri kaydedildi.',
    loading: labels?.loading ?? 'Yükleniyor…',
  }

  const orgParam = organizationId?.trim() ? { organizationId: organizationId.trim() } : undefined
  const [generalTermsHtml, setGeneralTermsHtml] = useState('')
  const [sections, setSections] = useState<HotelFacilityAccordionSection[]>([])
  const [faqItems, setFaqItems] = useState<HotelVitrinFaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    void getVerticalMeta(listingId, 'hotel')
      .then((raw) => {
        if (cancelled) return
        const parsed = parseHotelVitrinMeta(raw)
        setGeneralTermsHtml(parsed.general_terms_html ?? '')
        setSections(parsed.facility_sections ?? [])
        setFaqItems(parsed.faq_items ?? [])
      })
      .catch(() => {
        if (!cancelled) {
          setGeneralTermsHtml('')
          setSections([])
          setFaqItems([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [listingId])

  async function handleSave() {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setMsg(null)
    try {
      const meta: HotelVitrinMeta = {
        general_terms_html: generalTermsHtml.trim() || null,
        facility_sections: sections
          .filter((s) => s.title.trim())
          .map((s) => ({
            ...s,
            title: s.title.trim(),
            items: (s.items ?? []).map((x) => x.trim()).filter(Boolean),
            bodyHtml: s.bodyHtml?.trim() || null,
          })),
        faq_items: faqItems.filter((item) => item.q.trim() && item.a.trim()),
      }
      await putVerticalMeta(token, listingId, 'hotel', serializeHotelVitrinMeta(meta), orgParam)
      setMsg({ ok: true, text: lt.saved })
    } catch (e) {
      setMsg({
        ok: false,
        text: e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('save_failed'),
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-neutral-400">{lt.loading}</p>

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">{lt.intro}</p>

      <Field className="block">
        <Label>{lt.generalTerms}</Label>
        <p className="mt-0.5 text-xs text-neutral-500">{lt.generalTermsHint}</p>
        <Textarea
          className="mt-1 font-mono text-xs"
          rows={6}
          value={generalTermsHtml}
          onChange={(e) => setGeneralTermsHtml(e.target.value)}
          placeholder="<p>Check-in 14:00…</p>"
        />
      </Field>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{lt.facilitySections}</h3>
          <p className="mt-0.5 text-xs text-neutral-500">{lt.facilitySectionsHint}</p>
        </div>
        {sections.map((section, i) => (
          <div
            key={section.id}
            className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700"
          >
            <Field className="block">
              <Label>{lt.sectionTitle}</Label>
              <Input
                className="mt-1"
                value={section.title}
                onChange={(e) => {
                  const next = [...sections]
                  next[i] = { ...section, title: e.target.value }
                  setSections(next)
                }}
              />
            </Field>
            <Field className="mt-3 block">
              <Label>{lt.sectionItems}</Label>
              <Textarea
                className="mt-1"
                rows={4}
                value={(section.items ?? []).join('\n')}
                onChange={(e) => {
                  const next = [...sections]
                  next[i] = {
                    ...section,
                    items: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean),
                  }
                  setSections(next)
                }}
              />
            </Field>
            <Field className="mt-3 block">
              <Label>{lt.sectionBody}</Label>
              <Textarea
                className="mt-1 font-mono text-xs"
                rows={3}
                value={section.bodyHtml ?? ''}
                onChange={(e) => {
                  const next = [...sections]
                  next[i] = { ...section, bodyHtml: e.target.value }
                  setSections(next)
                }}
              />
            </Field>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:underline dark:text-red-400"
              onClick={() => setSections(sections.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Kaldır
            </button>
          </div>
        ))}
        <ButtonThird type="button" onClick={() => setSections([...sections, emptySection()])}>
          <PlusCircle className="mr-1 inline h-4 w-4" />
          {lt.addSection}
        </ButtonThird>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{lt.faqTitle}</h3>
          <p className="mt-0.5 text-xs text-neutral-500">{lt.faqHint}</p>
        </div>
        {faqItems.map((item, i) => (
          <div
            key={`faq-${i}`}
            className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700"
          >
            <Field className="block">
              <Label>{lt.faqQuestion}</Label>
              <Input
                className="mt-1"
                value={item.q}
                onChange={(e) => {
                  const next = [...faqItems]
                  next[i] = { ...item, q: e.target.value }
                  setFaqItems(next)
                }}
              />
            </Field>
            <Field className="mt-3 block">
              <Label>{lt.faqAnswer}</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={item.a}
                onChange={(e) => {
                  const next = [...faqItems]
                  next[i] = { ...item, a: e.target.value }
                  setFaqItems(next)
                }}
              />
            </Field>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:underline dark:text-red-400"
              onClick={() => setFaqItems(faqItems.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Kaldır
            </button>
          </div>
        ))}
        <ButtonThird type="button" onClick={() => setFaqItems([...faqItems, emptyFaq()])}>
          <PlusCircle className="mr-1 inline h-4 w-4" />
          {lt.addFaq}
        </ButtonThird>
      </div>

      <ButtonPrimary type="button" onClick={() => void handleSave()} disabled={busy}>
        {busy ? lt.saving : lt.save}
      </ButtonPrimary>
      {msg ? (
        <p className={`text-sm ${msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
          {msg.text}
        </p>
      ) : null}
    </div>
  )
}
