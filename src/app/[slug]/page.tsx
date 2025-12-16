import { defineQuery } from "next-sanity";
import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";
import { client } from "@/sanity/client";
import { sanityFetch } from "@/sanity/live";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const POST_QUERY = defineQuery(`*[_type == "post" && slug.current == $slug][0]{
  ...,
  "authors": authors[]->{"name": name, "title": title, "image": image}
}`);

type Author = {
  name: string;
  title?: string;
  image?: SanityImageSource;
};

const { projectId, dataset } = client.config();
const urlFor = (source: SanityImageSource) =>
  projectId && dataset
    ? createImageUrlBuilder({ projectId, dataset }).image(source)
    : null;

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { data: post } = await sanityFetch({
    query: POST_QUERY,
    params: await params
  });

  const postImageUrl = post?.image
    ? urlFor(post.image)?.width(1200).height(630).url()
    : null;

  return (
    <div className="min-h-screen">
      {/* Tufte-style layout with wide right margin for sidenotes */}
      <div className="max-w-[90rem] mx-auto px-8 py-16">
        <article className="max-w-[48rem] mx-auto">
          {/* Minimal back link */}
          <Link href="/" className="text-sm text-gray-500 hover:text-black mb-8 inline-block">
            ← Back
          </Link>

          {/* Article Header - tight spacing */}
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-2 leading-tight">
              {post?.title}
            </h1>
            {post?.publishedAt && (
              <time className="text-sm text-gray-500 block mb-4">
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
            )}
            {post?.authors && post.authors.length > 0 && (
              <div className="flex gap-4 items-start border-t border-gray-200 pt-4">
                {post.authors.map((author: Author, i: number) => (
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
                      {author.title && (
                        <div className="text-sm text-gray-600">{author.title}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </header>

          {/* Video Embed */}
          {post?.videoUrl && (
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
              <img
                src={postImageUrl}
                alt={post?.title}
                className="w-full"
                width="1200"
                height="630"
              />
            </figure>
          )}

          {/* Article Content - Tufte typography */}
          <div className="prose prose-lg max-w-none
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
            hover:prose-a:underline
            prose-code:text-black
            prose-code:bg-gray-100
            prose-code:px-1.5
            prose-code:py-0.5
            prose-code:rounded
            prose-code:font-mono
            prose-code:text-sm
            prose-code:before:content-['']
            prose-code:after:content-['']
            prose-pre:bg-black
            prose-pre:text-white
            prose-pre:p-4
            prose-pre:overflow-x-auto
            prose-ul:my-4
            prose-ol:my-4
            prose-li:my-1
            prose-blockquote:border-l-2
            prose-blockquote:border-gray-300
            prose-blockquote:pl-4
            prose-blockquote:italic
            prose-img:rounded-lg
            prose-img:shadow-md">
            {typeof post?.body === 'string' && (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.body}
              </ReactMarkdown>
            )}
          </div>

          {/* Minimal footer */}
          <footer className="mt-16 pt-8 border-t border-gray-300">
            <Link href="/" className="text-sm text-gray-500 hover:text-black">
              ← All articles
            </Link>
          </footer>
        </article>
      </div>
    </div>
  );
}
