import RegionEditClient from './RegionEditClient'

interface Props {
  params: Promise<{ locale: string; pageId: string }>
}

export default async function RegionEditPage({ params }: Props) {
  const { pageId } = await params
  return <RegionEditClient pageId={pageId} />
}
