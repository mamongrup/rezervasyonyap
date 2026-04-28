import clsx from 'clsx'
import type { FC } from 'react'

export interface BgGlassmorphismProps {
  className?: string
  intensity?: 'default' | 'strong'
}

/**
 * Hero arkası dekoratif "cam" bloblar — orijinal Chisfis tek-konteyner yaklaşımının aksine
 * 6 ayrı yumuşak daire kullanıyoruz; konteyner search form altına kadar uzanır:
 *  • [0] sol-üst kırmızı   → başlık alanı
 *  • [1] orta-sağ turkuaz  → mozaik bandı
 *  • [2] sol-orta kırmızı  → buton + ikon barı arası
 *  • [3] sağ-orta turkuaz  → mozaiğin alt sağ köşesi
 *  • [4] sol-alt kırmızı   → search form sol arkası
 *  • [5] sağ-alt turkuaz   → search form sağ arkası + alt
 */
const BgGlassmorphism: FC<BgGlassmorphismProps> = ({
  className = 'absolute inset-x-0 top-0 h-[1400px] overflow-hidden -z-10 md:top-8 md:h-[1500px] xl:top-20 xl:h-[1620px]',
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
      {/* [3] sağ-orta turkuaz — mozaik alt sağ köşesi */}
      <span
        className={clsx(
          blob,
          teal,
          'right-4 top-[520px] h-72 w-72 md:right-24 md:top-[560px] lg:h-[420px] lg:w-[420px]',
        )}
      />
      {/* [4] sol-alt kırmızı — search form sol arkası */}
      <span
        className={clsx(
          blob,
          red,
          'left-4 top-[820px] h-72 w-72 sm:left-20 md:left-40 md:top-[900px] lg:h-[460px] lg:w-[460px] xl:top-[980px]',
        )}
      />
      {/* [5] sağ-alt turkuaz — search form sağ arkası ve alt */}
      <span
        className={clsx(
          blob,
          teal,
          'right-4 top-[1000px] h-72 w-72 md:right-32 md:top-[1080px] lg:h-[480px] lg:w-[480px] xl:top-[1180px]',
        )}
      />
    </div>
  )
}

export default BgGlassmorphism
