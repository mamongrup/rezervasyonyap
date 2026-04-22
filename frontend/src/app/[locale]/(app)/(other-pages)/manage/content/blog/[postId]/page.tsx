import BlogPostEditClient from './BlogPostEditClient'

export default function Page({ params }: { params: Promise<{ postId: string }> }) {
  return <BlogPostEditClient paramsPromise={params} />
}
