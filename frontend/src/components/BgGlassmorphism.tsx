import type { FC } from 'react'

export interface BgGlassmorphismProps {
  className?: string
}

const BgGlassmorphism: FC<BgGlassmorphismProps> = ({
  className = 'absolute inset-x-0 top-0 md:top-10 xl:top-40 h-[880px] md:h-[940px] xl:h-[1020px] min-h-0 overflow-hidden -z-10',
}) => {
  return (
    <div className={`relative ${className}`} aria-hidden>
      <span className="absolute left-20 top-24 block h-72 w-72 rounded-full bg-[#ef233c] opacity-10 mix-blend-multiply blur-3xl filter lg:h-96 lg:w-96" />
      <span className="nc-animation-delay-2000 absolute left-64 top-64 block h-72 w-72 rounded-full bg-[#04868b] opacity-10 mix-blend-multiply blur-3xl filter lg:h-96 lg:w-96" />
      <span className="absolute left-1/2 top-[560px] block h-80 w-80 -translate-x-1/2 rounded-full bg-[#04868b] opacity-10 mix-blend-multiply blur-3xl filter lg:top-[600px] lg:h-[420px] lg:w-[420px]" />
    </div>
  )
}

export default BgGlassmorphism
