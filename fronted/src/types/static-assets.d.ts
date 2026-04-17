/** `@/images/*` içe aktarımları — dosyalar yoksa veya path çözümlemesi başarısız olsa bile TS için. */
declare module '@/images/*' {
  import type { StaticImageData } from 'next/image'
  const content: StaticImageData
  export default content
}
