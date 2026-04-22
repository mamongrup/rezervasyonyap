'use client'

import { ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'

interface FAQItem {
  question: string
  answer: string
}

interface FAQConfig {
  title?: string
  items?: FAQItem[]
}

function FAQRow({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-neutral-100 dark:border-neutral-800">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-4 py-5 text-left"
      >
        <span className="font-medium text-neutral-900 dark:text-white">{item.question}</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          className={`h-5 w-5 shrink-0 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.75}
        />
      </button>
      {open && (
        <div className="pb-5 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
          {item.answer}
        </div>
      )}
    </div>
  )
}

const DEFAULT_FAQS: FAQItem[] = [
  { question: 'Rezervasyonumu nasıl iptal edebilirim?', answer: 'Hesabınızdaki "Rezervasyonlarım" bölümünden ilgili rezervasyonu seçerek iptal işlemi yapabilirsiniz. İptal koşulları ürüne göre değişmektedir.' },
  { question: 'Ödeme yöntemleri nelerdir?', answer: 'Kredi kartı, banka kartı ve havale/EFT yöntemleriyle ödeme yapabilirsiniz. Taksitli ödeme seçeneği de mevcuttur.' },
  { question: 'Rezervasyonumda değişiklik yapabilir miyim?', answer: 'Ürüne bağlı olarak tarih ve misafir sayısı değişikliği yapabilirsiniz. Detaylar için müşteri hizmetlerimizle iletişime geçin.' },
]

export default function FAQModule({ config }: { config: FAQConfig }) {
  const items = config.items ?? DEFAULT_FAQS
  return (
    <section>
      <h2 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-white">
        {config.title ?? 'Sıkça Sorulan Sorular'}
      </h2>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {items.map((item, i) => (
          <FAQRow key={i} item={item} />
        ))}
      </div>
    </section>
  )
}
