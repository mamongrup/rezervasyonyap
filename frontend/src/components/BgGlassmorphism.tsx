import clsx from 'clsx'
import type { FC } from 'react'

export interface BgGlassmorphismProps {
  className?: string
  intensity?: 'default' | 'strong'
}

/**
 * Hero arkası dekoratif "cam" bloblar — orijinal Chisfis tek-konteyner yaklaşımının aksine
 * 4 ayrı yumuşak daire kullanıyoruz:
 *  • [0] sol-üst kırmızı  → başlık alanını boyar
 *  • [1] orta-sağ turkuaz → mozaik bandını boyar
 *  • [2] sol-orta kırmızı → buton + ikon barı altını boyar
 *  • [3] orta-alt turkuaz → search form arkasına denk gelir
 *
 * Her blob `mix-blend-multiply` + `blur-3xl` ile yumuşatılır.
 */
const BgGlassmorphism: FC<BgGlassmorphismProps> = ({
  className = 'absolute inset-x-0 top-0 h-[1100px] overflow-hidden -z-10 md:top-8 md:h-[1180px] xl:top-20 xl:h-[1280px]',
  intensity = 'default',
}) => {
  const red = intensity === 'strong' ? 'bg-[#ef233c]/16' : 'bg-[#ef233c]/12'
  const teal = intensity === 'strong' ? 'bg-[#04868b]/16' : 'bg-[#04868b]/12'
  const blob = 'pointer-events-none absolute rounded-full mix-blend-multiply blur-3xl filter'

  return (
    <div aria-hidden className={clsx(className, 'pointer-events-none')}>
      {/* [0] sol-üst kırmızı — başlık ve açıklama alanı */}
      <span
        className={clsx(
          blob,
          red,
          'left-4 top-10 h-72 w-72 sm:left-12 md:left-20 md:top-16 lg:h-96 lg:w-96',
        )}
      />
      {/* [1] orta-sağ turkuaz — mozaik bandı */}
      <span
        className={clsx(
          blob,
          teal,
          'right-10 top-24 h-72 w-72 md:right-24 md:top-32 lg:h-96 lg:w-96',
        )}
      />
      {/* [2] sol-orta kırmızı — buton + ikon barı arası */}
      <span
        className={clsx(
          blob,
          red,
          'left-2 top-[420px] h-72 w-72 sm:left-16 md:left-32 md:top-[460px] lg:h-[420px] lg:w-[420px]',
        )}
      />
      {/* [3] orta-alt turkuaz — search form arkası */}
      <span
        className={clsx(
          blob,
          teal,
          'left-1/2 top-[640px] h-72 w-72 -translate-x-1/2 md:top-[700px] lg:h-[460px] lg:w-[460px] xl:top-[760px]',
        )}
      />
    </div>
  )
}

export default BgGlassmorphism
