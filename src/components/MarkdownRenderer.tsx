"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { useMemo } from "react";
import CopyButton from "./CopyButton";

type ImageData = {
  filename: string;
  asset: {
    _id: string;
    url: string;
  };
  alt?: string;
  caption?: string;
};

export default function MarkdownRenderer({
  content,
  images
}: {
  content: string;
  images?: ImageData[];
}) {
  // Create a map of filename -> image data (URL, alt, caption)
  const imageMap = useMemo(() => {
    if (!images) return new Map();
    return new Map(images.filter(img => img.filename).map(img => [img.filename, img]));
  }, [images]);

  // Replace image filenames with Sanity CDN URLs
  const processedContent = useMemo(() => {
    if (!images || images.length === 0) return content;

    let processed = content;
    imageMap.forEach((imageData, filename) => {
      // Match markdown image syntax: ![alt](filename)
      const regex = new RegExp(`!\\[([^\\]]*)\\]\\(${filename}\\)`, 'g');
      processed = processed.replace(regex, `![$1](${imageData.asset.url})`);
    });

    return processed;
  }, [content, images, imageMap]);

  // Custom image component that uses Sanity metadata
  const ImageComponent = ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // Find the matching image data from Sanity
    const srcString = typeof src === 'string' ? src : undefined;
    const imageData = images?.find(img => srcString?.includes(img.asset._id) || srcString === img.asset.url);

    // Use Sanity's alt text if available, otherwise fall back to markdown alt
    const altText = imageData?.alt || alt || '';
    const caption = imageData?.caption;

    if (caption) {
      return (
        <figure className="my-6">
          <img src={srcString} alt={altText} className="rounded-lg w-full" {...props} />
          <figcaption className="mt-2 text-sm text-gray-600 text-center italic">
            {caption}
          </figcaption>
        </figure>
      );
    }

    return <img src={srcString} alt={altText} className="rounded-lg w-full my-6" {...props} />;
  };

  // Helper function to extract text from React children recursively
  const extractText = (node: any): string => {
    if (typeof node === 'string') {
      return node;
    }
    if (Array.isArray(node)) {
      return node.map(extractText).join('');
    }
    if (node && typeof node === 'object') {
      if (node.props && node.props.children) {
        return extractText(node.props.children);
      }
    }
    return '';
  };

  // Custom pre component that adds a copy button
  const PreComponent = ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => {
    const codeString = extractText(children);

    return (
      <div className="code-block-wrapper">
        <pre {...props}>{children}</pre>
        {codeString && <CopyButton code={codeString} />}
      </div>
    );
  };

  return (
    <div suppressHydrationWarning>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: "wrap",
              properties: { className: ["anchor"] },
            },
          ],
          rehypeHighlight,
          rehypeRaw,
        ]}
        components={{
          img: ImageComponent,
          pre: PreComponent,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
