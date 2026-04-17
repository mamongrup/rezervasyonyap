'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  upsertSupplierApplication,
  uploadSupplierDocument,
  submitSupplierApplication,
} from '@/lib/travel-api'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { AlertTriangle, CheckCircle2, Loader2, Upload, X, ChevronRight, ChevronLeft } from 'lucide-react'
import Image from 'next/image'

// ── Category metadata ──────────────────────────────────────────────────────────

const CATEGORIES: Record<string, { label: string; emoji: string; description: string }> = {
  hotel:         { label: 'Otel',              emoji: '🏨', description: 'Butik otel, apart otel, pansiyon vb.' },
  holiday_home:  { label: 'Tatil Evi / Villa', emoji: '🏡', description: 'Kiralık villa, dağ evi, yazlık vb.' },
  yacht_charter: { label: 'Yat Kiralama',      emoji: '⛵', description: 'Tekne, catamaran, gulet kiralama' },
  tour:          { label: 'Tur',               emoji: '🗺️', description: 'Günlük tur, çok günlü paket tur' },
  activity:      { label: 'Aktivite',          emoji: '🏄', description: 'Dalış, rafting, tırmanış vb.' },
  cruise:        { label: 'Kruvaziyer',        emoji: '🚢', description: 'Gemi turu organizasyonu' },
  car_rental:    { label: 'Araç Kiralama',     emoji: '🚗', description: 'Araç kiralama hizmeti' },
  transfer:      { label: 'Transfer',          emoji: '🚐', description: 'Havalimanı & şehir transferi' },
  ferry:         { label: 'Feribot',           emoji: '⛴️', description: 'Feribot seferleri' },
  hajj:          { label: 'Hac & Umre',        emoji: '🕌', description: 'Hac ve umre tur organizasyonu' },
  visa:          { label: 'Vize',              emoji: '🛂', description: 'Vize danışmanlığı ve başvurusu' },
  flight:        { label: 'Uçak Bileti',       emoji: '✈️', description: 'Uçak bileti satışı' },
}

// ── Required documents per category ──────────────────────────────────────────

type DocRequirement = { type: string; label: string; description: string; required: boolean }

const CATEGORY_DOCS: Record<string, DocRequirement[]> = {
  hotel: [
    { type: 'tax_certificate',   label: 'Vergi Levhası',             description: 'Güncel vergi levhanızın fotoğrafı veya PDF',  required: true },
    { type: 'tourism_license',   label: 'Turizm İşletme Belgesi',    description: 'Kültür ve Turizm Bakanlığı onaylı belge',      required: true },
    { type: 'signature_circular',label: 'İmza Sirküleri',            description: 'Noter onaylı imza sirküleri',                  required: true },
    { type: 'operating_permit',  label: 'İşyeri Açma Ruhsatı',       description: 'Belediye onaylı işyeri ruhsatı',               required: false },
  ],
  holiday_home: [
    { type: 'tax_certificate',   label: 'Vergi Levhası',             description: 'Güncel vergi levhanız',                        required: true },
    { type: 'title_deed',        label: 'Tapu / Kira Sözleşmesi',    description: 'Mülkiyet belgesi veya kira kontratı',          required: true },
    { type: 'id_copy',           label: 'Kimlik Fotokopisi',         description: 'TC kimlik veya pasaport fotokopisi',           required: true },
    { type: 'tourism_license',   label: 'Turizm İşletme Belgesi',    description: 'Varsa turizm işletme belgesi',                 required: false },
  ],
  yacht_charter: [
    { type: 'tax_certificate',   label: 'Vergi Levhası',             description: 'Güncel vergi levhanız',                        required: true },
    { type: 'vessel_license',    label: 'Tekne Belgesi',             description: 'Deniz aracı sicil belgesi',                    required: true },
    { type: 'maritime_license',  label: 'Kaptan Lisansı',            description: 'Kaptan yeterlilik belgesi',                    required: true },
    { type: 'insurance',         label: 'Sigorta Poliçesi',          description: 'Tekne sorumluluk sigortası',                   required: true },
  ],
  tour: [
    { type: 'tax_certificate',   label: 'Vergi Levhası',             description: 'Güncel vergi levhanız',                        required: true },
    { type: 'tursab_license',    label: 'TÜRSAB Belgesi',            description: 'TÜRSAB üyelik ve ruhsat belgesi',              required: true },
    { type: 'signature_circular',label: 'İmza Sirküleri',            description: 'Noter onaylı imza sirküleri',                  required: true },
  ],
  activity: [
    { type: 'tax_certificate',   label: 'Vergi Levhası',             description: 'Güncel vergi levhanız',                        required: true },
    { type: 'activity_permit',   label: 'Faaliyet İzni',             description: 'İlgili bakanlık/kurum onayı',                  required: true },
    { type: 'insurance',         label: 'Sorumluluk Sigortası',      description: 'Faaliyet sorumluluk sigortası',                required: true },
  ],
  _default: [
    { type: 'tax_certificate',   label: 'Vergi Levhası',             description: 'Güncel vergi levhanız',                        required: true },
    { type: 'signature_circular',label: 'İmza Sirküleri / Kimlik',   description: 'İmza sirküleri veya kimlik belgesi',           required: true },
    { type: 'operating_permit',  label: 'Faaliyet Belgesi',          description: 'Sektörünüze ait yasal faaliyet belgesi',       required: true },
  ],
}

function getDocsForCategory(code: string): DocRequirement[] {
  return CATEGORY_DOCS[code] ?? CATEGORY_DOCS['_default']
}

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEPS = ['Kategori', 'İşletme Bilgileri', 'Belgeler', 'Gönder']

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => (
        <div key={i} className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            {i > 0 && (
              <div className={`h-0.5 flex-1 ${i <= current ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
            )}
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                i < current
                  ? 'bg-primary-500 text-white'
                  : i === current
                  ? 'border-2 border-primary-500 text-primary-600 bg-white dark:bg-neutral-900'
                  : 'border-2 border-neutral-200 text-neutral-400 bg-white dark:bg-neutral-900 dark:border-neutral-700'
              }`}
            >
              {i < current ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 ${i < current ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
            )}
          </div>
          <p className={`mt-1.5 text-xs font-medium hidden sm:block ${i === current ? 'text-primary-600' : 'text-neutral-400'}`}>
            {label}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── File upload row ────────────────────────────────────────────────────────────

function DocUploadRow({
  doc,
  uploaded,
  onUpload,
}: {
  doc: DocRequirement
  uploaded: boolean
  onUpload: (type: string, label: string, file: File) => Promise<{ warning?: string }>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setWarning(null)
    if (file.type.startsWith('image/')) setPreview(URL.createObjectURL(file))
    const result = await onUpload(doc.type, doc.label, file)
    if (result.warning) setWarning(result.warning)
    setUploading(false)
  }

  const borderClass = warning
    ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/10'
    : uploaded
    ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
    : 'border-neutral-200 dark:border-neutral-700'

  return (
    <div className={`rounded-2xl border p-4 transition ${borderClass}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          warning ? 'bg-amber-100 dark:bg-amber-900/30' : uploaded ? 'bg-green-100 dark:bg-green-900/30' : 'bg-neutral-100 dark:bg-neutral-800'
        }`}>
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
          ) : warning ? (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          ) : uploaded ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Upload className="h-5 w-5 text-neutral-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-neutral-900 dark:text-white text-sm">{doc.label}</p>
            {doc.required && <span className="text-xs text-red-500 font-medium">Zorunlu</span>}
            {!doc.required && <span className="text-xs text-neutral-400">İsteğe bağlı</span>}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{doc.description}</p>
          {preview && (
            <div className="mt-2 relative h-16 w-24 overflow-hidden rounded-lg">
              <Image src={preview} alt="önizleme" fill className="object-cover" />
            </div>
          )}
          {warning && (
            <div className="mt-2 flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-700 dark:text-amber-400">{warning} Lütfen daha yüksek çözünürlüklü bir görsel yükleyin.</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
            warning
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : uploaded
              ? 'bg-white text-green-700 border border-green-300 hover:bg-green-50 dark:bg-neutral-900 dark:border-green-800 dark:text-green-400'
              : 'bg-primary-500 text-white hover:bg-primary-600'
          }`}
        >
          {warning ? 'Değiştir' : uploaded ? 'Değiştir' : 'Yükle'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TedarikciOlClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const vitrinPath = useVitrinHref()

  const preselectedCat = searchParams.get('cat') ?? ''
  const existingAppId = searchParams.get('app') ?? ''

  const [step, setStep] = useState(preselectedCat ? 1 : 0)
  const [selectedCat, setSelectedCat] = useState(preselectedCat)
  const [applicationId, setApplicationId] = useState(existingAppId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)

  // Business info form
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState<'individual' | 'company'>('company')
  const [taxNumber, setTaxNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  const token = getStoredAuthToken() ?? ''

  // Step 0 → 1: select category
  const handleSelectCategory = async (code: string) => {
    setSelectedCat(code)
    setStep(1)
  }

  // Step 1 → 2: save business info, create/update application
  const handleSaveBusinessInfo = async () => {
    if (!businessName.trim()) { setError('İşletme adı zorunludur'); return }
    if (!taxNumber.trim()) { setError('Vergi numarası zorunludur'); return }
    setError('')
    setSaving(true)
    try {
      const res = await upsertSupplierApplication(token, {
        category_code: selectedCat,
        business_name: businessName,
        business_type: businessType,
        tax_number: taxNumber,
        phone,
        address,
        notes,
      })
      setApplicationId(res.id)
      setStep(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  // Step 2: upload document
  const handleUpload = async (docType: string, docLabel: string, file: File): Promise<{ warning?: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'supplier-docs')
    formData.append('prefix', `${applicationId}_${docType}`)

    const uploadRes = await fetch('/api/upload-image', { method: 'POST', body: formData })
    if (!uploadRes.ok) throw new Error('upload_failed')
    const data = await uploadRes.json() as { url: string; warning?: string }

    await uploadSupplierDocument(token, applicationId, {
      doc_type: docType,
      doc_label: docLabel,
      file_path: data.url,
    })
    setUploadedDocs((prev) => new Set([...prev, docType]))
    return { warning: data.warning }
  }

  // Step 3: submit
  const handleSubmit = async () => {
    const docs = getDocsForCategory(selectedCat)
    const requiredDocs = docs.filter((d) => d.required)
    const missingRequired = requiredDocs.filter((d) => !uploadedDocs.has(d.type))
    if (missingRequired.length > 0) {
      setError(`Lütfen zorunlu belgeleri yükleyin: ${missingRequired.map((d) => d.label).join(', ')}`)
      setStep(2)
      return
    }
    setSaving(true)
    setError('')
    try {
      await submitSupplierApplication(token, applicationId)
      setSubmitted(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const cat = CATEGORIES[selectedCat]
  const docs = getDocsForCategory(selectedCat)

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Başvurunuz Alındı!</h1>
        <p className="mt-3 text-neutral-500 dark:text-neutral-400">
          <strong>{cat?.label}</strong> kategorisi için tedarikçi başvurunuz incelemeye alındı.
          Belgeleriniz incelendikten sonra e-posta ile bildirim yapılacaktır.
          Onaylandığınızda bu kategoride ilan ekleyebileceksiniz.
        </p>
        <p className="mt-2 text-sm text-neutral-400">Ortalama inceleme süresi: 1–3 iş günü</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => router.push(vitrinPath('/ilan-ekle'))}
            className="rounded-2xl bg-primary-500 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-600"
          >
            Başvurularımı Gör
          </button>
          <button
            onClick={() => router.push(vitrinPath('/'))}
            className="rounded-2xl border border-neutral-200 px-6 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300"
          >
            Ana Sayfa
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Tedarikçi Başvurusu</h1>
        <StepBar current={step} />
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/10 dark:text-red-400">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── STEP 0: Category selection ─────────────────────────────────────── */}
      {step === 0 && (
        <div>
          <p className="mb-6 text-neutral-500 dark:text-neutral-400">
            Hangi kategoride tedarikçi olmak istiyorsunuz?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(CATEGORIES).map(([code, { label, emoji, description }]) => (
              <button
                key={code}
                onClick={() => handleSelectCategory(code)}
                className="group flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-primary-400 hover:bg-primary-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
              >
                <span className="text-3xl leading-none">{emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600">{label}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{description}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 text-neutral-300 group-hover:text-primary-500 transition group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 1: Business info ──────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          {cat && (
            <div className="flex items-center gap-3 rounded-2xl bg-primary-50 dark:bg-primary-900/10 px-4 py-3">
              <span className="text-2xl">{cat.emoji}</span>
              <p className="font-semibold text-primary-700 dark:text-primary-300">{cat.label}</p>
            </div>
          )}
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            İşletmeniz hakkında bilgileri doldurun.
          </p>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">İşletme Türü *</label>
            <div className="flex gap-3">
              {(['company', 'individual'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBusinessType(t)}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition ${
                    businessType === t
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400'
                  }`}
                >
                  {t === 'company' ? '🏢 Şirket' : '👤 Bireysel'}
                </button>
              ))}
            </div>
          </div>

          {[
            { label: 'İşletme / Ticaret Unvanı', value: businessName, set: setBusinessName, required: true },
            { label: 'Vergi Numarası / TC Kimlik No', value: taxNumber, set: setTaxNumber, required: true },
            { label: 'Telefon', value: phone, set: setPhone, required: false },
          ].map(({ label, value, set, required }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                {label} {required && '*'}
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => set(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Adres</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Ek Notlar <span className="text-neutral-400 font-normal">(isteğe bağlı)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Hizmetleriniz veya başvurunuz hakkında eklemek istediğiniz bilgiler..."
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400"
            >
              <ChevronLeft className="h-4 w-4" /> Geri
            </button>
            <button
              type="button"
              onClick={handleSaveBusinessInfo}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Devam Et <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Documents ─────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          {cat && (
            <div className="flex items-center gap-3 rounded-2xl bg-primary-50 dark:bg-primary-900/10 px-4 py-3">
              <span className="text-2xl">{cat.emoji}</span>
              <div>
                <p className="font-semibold text-primary-700 dark:text-primary-300">{cat.label} — Gerekli Belgeler</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Zorunlu belgeler yüklenmedikçe başvurunuz tamamlanamaz.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {docs.map((doc) => (
              <DocUploadRow
                key={doc.type}
                doc={doc}
                uploaded={uploadedDocs.has(doc.type)}
                onUpload={handleUpload}
              />
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400"
            >
              <ChevronLeft className="h-4 w-4" /> Geri
            </button>
            <button
              type="button"
              onClick={() => {
                const required = docs.filter((d) => d.required && !uploadedDocs.has(d.type))
                if (required.length > 0) {
                  setError(`Lütfen zorunlu belgeleri yükleyin: ${required.map((d) => d.label).join(', ')}`)
                  return
                }
                setError('')
                setStep(3)
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
            >
              Devam Et <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Review & Submit ───────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
            <div className="px-5 py-4">
              <p className="text-xs text-neutral-400 uppercase tracking-wide font-semibold mb-3">Başvuru Özeti</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Kategori</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{cat?.emoji} {cat?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">İşletme</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Tür</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{businessType === 'company' ? 'Şirket' : 'Bireysel'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Yüklenen Belgeler</span>
                  <span className="font-medium text-green-600">{uploadedDocs.size} belge</span>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 bg-amber-50 dark:bg-amber-900/10">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                ⚠️ Başvurunuzu gönderdikten sonra belgeler yönetim ekibimiz tarafından incelenecektir.
                Onay süreci 1–3 iş günü sürebilir.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400"
            >
              <ChevronLeft className="h-4 w-4" /> Geri
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Başvuruyu Gönder
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
