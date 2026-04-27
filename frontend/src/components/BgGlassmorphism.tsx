import clsx from 'clsx'
import type { FC } from 'react'

export interface BgGlassmorphismProps {
  className?: string
}

/**
 * Arka plan “cam” lekeleri. Eski iki `<span>` yerine `::before` / `::after` kullanılıyor —
 * Lighthouse DOM öğe sayısında gerçek düğüm −2 (pseudo-elementler sayıma dahil edilmez).
 * Konumlar: önceki `flex` satırındaki iki blob ile hizalı (pl-20 / py-24 + ikinci öğe mt-40 -ml-20).
 */
const BgGlassmorphism: FC<BgGlassmorphismProps> = ({
  className = 'absolute inset-x-0 md:top-10 xl:top-40 min-h-0 overflow-hidden pl-20 py-24 -z-10',
}) => {
  return (
    <div
      aria-hidden
      className={clsx(
        className,
        'pointer-events-none',
        "before:absolute before:left-20 before:top-24 before:block before:h-72 before:w-72 before:rounded-full before:bg-[#ef233c]/10 before:mix-blend-multiply before:blur-3xl before:filter before:content-[''] before:lg:h-96 before:lg:w-96",
        "after:absolute after:left-[18rem] after:top-64 after:block after:h-72 after:w-72 after:rounded-full after:bg-[#04868b]/10 after:mix-blend-multiply after:blur-3xl after:filter after:content-[''] after:lg:h-96 after:lg:w-96 nc-animation-delay-2000",
      )}
    />
  )
}

export default BgGlassmorphism
