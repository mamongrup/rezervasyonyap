import SectionGeziOnerileri from '@/components/SectionGeziOnerileri'

interface Config {
  locale?: string
}

export default function GeziOnerileriModule({ config }: { config: Config }) {
  return <SectionGeziOnerileri locale={config.locale ?? 'tr'} />
}
