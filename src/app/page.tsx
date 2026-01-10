import {sanityFetch} from '@/sanity/lib/client'
import {POSTS_QUERY, POSTS_COUNT_QUERY} from '@/sanity/lib/queries'
import type {PostForList} from '@/sanity/types'
import {PostLink} from '@/components/PostLink'
import {PaginationLink} from '@/components/PaginationLink'

const POSTS_PER_PAGE = 12

export default async function IndexPage({
  searchParams,
}: {
  searchParams: Promise<{page?: string}>
}) {
  const params = await searchParams
  const currentPage = Number(params.page) || 1
  const start = (currentPage - 1) * POSTS_PER_PAGE
  const end = start + POSTS_PER_PAGE

  const [posts, totalPosts] = await Promise.all([
    sanityFetch({
      query: POSTS_QUERY,
      params: {start, end},
    }) as Promise<PostForList[]>,
    sanityFetch({
      query: POSTS_COUNT_QUERY,
    }) as Promise<number>,
  ])

  const totalPages = Math.ceil((totalPosts || 0) / POSTS_PER_PAGE)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Centered layout */}
      <div className="flex-1 max-w-[50rem] mx-auto px-6 sm:px-8 py-8 sm:py-12">
        {/* Refined Header with Brand Typography */}
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-2">
            <img
              src="/doubleword-icon.png"
              alt="Doubleword"
              className="h-10 w-10 animate-header-logo"
            />
            <h1 className="brand-title text-[2.25rem] sm:text-[2.5rem] animate-header-title">
              <span className="brand-title-double">Double</span>
              <span className="brand-title-word">word</span>
            </h1>
          </div>
          <p className="brand-tagline text-[--muted] text-[0.85rem] ml-[3.5rem] animate-header-tagline">
            Notes on Building AI Systems
          </p>
        </header>

        {/* Blog Posts */}
        <main>
          {!posts || posts.length === 0 ? (
            <div className="py-20 text-center animate-fade-in">
              <p className="text-[--muted] italic text-lg">No posts yet.</p>
              <p className="text-[--muted-light] text-sm mt-2">Check back soon for new articles.</p>
            </div>
          ) : (
            <div className="divide-y divide-[--rule-light]">
              {posts.map((post, index) => {
                // Use description if available, otherwise extract from body
                const summary = post.description
                  || (typeof post.body === 'string'
                      ? post.body
                          .replace(/^#.*$/gm, '') // Remove headers
                          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
                          .replace(/[*_`]/g, '') // Remove markdown formatting
                          .trim()
                          .split('\n')
                          .filter((line) => line.trim())[0] // Take first non-empty line
                      : '')

                // Format index with leading zero
                const indexStr = String(index + 1 + start).padStart(2, '0')

                return (
                  <article
                    key={post._id}
                    className={`post-card group animate-fade-in animate-delay-${Math.min(index + 2, 12)}`}
                  >
                    <PostLink
                      href={`/${post.slug.current}`}
                      postTitle={post.title}
                      postId={post._id}
                      className="block"
                    >
                      {/* Meta row with index and date */}
                      <div className="flex items-baseline gap-4 mb-3">
                        <span className="post-index">{indexStr}</span>
                        {post.publishedAt && (
                          <time className="small-caps text-[0.8rem] text-[--muted-light]">
                            {new Date(post.publishedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </time>
                        )}
                        {post.authors && post.authors.length > 0 && (
                          <>
                            <span className="text-[--rule]">/</span>
                            <span className="font-ui text-[0.8rem] text-[--muted-light]">
                              {post.authors.map((a) => a.name).join(', ')}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Title */}
                      <h2 className="text-[1.35rem] sm:text-[1.5rem] font-semibold leading-snug text-[--foreground] mb-1">
                        {post.title}
                      </h2>

                      {/* Summary with line clamp */}
                      {summary && (
                        <p className="text-[--muted] leading-relaxed text-[0.95rem] line-clamp-2">
                          {summary}
                        </p>
                      )}
                    </PostLink>
                  </article>
                )
              })}
            </div>
          )}

          {/* Refined Pagination */}
          {totalPages > 1 && (
            <nav className="mt-16 pt-8 border-t border-[--rule] animate-fade-in animate-delay-10">
              <div className="flex justify-center items-center gap-8 text-[0.9rem] font-ui">
                {/* Previous Link */}
                {currentPage > 1 ? (
                  <PaginationLink
                    href={currentPage === 2 ? '/' : `/?page=${currentPage - 1}`}
                    targetPage={currentPage - 1}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    className="text-[--muted] hover:text-[--foreground] transition-colors"
                  >
                    <span className="mr-1">&larr;</span> Previous
                  </PaginationLink>
                ) : (
                  <span className="text-[--rule] select-none">
                    <span className="mr-1">&larr;</span> Previous
                  </span>
                )}

                {/* Page indicator */}
                <span className="small-caps text-[--muted-light] tracking-wider">
                  {currentPage} of {totalPages}
                </span>

                {/* Next Link */}
                {currentPage < totalPages ? (
                  <PaginationLink
                    href={`/?page=${currentPage + 1}`}
                    targetPage={currentPage + 1}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    className="text-[--muted] hover:text-[--foreground] transition-colors no-underline"
                  >
                    Next <span className="ml-1">&rarr;</span>
                  </PaginationLink>
                ) : (
                  <span className="text-[--rule] select-none">
                    Next <span className="ml-1">&rarr;</span>
                  </span>
                )}
              </div>
            </nav>
          )}
        </main>
      </div>

      {/* Footer */}
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
