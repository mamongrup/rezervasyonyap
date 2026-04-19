import MediaLibraryClient from './MediaLibraryClient'

export default function ManageMediaPage() {
  return (
    <div className="flex h-[calc(100dvh-6rem)] min-h-[48rem] flex-col px-4 py-4 md:px-6 md:py-6 lg:px-8">
      <MediaLibraryClient />
    </div>
  )
}
