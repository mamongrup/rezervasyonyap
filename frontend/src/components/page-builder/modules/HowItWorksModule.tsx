import SectionHowItWork from '@/components/SectionHowItWork'

export interface HowItWorksStep {
  id: number
  title: string
  desc: string
}

export interface HowItWorksModuleConfig {
  title?: string
  subheading?: string
  steps?: HowItWorksStep[]
}

const DEFAULT_STEPS_TR: HowItWorksStep[] = [
  { id: 1, title: 'Ara & Keşfet', desc: 'İstediğin kategoriyi ve bölgeyi seç, binlerce ilan arasından filtrele.' },
  { id: 2, title: 'Rezervasyon Yap', desc: 'Güvenli ödeme altyapısıyla anında rezervasyon veya teklif al.' },
  { id: 3, title: 'Yola Çık', desc: 'Onaylanan rezervasyonunla keyifli bir seyahate hazır ol.' },
]

export default function HowItWorksModule({ config }: { config: HowItWorksModuleConfig }) {
  const steps = config.steps ?? DEFAULT_STEPS_TR

  return (
    <SectionHowItWork
      title={config.title ?? 'Nasıl Çalışır?'}
      subheading={config.subheading ?? ''}
      steps={steps}
    />
  )
}
