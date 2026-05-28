/** swagger-ui-dist paketinde @types yok; üretim build type-check için. */
declare module 'swagger-ui-dist/swagger-ui-bundle' {
  interface SwaggerUIBundleConfig {
    domNode: HTMLElement
    url: string
    deepLinking?: boolean
    presets?: unknown[]
  }

  interface SwaggerUIBundleFn {
    (config: SwaggerUIBundleConfig): void
    presets: { apis: unknown }
  }

  const SwaggerUIBundle: SwaggerUIBundleFn
  export default SwaggerUIBundle
}

declare module 'swagger-ui-dist/swagger-ui.css'
