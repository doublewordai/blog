import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {sanityFetch} from '@/sanity/lib/client'
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
  const posts = (await sanityFetch({
    query: POST_SLUGS_QUERY,
    tags: [],
  })) as Array<{slug: string}>

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

  const post = (await sanityFetch({
    query: POST_QUERY,
    params: {slug},
    tags: ['post'],
  })) as Post

  if (!post) {
    return {
      title: 'Not Found',
    }
  }

  const canonicalUrl = `${SITE_URL}/${slug}`
  const title = `${post.title} | Doubleword`
  const description = post.body
    ? post.body
        .replace(/^#.*$/gm, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_`]/g, '')
        .trim()
        .split('\n')[0]
        .substring(0, 160)
    : 'Notes on building AI systems'

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

export default async function PostPage({params}: Props) {
  const {slug} = await params

  const post = (await sanityFetch({
    query: POST_QUERY,
    params: {slug},
    tags: ['post'],
  })) as Post

  if (!post) {
    notFound()
  }

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
      {/* Centered layout */}
      <div className="flex-1 max-w-[50rem] mx-auto px-6 sm:px-8 py-10 sm:py-14">
        <article>
          {/* Back navigation */}
          <BackLink
            href="/"
            fromPostSlug={slug}
            fromPostTitle={post.title}
            className="inline-flex items-center gap-2 text-[0.875rem] font-ui text-[--muted] hover:text-[--accent] no-underline mb-12 transition-colors animate-fade-in group"
          >
            <span className="transition-transform group-hover:-translate-x-1">&larr;</span>
            <span>All articles</span>
          </BackLink>

          {/* Article Header */}
          <header className="mb-14 animate-fade-in animate-delay-1">
            {/* Date in small caps */}
            {post.publishedAt && (
              <time className="small-caps text-[0.85rem] text-[--muted-light] block mb-4">
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}

            {/* Title */}
            <h1 className="text-[2.25rem] sm:text-[2.75rem] lg:text-[3.25rem] font-semibold leading-[1.1] tracking-tight mb-8">
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
            <div className="mb-12 aspect-video animate-fade-in animate-delay-2">
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
            <figure className="mb-14 animate-fade-in animate-delay-2">
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
            prose-h1:text-[2rem] prose-h1:mt-14 prose-h1:mb-4
            prose-h2:text-[1.5rem] prose-h2:mt-14 prose-h2:mb-4
            prose-h3:text-[1.25rem] prose-h3:mt-10 prose-h3:mb-3
            prose-h4:text-[1.1rem] prose-h4:mt-8 prose-h4:mb-2
            prose-p:text-[1.05rem]
            prose-p:leading-[1.85]
            prose-p:mb-[1.5em]
            prose-p:text-[--foreground]
            prose-a:text-[--accent]
            prose-a:decoration-[--accent-muted]
            prose-a:decoration-1
            prose-a:underline-offset-[3px]
            hover:prose-a:decoration-[--accent]
            prose-strong:font-semibold
            prose-strong:text-[--foreground]
            prose-em:text-[--foreground]
            prose-ul:my-6
            prose-ol:my-6
            prose-li:my-2
            prose-li:text-[1.05rem]
            prose-li:leading-[1.75]
            prose-blockquote:border-l-[3px]
            prose-blockquote:border-[--rule]
            prose-blockquote:pl-6
            prose-blockquote:italic
            prose-blockquote:text-[--muted]
            prose-blockquote:not-italic
            prose-img:rounded-lg
            prose-img:my-10
            prose-hr:border-[--rule]
            prose-hr:my-16"
          >
            {typeof post.body === 'string' && (
              <MarkdownRenderer content={post.body} images={post.images} />
            )}
          </div>

          {/* Footer navigation */}
          <footer className="mt-24 pt-10 border-t border-[--rule-light] animate-fade-in animate-delay-4">
            <BackLink
              href="/"
              fromPostSlug={slug}
              fromPostTitle={post.title}
              className="inline-flex items-center gap-2 text-[0.875rem] font-ui text-[--muted] hover:text-[--accent] no-underline transition-colors group"
            >
              <span className="transition-transform group-hover:-translate-x-1">&larr;</span>
              <span>All articles</span>
            </BackLink>
          </footer>
        </article>
      </div>

      {/* Site Footer */}
      <footer className="site-footer">
        <div className="max-w-[50rem] mx-auto px-6 sm:px-8">
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
      </footer>
    </div>
  )
}
