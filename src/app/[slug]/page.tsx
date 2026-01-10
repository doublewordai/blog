import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {sanityFetch, client} from '@/sanity/lib/client'
import {POST_QUERY, POST_SLUGS_QUERY} from '@/sanity/lib/queries'
import type {Post} from '@/sanity/types'
import {MarkdownRenderer} from '@/components/MarkdownRenderer'
import {createImageUrlBuilder, type SanityImageSource} from '@sanity/image-url'
import {projectId, dataset} from '@/sanity/env'
import {BackLink} from '@/components/BackLink'
import {getPostHogClient} from '@/lib/posthog-server'

const SITE_URL = 'https://blog.doubleword.ai'

const urlFor = (source: SanityImageSource) =>
  projectId && dataset ? createImageUrlBuilder({projectId, dataset}).image(source) : null

/**
 * Generate static params for all posts
 * This enables full static site generation (SSG)
 */
export async function generateStaticParams() {
  // Use client directly for static generation (no stega, no live)
  const posts = await client.fetch<Array<{slug: string}>>(POST_SLUGS_QUERY)

  return posts.map((post) => ({
    slug: post.slug,
  }))
}

interface Props {
  params: Promise<{slug: string}>
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params

  const post = await sanityFetch({
    query: POST_QUERY,
    params: {slug},
  }) as Post | null

  if (!post) {
    return {
      title: 'Not Found',
    }
  }

  const canonicalUrl = post.canonicalUrl || `${SITE_URL}/${slug}`
  const title = `${post.title} | Doubleword`
  const description = post.description
    || (post.body
        ? post.body
            .replace(/^#.*$/gm, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/[*_`]/g, '')
            .trim()
            .split('\n')[0]
            .substring(0, 160)
        : 'Notes on building AI systems')

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Doubleword',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

async function fetchExternalContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } }) // Cache for 1 hour
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

export default async function PostPage({params}: Props) {
  const {slug} = await params

  const post = await sanityFetch({
    query: POST_QUERY,
    params: {slug},
  }) as Post | null

  if (!post) {
    notFound()
  }

  // Fetch content from external source if set
  const body = post.externalSource
    ? await fetchExternalContent(post.externalSource) || post.body
    : post.body

  // Capture server-side post_viewed event
  const posthog = getPostHogClient()
  posthog.capture({
    distinctId: 'anonymous',
    event: 'post_viewed',
    properties: {
      post_title: post.title,
      post_slug: slug,
      post_published_at: post.publishedAt,
      post_authors: post.authors?.map((a) => a.name).join(', '),
      $current_url: `${SITE_URL}/${slug}`,
    },
  })

  const postImageUrl = post.image ? urlFor(post.image)?.width(1200).height(630).url() : null

  return (
    <div className="min-h-screen flex flex-col">
      {/* Tufte-style layout: wider container on xl to accommodate sidenotes */}
      <div className="flex-1 w-full max-w-[42rem] xl:max-w-[58rem] mx-auto px-6 sm:px-8 xl:px-10 py-10 sm:py-14">
        <article className="xl:max-w-[42rem]">
          {/* Article Header */}
          <header className="mb-5 sm:mb-6 animate-fade-in animate-delay-1">
            {/* Date with back arrow - both clickable */}
            <BackLink
              href="/"
              fromPostSlug={slug}
              fromPostTitle={post.title}
              className="inline-flex items-center gap-2 text-[--muted-light] hover:text-[--accent] no-underline transition-colors group mb-4"
            >
              <span className="text-[1rem] transition-transform inline-block group-hover:-translate-x-0.5">&larr;</span>
              {post.publishedAt && (
                <time className="small-caps text-[0.85rem]">
                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              )}
            </BackLink>

            {/* Title */}
            <h1 className="text-[2.5rem] sm:text-[3rem] lg:text-[3.5rem] font-semibold leading-[1.1] tracking-tight mb-5 sm:mb-6">
              {post.title}
            </h1>

            {/* Authors - Polished Card Style */}
            {post.authors && post.authors.length > 0 && (
              <div className="flex flex-wrap gap-4 items-center">
                {post.authors.map((author, i) => (
                  <div key={i} className="author-card">
                    {author.image && (
                      <img
                        src={urlFor(author.image)?.width(96).height(96).url() || ''}
                        alt={author.name}
                        className="author-avatar"
                      />
                    )}
                    <div>
                      <div className="font-medium text-[--foreground] text-[0.95rem]">
                        {author.name}
                      </div>
                      {author.title && (
                        <div className="font-ui text-[0.8rem] text-[--muted-light]">
                          {author.title}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </header>

          {/* Video Embed */}
          {post.videoUrl && (
            <div className="mb-8 aspect-video animate-fade-in animate-delay-2">
              <iframe
                src={post.videoUrl}
                className="w-full h-full rounded-lg shadow-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Featured Image */}
          {postImageUrl && (
            <figure className="mb-8 animate-fade-in animate-delay-2">
              <img
                src={postImageUrl}
                alt={post.title}
                className="w-full rounded-lg"
                width="1200"
                height="630"
              />
            </figure>
          )}

          {/* Article Content - Tufte prose styling */}
          <div
            className="prose prose-lg max-w-none animate-fade-in animate-delay-3
            prose-headings:font-semibold
            prose-headings:tracking-tight
            prose-headings:text-[--foreground]
            prose-h1:text-[2rem] prose-h1:mt-10 prose-h1:mb-3
            prose-h2:text-[1.5rem] prose-h2:mt-10 prose-h2:mb-3
            prose-h3:text-[1.25rem] prose-h3:mt-8 prose-h3:mb-2
            prose-h4:text-[1.1rem] prose-h4:mt-6 prose-h4:mb-2
            prose-p:text-[1.05rem]
            prose-p:leading-[1.85]
            prose-p:mb-[1.5em]
            prose-p:text-[--foreground]
            prose-a:text-[--accent]
            prose-a:decoration-[--accent-muted]
            prose-a:decoration-1
            prose-a:underline-offset-[3px]
            hover:prose-a:decoration-[--accent]
            prose-strong:font-medium
            prose-strong:text-[--foreground]
            prose-em:text-[--foreground]
            prose-ul:my-4
            prose-ol:my-4
            prose-li:my-1
            prose-li:text-[1.05rem]
            prose-li:leading-[1.75]
            prose-blockquote:border-l-[3px]
            prose-blockquote:border-[--rule]
            prose-blockquote:pl-6
            prose-blockquote:italic
            prose-blockquote:text-[--muted]
            prose-blockquote:not-italic
            prose-img:rounded-lg
            prose-img:my-6
            prose-hr:border-[--rule]
            prose-hr:my-10"
          >
            {typeof body === 'string' && (
              <MarkdownRenderer content={body} images={post.images} />
            )}
          </div>

          {/* Footer divider */}
          <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-[--rule-light]" />
        </article>
      </div>

      {/* Site Footer */}
      <footer className="site-footer">
        <div className="max-w-[42rem] xl:max-w-[58rem] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="xl:max-w-[42rem]">
          <div className="footer-content flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <img src="/doubleword-icon.png" alt="" className="h-4 w-4 opacity-50" />
              <span>&copy; {new Date().getFullYear()} Doubleword</span>
            </div>
            <div className="footer-links">
              <a href="https://doubleword.ai" target="_blank" rel="noopener noreferrer">
                Main Site
              </a>
              <a href="/rss.xml" target="_blank" rel="noopener noreferrer">
                RSS
              </a>
            </div>
          </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
