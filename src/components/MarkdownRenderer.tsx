import {MarkdownAsync} from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkUnwrapImages from 'remark-unwrap-images'
import {remarkSidenotes} from '@/plugins/remark-sidenotes.mjs'
import rehypeShiki from '@shikijs/rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import CopyButton from './CopyButton'

type ImageData = {
  filename: string
  asset: {
    _id: string
    url: string
  }
  alt?: string
  caption?: string
}

export async function MarkdownRenderer({
  content,
  images,
}: {
  content: string
  images?: ImageData[]
}) {
  // Replace image filenames with Sanity CDN URLs
  let processedContent = content
  if (images && images.length > 0) {
    const imageMap = new Map(images.filter((img) => img.filename).map((img) => [img.filename, img]))

    imageMap.forEach((imageData, filename) => {
      const regex = new RegExp(`!\\[([^\\]]*)\\]\\(${filename}\\)`, 'g')
      processedContent = processedContent.replace(regex, `![$1](${imageData.asset.url})`)
    })
  }

  // Custom image component that uses Sanity metadata
  const ImageComponent = ({src, alt, ...props}: React.ImgHTMLAttributes<HTMLImageElement>) => {
    const srcString = typeof src === 'string' ? src : undefined
    const imageData = images?.find(
      (img) => srcString?.includes(img.asset._id) || srcString === img.asset.url
    )

    const altText = imageData?.alt || alt || ''
    const caption = imageData?.caption

    if (caption) {
      return (
        <figure className="my-6">
          <img src={srcString} alt={altText} className="rounded-lg w-full shadow-md" {...props} />
          <figcaption className="mt-2 text-sm text-gray-600 text-center italic">{caption}</figcaption>
        </figure>
      )
    }

    return <img src={srcString} alt={altText} className="rounded-lg w-full my-6 shadow-md" {...props} />
  }

  // Helper function to extract text from React children recursively
  const extractText = (node: unknown): string => {
    if (typeof node === 'string') {
      return node
    }
    if (Array.isArray(node)) {
      return node.map(extractText).join('')
    }
    if (node && typeof node === 'object' && 'props' in node) {
      const props = (node as {props?: {children?: unknown}}).props
      if (props && props.children) {
        return extractText(props.children)
      }
    }
    return ''
  }

  // Custom pre component that adds a copy button
  const PreComponent = ({children, ...props}: React.HTMLAttributes<HTMLPreElement>) => {
    const codeString = extractText(children)

    return (
      <div className="code-block-wrapper">
        <pre {...props}>{children}</pre>
        {codeString && <CopyButton />}
      </div>
    )
  }

  return (
    <MarkdownAsync
      remarkPlugins={[remarkGfm, remarkUnwrapImages, remarkSidenotes]}
      rehypePlugins={[
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'wrap',
            properties: {className: ['anchor']},
          },
        ],
        [
          rehypeShiki,
          {
            theme: 'github-light',
            langs: [
              'javascript',
              'typescript',
              'python',
              'bash',
              'json',
              'jsx',
              'tsx',
              'yaml',
              'shell',
              'go',
              'rust',
              'sql',
              'html',
              'css',
              'markdown',
              'text',
              'plaintext',
            ],
            defaultLanguage: 'text',
          },
        ],
        rehypeRaw,
      ]}
      components={{
        img: ImageComponent,
        pre: PreComponent,
      }}
    >
      {processedContent}
    </MarkdownAsync>
  )
}
