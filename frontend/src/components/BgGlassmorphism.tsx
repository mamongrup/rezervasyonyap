import type { FC } from 'react'

export interface BgGlassmorphismProps {
  className?: string
}

const BgGlassmorphism: FC<BgGlassmorphismProps> = ({
  className =
    'pointer-events-none absolute inset-x-0 top-0 z-0 min-h-[700px] pl-20 py-24 flex',
}) => {
  return (
    <div className={` ${className}`} aria-hidden>
      <span className="block h-72 w-72 rounded-full bg-[#ef233c] opacity-10 mix-blend-multiply blur-3xl filter lg:h-96 lg:w-96" />
      <span className="nc-animation-delay-2000 mt-40 -ml-20 block h-72 w-72 rounded-full bg-[#04868b] opacity-10 mix-blend-multiply blur-3xl filter lg:h-96 lg:w-96" />
    </div>
  )
}

export default BgGlassmorphism
