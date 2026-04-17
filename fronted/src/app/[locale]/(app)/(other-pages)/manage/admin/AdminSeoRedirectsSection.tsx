'use client'

import SeoNotFoundLogsSection from '@/components/manage/seo/SeoNotFoundLogsSection'
import SeoRedirectsSection from '@/components/manage/seo/SeoRedirectsSection'
import SeoSitemapSection from '@/components/manage/seo/SeoSitemapSection'

/** Yönetici içerik sayfasında üç SEO bloğu — ayrı rotalar `components/manage/seo/*` ile paylaşılır. */
export default function AdminSeoRedirectsSection() {
  return (
    <>
      <SeoSitemapSection />
      <div className="mt-10" />
      <SeoRedirectsSection />
      <div className="mt-10" />
      <SeoNotFoundLogsSection />
    </>
  )
}
