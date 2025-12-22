import {defineQuery} from 'next-sanity'

/**
 * Query posts for homepage with pagination
 * Returns posts ordered by publishedAt descending
 */
export const POSTS_QUERY = defineQuery(`*[_type == "post" && defined(slug.current)] | order(publishedAt desc) [$start...$end] {
  _id,
  title,
  slug,
  publishedAt,
  body,
  "authors": authors[]->{ name }
}`)

/**
 * Query total count of posts for pagination
 */
export const POSTS_COUNT_QUERY = defineQuery(`count(*[_type == "post" && defined(slug.current)])`)

/**
 * Query all post slugs for static generation
 */
export const POST_SLUGS_QUERY = defineQuery(`*[_type == "post" && defined(slug.current)] {
  "slug": slug.current
}`)

/**
 * Query a single post by slug with full details
 */
export const POST_QUERY = defineQuery(`*[_type == "post" && slug.current == $slug][0] {
  _id,
  title,
  slug,
  publishedAt,
  body,
  videoUrl,
  image,
  "authors": authors[]->{
    _id,
    name,
    title,
    image
  },
  images[] {
    _key,
    filename,
    asset-> {
      _id,
      url
    },
    alt,
    caption
  }
}`)

/**
 * Query all posts for sitemap generation
 */
export const ALL_POSTS_SITEMAP_QUERY = defineQuery(`*[_type == "post" && defined(slug.current)] {
  "slug": slug.current,
  _updatedAt
}`)
