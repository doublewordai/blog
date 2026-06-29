import type {Post} from '@/sanity/types'
import {CitationBlock} from '@/components/CitationBlock'

/**
 * End-of-post block: Doubleword branding / CTA + a copyable BibTeX citation.
 * Rendered inside the article column so it inherits the post width.
 */

function buildBibtex(post: Post, url: string): string {
  const date = post.publishedAt ? new Date(post.publishedAt) : null
  const year = date ? date.getUTCFullYear() : new Date().getUTCFullYear()
  const authors =
    post.authors && post.authors.length > 0
      ? post.authors.map((a) => a.name).join(' and ')
      : 'Doubleword'
  const key = `doubleword-${post.slug.current}`

  return [
    `@misc{${key},`,
    `  title        = {${post.title}},`,
    `  author       = {${authors}},`,
    `  year         = {${year}},`,
    `  howpublished = {Doubleword Blog},`,
    `  url          = {${url}},`,
    `}`,
  ].join('\n')
}

export function PostFooter({post, siteUrl}: {post: Post; siteUrl: string}) {
  // Always cite the canonical blog.doubleword.ai URL, even for cross-posts
  // whose canonicalUrl points elsewhere.
  const url = `${siteUrl}/${post.slug.current}`
  const bibtex = buildBibtex(post, url)

  return (
    <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-[--rule-light]">
      <aside className="post-cta">
        <div className="post-cta-head">
          <img src="/doubleword-icon.png" alt="" className="post-cta-logo" />
          <span>About Doubleword</span>
        </div>
        <p>
          Doubleword is an inference provider delivering highly efficient inference for
          open-source and custom models. By optimizing the full stack for throughput&mdash;from
          hardware to inference engine&mdash;we offer some of the lowest token costs available on
          the market. That means abundant, affordable tokens for background agents, data processing, batch
          inference, and embeddings.
        </p>
        <div className="post-cta-actions">
          <a
            href="https://app.doubleword.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="post-cta-button"
          >
            Start building with free credits
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
        <p className="post-cta-hiring">
          Interested in helping us make inference 100x more efficient? We&rsquo;re hiring&mdash;reach us
          at <a href="mailto:careers@doubleword.ai">careers@doubleword.ai</a>.
        </p>
      </aside>

      <div className="post-citation">
        <div className="post-citation-label small-caps">Cite this post</div>
        <CitationBlock bibtex={bibtex} />
      </div>
    </div>
  )
}
