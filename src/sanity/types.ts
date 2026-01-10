/**
 * Manually typed Sanity schema types for the blog
 */

// Simplified image source type
type SanityImageSource = {
  _type?: string
  asset?: {
    _ref?: string
    _type?: string
  }
}

export interface Author {
  _id: string
  name: string
  title?: string
  image?: SanityImageSource
}

export interface PostImage {
  _key: string
  filename: string
  asset: {
    _id: string
    url: string
  }
  alt?: string
  caption?: string
}

export interface Post {
  _id: string
  title: string
  slug: {current: string}
  publishedAt?: string
  body?: string
  description?: string
  externalSource?: string
  canonicalUrl?: string
  authors?: Author[]
  image?: SanityImageSource
  videoUrl?: string
  images?: PostImage[]
  _updatedAt?: string
}

export interface PostForList {
  _id: string
  title: string
  slug: {current: string}
  publishedAt?: string
  body?: string
  description?: string
  authors?: Array<{name: string}>
}
