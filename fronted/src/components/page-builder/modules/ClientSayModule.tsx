import SectionClientSay from '@/components/SectionClientSay'

interface Config {
  heading?: string
  subHeading?: string
}

export default function ClientSayModule({ config }: { config: Config }) {
  return (
    <section className="mb-16 md:mb-24">
      <SectionClientSay
        heading={config.heading ?? 'Misafirlerimiz Ne Diyor? 🥇'}
        subHeading={config.subHeading ?? 'Bizimle seyahat eden gezginlerin gerçek yorumları.'}
      />
    </section>
  )
}
