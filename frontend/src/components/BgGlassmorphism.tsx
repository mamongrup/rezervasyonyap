import type { FC } from 'react'

export interface BgGlassmorphismProps {
  className?: string
}

/**
 * Dekoratif blob — layout’a girmez (absolute).
 * `mix-blend-multiply` + blur PSI’da boya/CLS gürültüsü üretiyordu; düz opacity yeterli.
 */
const BgGlassmorphism: FC<BgGlassmorphismProps> = ({
  className = 'absolute inset-x-0 md:top-10 xl:top-40 min-h-0 pl-20 py-24 flex overflow-hidden -z-10',
}) => {
  return (
    <div
      className={`pointer-events-none ${className}`}
      style={{ contain: 'strict' }}
      aria-hidden
    >
      <span className="block h-72 w-72 rounded-full bg-[#ef233c]/10 blur-3xl lg:h-96 lg:w-96" />
      <span className="mt-40 -ml-20 block h-72 w-72 rounded-full bg-[#04868b]/10 blur-3xl lg:h-96 lg:w-96" />
    </div>
  )
}

export default BgGlassmorphism
