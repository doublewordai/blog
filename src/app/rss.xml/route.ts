import {client} from '@/sanity/lib/client'
import {RSS_FEED_QUERY} from '@/sanity/lib/queries'

const SITE_URL = 'https://blog.doubleword.ai'
const FEED_TITLE = 'Doubleword'
const FEED_DESCRIPTION = 'Notes on Building AI Systems'

type FeedPost = {
  title: string | null
  slug: string | null
  publishedAt: string | null
  description: string | null
  canonicalUrl: string | null
  authors: {name: string | null}[] | null
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const posts = await client.fetch<FeedPost[]>(RSS_FEED_QUERY)

  const items = posts
    .filter((post) => post.slug)
    .map((post) => {
      const link = `${SITE_URL}/${post.slug}`
      const author = post.authors?.map((a) => a.name).filter(Boolean).join(', ')
      const pubDate = post.publishedAt
        ? new Date(post.publishedAt).toUTCString()
        : undefined
      return [
        '    <item>',
        `      <title>${escapeXml(post.title ?? 'Untitled')}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : '',
        author ? `      <dc:creator>${escapeXml(author)}</dc:creator>` : '',
        post.description
          ? `      <description>${escapeXml(post.description)}</description>`
          : '',
        post.canonicalUrl
          ? `      <source url="${escapeXml(post.canonicalUrl)}">${escapeXml(post.title ?? 'Untitled')}</source>`
          : '',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
