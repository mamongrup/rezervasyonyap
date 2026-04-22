import SectionHowItWork from '@/components/SectionHowItWork'

interface Step {
  id: number
  title: string
  desc: string
}

interface Config {
  title?: string
  subheading?: string
  steps?: Step[]
}

const DEFAULT_STEPS_TR: Step[] = [
  { id: 1, title: 'Ara & Keşfet', desc: 'İstediğin kategoriyi ve bölgeyi seç, binlerce ilan arasından filtrele.' },
  { id: 2, title: 'Rezervasyon Yap', desc: 'Güvenli ödeme altyapısıyla anında rezervasyon veya teklif al.' },
  { id: 3, title: 'Yola Çık', desc: 'Onaylanan rezervasyonunla keyifli bir seyahate hazır ol.' },
]

export default function HowItWorksModule({ config }: { config: Config }) {
  const steps = config.steps ?? DEFAULT_STEPS_TR

  return (
    <SectionHowItWork
      title={config.title ?? 'Nasıl Çalışır?'}
      subheading={config.subheading ?? ''}
      steps={steps}
    />
  )
}
