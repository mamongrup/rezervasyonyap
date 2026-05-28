'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import 'swagger-ui-dist/swagger-ui.css'

function apiOpenApiUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080').replace(/\/$/, '')
  return `${base}/api/v1/agent/openapi.json`
}

export default function DeveloperSwaggerPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const SwaggerUIBundle = (await import('swagger-ui-dist/swagger-ui-bundle')).default
      if (cancelled || !containerRef.current) return
      SwaggerUIBundle({
        domNode: containerRef.current,
        url: apiOpenApiUrl(),
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
      })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">Partner API — Swagger UI</h1>
            <p className="text-sm text-neutral-500">
              Canlı şema: <code className="text-xs">{apiOpenApiUrl()}</code>
            </p>
          </div>
          <Link href="/developer" className="text-sm text-primary-600 underline dark:text-primary-400">
            ← Developer ana sayfa
          </Link>
        </div>
      </div>
      <div ref={containerRef} className="container mx-auto max-w-6xl px-4 py-6" />
    </div>
  )
}
