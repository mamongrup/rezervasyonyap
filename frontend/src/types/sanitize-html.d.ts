/**
 * Yerleşik bildirim: üretimde `npm ci --omit=dev` ile @types kurulmadığında
 * `sanitize-html` için TypeScript hatası oluşmasın.
 * (Kullanılan alanlar `src/lib/sanitize-cms-html.ts` ile sınırlı tutuldu.)
 */
declare module 'sanitize-html' {
  namespace sanitizeHtml {
    type AllowedAttribute = string | { name: string; multiple?: boolean; values: string[] }

    interface IFrame {
      tag: string
      attribs: { [index: string]: string }
      text: string
      tagPosition: number
      mediaChildren: string[]
    }

    interface IOptions {
      allowedTags?: string[] | false
      allowedAttributes?: Record<string, AllowedAttribute[]> | false
      allowedClasses?: { [index: string]: boolean | Array<string | RegExp> }
      allowedSchemes?: string[] | boolean
      allowedSchemesByTag?: { [index: string]: string[] } | boolean
      transformTags?: {
        [tagName: string]:
          | string
          | ((tagName: string, attribs: Record<string, string>) => { tagName: string; attribs: Record<string, string> })
      }
      exclusiveFilter?: (frame: IFrame) => boolean | 'excludeTag'
      disallowedTagsMode?: 'discard' | 'escape' | 'recursiveEscape' | 'completelyDiscard'
      allowProtocolRelative?: boolean
    }
  }

  function sanitizeHtml(dirty: string, options?: sanitizeHtml.IOptions): string

  export default sanitizeHtml
}
