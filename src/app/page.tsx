import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/live";
import Link from "next/link";

const POSTS_QUERY = defineQuery(`*[
  _type == "post"
  && defined(slug.current)
]|order(publishedAt desc)[0...12]{
  _id,
  title,
  slug,
  publishedAt,
  body,
  "authors": authors[]->{"name": name, "title": title}
}`);

export default async function IndexPage() {
  const { data: posts } = await sanityFetch({ query: POSTS_QUERY });

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
            {posts.map((post) => {
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
      </main>
    </div>
  );
}
