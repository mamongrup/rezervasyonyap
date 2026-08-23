'use client'

import React, { useMemo } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Share2,
  Search,
  Globe,
  Image as ImageIcon,
  DollarSign,
  MapPin,
  Tag,
  ShieldCheck,
  Award,
} from 'lucide-react'

export interface QualityChecklistItem {
  id: string
  title: string
  desc: string
  passed: boolean
  points: number
  category: 'content' | 'media' | 'pricing' | 'location' | 'i18n'
}

export interface AgencyQualityChecklistProps {
  categoryCode: string
  title: string
  description: string
  imagesCount: number
  price: string
  currency: string
  address: string
  hasCoordinates: boolean
  localeCount: number
  totalLocalesCount: number
  customBadges?: string[]
  onToggleBadge?: (badge: string) => void
}

export const AGENCY_VITRIN_BADGES: Record<string, Array<{ id: string; label: string; color: string }>> = {
  hotel: [
    { id: 'early_booking', label: 'Erken Rezervasyon', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { id: 'best_seller', label: 'Çok Satan Tesis', color: 'bg-rose-100 text-rose-800 border-rose-300' },
    { id: 'seafront', label: 'Denize Sıfır', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { id: 'honeymoon', label: 'Balayı Oteli', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { id: 'family_friendly', label: 'Aile Dostu', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { id: 'free_cancellation', label: 'Ücretsiz İptal', color: 'bg-teal-100 text-teal-800 border-teal-300' },
  ],
  yacht_charter: [
    { id: 'luxury_gulet', label: 'Lüks Mavi Tur', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { id: 'crewed_included', label: 'Kaptanlı & Aşçılı', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { id: 'gocek_bays', label: 'Göcek Koyları Özel', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { id: 'early_discount', label: '%15 Erken Rezervasyon', color: 'bg-rose-100 text-rose-800 border-rose-300' },
    { id: 'free_watersports', label: 'Su Sporları Dahil', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  ],
  activity: [
    { id: 'popular_choice', label: 'En Popüler Deneyim', color: 'bg-rose-100 text-rose-800 border-rose-300' },
    { id: 'high_adrenaline', label: 'Yüksek Adrenalin', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { id: 'hotel_transfer', label: 'Otel Transferi Dahil', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { id: 'instant_ticket', label: 'Anında Onaylı QR Bilet', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { id: 'weather_refund', label: 'Hava Durumu İade Güvencesi', color: 'bg-teal-100 text-teal-800 border-teal-300' },
  ],
  holiday_home: [
    { id: 'secluded_pool', label: 'Korunaklı Havuzlu Villa', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { id: 'seaview_panoramic', label: 'Panoramik Deniz Manzarası', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { id: 'heated_pool', label: 'Isıtmalı Havuz & Jakuzi', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { id: 'honeymoon_villa', label: 'Balayı Villası', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  ],
}

export function AgencyQualityChecklist({
  categoryCode,
  title,
  description,
  imagesCount,
  price,
  currency,
  address,
  hasCoordinates,
  localeCount,
  totalLocalesCount,
  customBadges = [],
  onToggleBadge,
}: AgencyQualityChecklistProps) {
  const isHotel = categoryCode === 'hotel'
  const isYacht = categoryCode === 'yacht_charter'
  const isActivity = categoryCode === 'activity'

  const checklist: QualityChecklistItem[] = useMemo(() => {
    return [
      {
        id: 'title_length',
        title: 'İlan Başlığı Kalitesi',
        desc: 'En az 15 karakter uzunluğunda açıklayıcı ve SEO uyumlu başlık',
        passed: title.trim().length >= 15,
        points: 15,
        category: 'content',
      },
      {
        id: 'description_rich',
        title: 'Zengin İlan Açıklaması',
        desc: 'En az 100 karakterlik detaylı ve bilgilendirici tanıtım metni',
        passed: description.trim().length >= 100,
        points: 15,
        category: 'content',
      },
      {
        id: 'images_count',
        title: 'Yüksek Çözünürlüklü Galeri',
        desc: 'En az 5 adet yatay, kaliteli fotoğraf',
        passed: imagesCount >= 5,
        points: 20,
        category: 'media',
      },
      {
        id: 'pricing_set',
        title: 'Fiyatlandırma & Para Birimi',
        desc: 'Taban satış fiyatı ve geçerli para birimi tanımlandı',
        passed: Boolean(price && parseFloat(price) > 0),
        points: 20,
        category: 'pricing',
      },
      {
        id: 'location_coords',
        title: 'Harita Konumu & Adres',
        desc: 'Açık adres girildi ve harita GPS pini işaretlendi',
        passed: Boolean(address.trim() && hasCoordinates),
        points: 15,
        category: 'location',
      },
      {
        id: 'i18n_complete',
        title: 'Çok Dilli Vitrin Çevirileri',
        desc: `Tüm aktif vitrin dillerinde çeviriler hazır (${localeCount}/${totalLocalesCount} dil)`,
        passed: localeCount >= totalLocalesCount,
        points: 15,
        category: 'i18n',
      },
    ]
  }, [title, description, imagesCount, price, address, hasCoordinates, localeCount, totalLocalesCount])

  const totalScore = checklist.reduce((sum, item) => sum + (item.passed ? item.points : 0), 0)

  const scoreColor =
    totalScore >= 85
      ? 'text-emerald-600 dark:text-emerald-400'
      : totalScore >= 60
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400'

  const scoreBg =
    totalScore >= 85
      ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40'
      : totalScore >= 60
      ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40'
      : 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40'

  const availableBadges = AGENCY_VITRIN_BADGES[categoryCode] || AGENCY_VITRIN_BADGES.hotel

  return (
    <div className="space-y-6">
      {/* Skor ve Özet Kartı */}
      <div className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${scoreBg}`}>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-white shadow-md dark:bg-neutral-900">
            <span className={`text-2xl font-black ${scoreColor}`}>{totalScore}</span>
            <span className="text-[10px] font-bold uppercase text-neutral-400">/ 100</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {totalScore >= 85
                ? '🏆 Mükemmel — İlanınız Yayına Tam Hazır!'
                : totalScore >= 60
                ? '⚡ İyi Seviyede — Birkaç Eksik Bilgi Tamamlanabilir'
                : '⚠️ Yayına Hazırlık Gerekiyor'}
            </h3>
            <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-300">
              Lider seyahat acentesi algoritmaları yüksek kaliteli ve eksiksiz ilanları vitrinde en üstte sıralar.
            </p>
          </div>
        </div>
      </div>

      {/* Kontrol Maddeleri */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
          Seyahat Acentesi Kalite Kontrol Listesi
        </h4>
        <div className="mt-3.5 divide-y divide-neutral-100 dark:divide-neutral-700/60">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3">
              <div className="flex items-start gap-3">
                {item.passed ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-neutral-300 dark:text-neutral-600" />
                )}
                <div>
                  <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {item.desc}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  item.passed
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
                }`}
              >
                +{item.points} Puan
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Vitrin Rozetleri */}
      {availableBadges.length > 0 && onToggleBadge && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            <Tag className="h-4 w-4 text-primary-600" />
            Öne Çıkan Vitrin Rozetleri
          </h4>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            İlan kartlarında ve arama sonuçlarında dikkat çeken acente etiketlerini seçin.
          </p>

          <div className="mt-3.5 flex flex-wrap gap-2.5">
            {availableBadges.map((badge) => {
              const isSelected = customBadges.includes(badge.id)
              return (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => onToggleBadge(badge.id)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? `${badge.color} ring-2 ring-primary-500/20 shadow-sm`
                      : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
                  }`}
                >
                  {isSelected ? '✓ ' : '+ '}
                  {badge.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Canlı SERP ve Sosyal Medya Kart Önizlemesi */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Google SERP */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            <Search className="h-4 w-4 text-primary-600" />
            Google Arama Önizlemesi (SERP)
          </h4>
          <div className="mt-3 rounded-xl border border-neutral-100 bg-neutral-50/70 p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
              <span className="font-medium text-emerald-700 dark:text-emerald-400">rezervasyonyap.com</span>
              <span>›</span>
              <span>{categoryCode}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400">
              {title.trim() || 'İlan Başlığınız Burada Görüntülenecek'}
            </p>
            <p className="mt-1 text-xs text-neutral-600 line-clamp-2 dark:text-neutral-300">
              {description.trim().slice(0, 150) ||
                'İlanınızın açıklaması arama motorlarında bu alanda özet olarak listelenecektir.'}
            </p>
          </div>
        </div>

        {/* Sosyal Medya & WhatsApp Kartı */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            <Share2 className="h-4 w-4 text-primary-600" />
            WhatsApp & Sosyal Paylaşım Kartı
          </h4>
          <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex h-24 items-center justify-center bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
              <ImageIcon className="h-8 w-8 opacity-40" />
            </div>
            <div className="p-3">
              <p className="text-xs font-bold text-neutral-900 line-clamp-1 dark:text-white">
                {title.trim() || 'İlan Başlığı'}
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500 line-clamp-1 dark:text-neutral-400">
                {price ? `${price} ${currency} · ` : ''}
                {address || 'Konum bilgisi'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
