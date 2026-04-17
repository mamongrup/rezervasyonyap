import ProvizyonConfirmClient from './ProvizyonConfirmClient'

interface Props {
  params: Promise<{ locale: string; token: string }>
}

export default async function ProvizyonPage({ params }: Props) {
  const { token } = await params
  return <ProvizyonConfirmClient token={token} />
}
