import type { FC } from 'react'

export interface BgGlassmorphismProps {
  className?: string
}

/**
 * Hero arka planı için renkli gradient blobları. Konteyner `absolute` olduğundan
 * ebeveyn `relative` olmalı (ana sayfa `<main className="relative ...">`).
 *
 * Tasarım: sol-üst pembe, alt-orta pembe-mor, sağ-orta cyan — Chisfis temasıyla
 * aynı yayılma; `mix-blend-multiply` + `blur-3xl` ile yumuşak harman.
 */
const BgGlassmorphism: FC<BgGlassmorphismProps> = ({
  className = 'pointer-events-none absolute inset-x-0 top-0 -z-10 h-[820px] w-full',
}) => {
  return (
    <div className={className} aria-hidden>
      <span className="absolute -top-20 left-[-6rem] block h-[480px] w-[480px] rounded-full bg-[#ef233c] opacity-15 mix-blend-multiply blur-3xl filter lg:h-[600px] lg:w-[600px]" />
      <span className="absolute top-[260px] left-[18%] block h-[420px] w-[420px] rounded-full bg-[#ff7ab6] opacity-15 mix-blend-multiply blur-3xl filter lg:h-[560px] lg:w-[560px]" />
      <span className="absolute top-[120px] right-[-4rem] block h-[420px] w-[420px] rounded-full bg-[#04868b] opacity-15 mix-blend-multiply blur-3xl filter lg:h-[560px] lg:w-[560px]" />
    </div>
  )
}

export default BgGlassmorphism
