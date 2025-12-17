import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/live";
import Link from "next/link";

const POSTS_PER_PAGE = 12;

const POSTS_QUERY = defineQuery(`*[
  _type == "post"
  && defined(slug.current)
]|order(publishedAt desc)[$start...$end]{
  _id,
  title,
  slug,
  publishedAt,
  body,
  "authors": authors[]->{"name": name, "title": title}
}`);

const POSTS_COUNT_QUERY = defineQuery(`count(*[
  _type == "post"
  && defined(slug.current)
])`);

type Post = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  body?: string;
  authors?: { name: string; title?: string }[];
};

export default async function IndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;

  const { data: posts } = await sanityFetch({
    query: POSTS_QUERY,
    params: { start, end },
  });

  const { data: totalPosts } = await sanityFetch({
    query: POSTS_COUNT_QUERY,
  });

  const totalPages = Math.ceil((totalPosts || 0) / POSTS_PER_PAGE);

  return (
    <div className="min-h-screen max-w-[48rem] mx-auto px-8 py-16">
        {/* Minimal Header */}
        <header className="mb-6 pb-8 border-b border-gray-300">
          <div className="flex items-center gap-3 mb-2">
            <img src="/doubleword-icon.png" alt="Doubleword" className="h-10 w-10" />
            <h1 className="text-4xl font-bold">Doubleword blog</h1>
          </div>
          <p className="text-gray-600">Notes on building AI systems</p>
        </header>

      {/* Blog Posts */}
      <main>
        {!posts || posts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-600">No posts yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post: Post) => {
              // Extract single line summary from markdown body
              const summary = typeof post.body === 'string'
                ? post.body
                    .replace(/^#.*$/gm, '') // Remove headers
                    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
                    .replace(/[*_`]/g, '') // Remove markdown formatting
                    .trim()
                    .split('\n')[0] // Take first line
                    .substring(0, 120) + '...'
                : '';

              return (
                <article key={post._id} className="group">
                  <Link href={`/${post.slug.current}`}>
                    <h2 className="text-2xl font-semibold mb-1 group-hover:text-accent transition-colors">
                      {post.title}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                      <time>
                        {new Date(post.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </time>
                      {post.authors && post.authors.length > 0 && (
                        <>
                          <span>·</span>
                          <span>{post.authors.map(a => a.name).join(', ')}</span>
                        </>
                      )}
                    </div>
                    {summary && (
                      <p className="text-gray-600 text-sm truncate">
                        {summary}
                      </p>
                    )}
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="mt-12 pt-8 border-t border-gray-300">
            <div className="flex justify-center items-center gap-2">
              {/* Previous Button */}
              {currentPage > 1 ? (
                <Link
                  href={currentPage === 2 ? "/" : `/?page=${currentPage - 1}`}
                  className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </Link>
              ) : (
                <span className="px-4 py-2 rounded-md border border-gray-200 text-gray-400 cursor-not-allowed">
                  Previous
                </span>
              )}

              {/* Page Numbers */}
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1;

                    // Show ellipsis
                    const showEllipsisBefore =
                      page === 2 && currentPage > 3;
                    const showEllipsisAfter =
                      page === totalPages - 1 && currentPage < totalPages - 2;

                    if (!showPage && !showEllipsisBefore && !showEllipsisAfter) {
                      return null;
                    }

                    if (showEllipsisBefore || showEllipsisAfter) {
                      return (
                        <span
                          key={`ellipsis-${page}`}
                          className="px-3 py-2 text-gray-400"
                        >
                          ...
                        </span>
                      );
                    }

                    return (
                      <Link
                        key={page}
                        href={page === 1 ? "/" : `/?page=${page}`}
                        className={`px-4 py-2 rounded-md transition-colors ${
                          currentPage === page
                            ? "bg-accent text-white font-semibold"
                            : "border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </Link>
                    );
                  }
                )}
              </div>

              {/* Next Button */}
              {currentPage < totalPages ? (
                <Link
                  href={`/?page=${currentPage + 1}`}
                  className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Next
                </Link>
              ) : (
                <span className="px-4 py-2 rounded-md border border-gray-200 text-gray-400 cursor-not-allowed">
                  Next
                </span>
              )}
            </div>

            {/* Page Info */}
            <p className="text-center text-sm text-gray-500 mt-4">
              Page {currentPage} of {totalPages} ({totalPosts} post
              {totalPosts === 1 ? "" : "s"})
            </p>
          </nav>
        )}
      </main>
    </div>
  );
}
