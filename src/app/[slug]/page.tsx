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
  const title = `${post.title} | Doubleword Blog`
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
      siteName: 'Doubleword Blog',
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
    <div className="min-h-screen">
      {/* Tufte-style layout with wide right margin for sidenotes */}
      <div className="max-w-[90rem] mx-auto px-8 py-16">
        <article className="max-w-[48rem] mx-auto">
          {/* Minimal back link */}
          <BackLink
            href="/"
            fromPostSlug={slug}
            fromPostTitle={post.title}
            className="text-sm text-gray-500 hover:text-black mb-8 inline-block"
          >
            ← Back
          </BackLink>

          {/* Article Header - tight spacing */}
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-2 leading-tight">{post.title}</h1>
            {post.publishedAt && (
              <time className="text-sm text-gray-500 block mb-4">
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
            {post.authors && post.authors.length > 0 && (
              <div className="flex gap-4 items-start border-t border-gray-200 pt-4">
                {post.authors.map((author, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {author.image && (
                      <img
                        src={urlFor(author.image)?.width(48).height(48).url() || ''}
                        alt={author.name}
                        className="w-12 h-12 rounded-full"
                      />
                    )}
                    <div>
                      <div className="font-medium text-black">{author.name}</div>
                      {author.title && <div className="text-sm text-gray-600">{author.title}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </header>

          {/* Video Embed */}
          {post.videoUrl && (
            <div className="mb-8 aspect-video">
              <iframe
                src={post.videoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Featured Image */}
          {postImageUrl && (
            <figure className="mb-8">
              <img src={postImageUrl} alt={post.title} className="w-full" width="1200" height="630" />
            </figure>
          )}

          {/* Article Content - Tufte typography */}
          <div
            className="prose prose-lg max-w-none
            prose-headings:font-semibold
            prose-headings:mt-8
            prose-headings:mb-3
            prose-h1:text-3xl prose-h1:mt-12
            prose-h2:text-2xl prose-h2:mt-10
            prose-h3:text-xl prose-h3:mt-8
            prose-p:mb-4
            prose-p:leading-relaxed
            prose-a:text-accent
            prose-a:no-underline
            prose-a:hover:underline
            prose-ul:my-4
            prose-ol:my-4
            prose-li:my-1
            prose-blockquote:border-l-2
            prose-blockquote:border-gray-300
            prose-blockquote:pl-4
            prose-blockquote:italic
            prose-img:rounded-lg
            prose-img:shadow-md"
          >
            {typeof post.body === 'string' && (
              <MarkdownRenderer content={post.body} images={post.images} />
            )}
          </div>

          {/* Minimal footer */}
          <footer className="mt-16 pt-8 border-t border-gray-300">
            <BackLink
              href="/"
              fromPostSlug={slug}
              fromPostTitle={post.title}
              className="text-sm text-gray-500 hover:text-black"
            >
              ← All articles
            </BackLink>
          </footer>
        </article>
      </div>
    </div>
  )
}
