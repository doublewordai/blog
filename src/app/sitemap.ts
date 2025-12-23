import type {MetadataRoute} from 'next'
import {client} from '@/sanity/lib/client'
import {ALL_POSTS_SITEMAP_QUERY} from '@/sanity/lib/queries'

const SITE_URL = 'https://blog.doubleword.ai'

type PostResult = {
  slug: string
  _updatedAt: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use client directly for sitemap (no live needed)
  const posts = await client.fetch<PostResult[]>(ALL_POSTS_SITEMAP_QUERY)

  // Homepage
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]

  // Blog posts
  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/${post.slug}`,
    lastModified: new Date(post._updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...postRoutes]
}
