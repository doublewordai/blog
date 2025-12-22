import type {MetadataRoute} from 'next'
import {sanityFetch} from '@/sanity/lib/client'
import {ALL_POSTS_SITEMAP_QUERY} from '@/sanity/lib/queries'

const SITE_URL = 'https://blog.doubleword.ai'

type PostResult = {
  slug: string
  _updatedAt: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = (await sanityFetch({
    query: ALL_POSTS_SITEMAP_QUERY,
    tags: ['post'],
  })) as PostResult[]

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
