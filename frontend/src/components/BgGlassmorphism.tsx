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
      <span className="block h-72 w-72 shrink-0 rounded-full bg-[rgba(239,35,60,0.14)] blur-3xl dark:bg-[rgba(251,113,133,0.16)] lg:h-96 lg:w-96" />
      <span className="nc-animation-delay-2000 mt-40 -ml-20 block h-72 w-72 shrink-0 rounded-full bg-[rgba(4,134,139,0.12)] blur-3xl dark:bg-[rgba(45,212,191,0.12)] lg:h-96 lg:w-96" />
    </div>
  )
}

export default BgGlassmorphism
