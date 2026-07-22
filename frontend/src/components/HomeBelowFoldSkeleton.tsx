/** Anasayfa hero altı modüller yüklenirken — tam sayfa iskeleti yerine hafif blok. */
export default function HomeBelowFoldSkeleton() {
  return (
    <div className="container flex flex-col gap-10 py-8" aria-hidden>
      <div className="skeleton-delayed h-40 w-full rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-delayed aspect-[4/3] rounded-2xl bg-neutral-100 dark:bg-neutral-800"
          />
        ))}
      </div>
      <div className="skeleton-delayed h-56 w-full rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
    </div>
  )
}
