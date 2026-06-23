// Rota geçişlerinde (Suspense fallback) anında gösterilen nötr içerik iskeleti.
// Header/footer layout'ta kalır; yalnızca sayfa gövdesi bu iskeletle değişir.
// Amaç: "tıklayınca hemen geçmiyor" hissini ortadan kaldırmak — sayfa verisi
// gelene kadar kullanıcı boş/donmuş ekran yerine yüklendiğini görür.

function Block({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-200/70 dark:bg-neutral-700/40 ${className}`} />
}

export function PageContentSkeleton() {
  return (
    <div className="container py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Yükleniyor…</span>

      {/* Üst şerit (başlık / filtre alanı) */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Block className="h-8 w-1/2 max-w-xs" />
        <Block className="h-10 w-full max-w-sm" />
      </div>

      {/* Geniş blok (hero / galeri) */}
      <Block className="mb-8 h-56 w-full sm:h-72" />

      {/* Kart ızgarası */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Block className="h-44 w-full" />
            <Block className="h-4 w-3/4" />
            <Block className="h-4 w-1/2" />
            <Block className="h-5 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default PageContentSkeleton
