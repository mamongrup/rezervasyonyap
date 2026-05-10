import SectionGeziOnerileri from '@/components/SectionGeziOnerileri'

export interface GeziOnerileriModuleConfig {
  locale?: string
}

export default function GeziOnerileriModule({ config }: { config: GeziOnerileriModuleConfig }) {
  return <SectionGeziOnerileri locale={config.locale ?? 'tr'} />
}
