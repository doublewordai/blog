import {MarkdownAsync, type Components} from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkFrontmatter from 'remark-frontmatter'
import remarkUnwrapImages from 'remark-unwrap-images'
import {remarkSidenotes} from '@/plugins/remark-sidenotes.mjs'
import rehypeShiki from '@shikijs/rehype'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import CopyButton from './CopyButton'
import StartupBreakdown from './StartupBreakdown'
import EntropyBars from './EntropyBars'
import MagnitudeHistogram from './MagnitudeHistogram'
import GumbelCollapse from './GumbelCollapse'
import AmplificationVsStreamLength from './AmplificationVsStreamLength'
import KernelBandwidthBars from './KernelBandwidthBars'
import Mi300xThroughputBars from './Mi300xThroughputBars'
import RooflineExpertStack from './RooflineExpertStack'
import SpecDecLedger from './SpecDecLedger'
import SpecDecOptimalGamma from './SpecDecOptimalGamma'

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
  // Strip the first H1 heading (title) from the content since it's displayed separately
  // Handle both: content with frontmatter (---...---) and without
  let processedContent = content.replace(/^(---[\s\S]*?---\n+)?#\s+.+\n+/, '$1')

  // Replace image filenames with Sanity CDN URLs
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

    // SVGs are typically diagrams: skip the photo styling (shadow, rounded, force-full-width).
    const isSvg = !!srcString && /\.svg(\?|$)/i.test(srcString)
    const photoClass = 'rounded-lg w-full my-6 shadow-md'
    const diagramClass = 'block mx-auto max-w-full my-6'
    const imgClass = isSvg ? diagramClass : photoClass

    if (caption) {
      return (
        <figure className="my-6">
          <img src={srcString} alt={altText} className={imgClass} {...props} />
          <figcaption className="mt-2 text-sm text-gray-600 text-center italic">{caption}</figcaption>
        </figure>
      )
    }

    return <img src={srcString} alt={altText} className={imgClass} {...props} />
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

  // Custom <startup-breakdown bars='[...]' /> tag: JSON bars in an attribute, rendered as the React component.
  // `showlegend="false"` (HTML-lowercased) hides the legend; default is shown.
  const StartupBreakdownBlock = ({bars, showlegend}: {bars?: string; showlegend?: string}) => {
    if (!bars) return null
    try {
      return <StartupBreakdown bars={JSON.parse(bars)} showLegend={showlegend !== 'false'} />
    } catch {
      return null
    }
  }

  // Weight-entropy chart blocks. `defaultformats` (HTML-lowercased) takes a JSON-array string of format names.
  const parseFormats = (s?: string): string[] | undefined => {
    if (!s) return undefined
    try {
      const v = JSON.parse(s)
      return Array.isArray(v) ? v : undefined
    } catch {
      return undefined
    }
  }

  const EntropyBarsBlock = ({defaultformats}: {defaultformats?: string}) => (
    <EntropyBars defaultFormats={parseFormats(defaultformats)} />
  )
  const MagnitudeHistogramBlock = ({defaultformats}: {defaultformats?: string}) => (
    <MagnitudeHistogram defaultFormats={parseFormats(defaultformats)} />
  )
  const GumbelCollapseBlock = ({defaultformats}: {defaultformats?: string}) => (
    <GumbelCollapse defaultFormats={parseFormats(defaultformats)} />
  )

  // Speed-of-light post chart blocks. Data is baked into each component, no attributes.
  const AmplificationVsStreamLengthBlock = () => <AmplificationVsStreamLength />
  const KernelBandwidthBarsBlock = () => <KernelBandwidthBars />
  const Mi300xThroughputBarsBlock = () => <Mi300xThroughputBars />

  // Economics-of-speculative-decoding chart blocks. Self-contained, no attributes.
  const RooflineExpertStackBlock = () => <RooflineExpertStack />
  const SpecDecLedgerBlock = () => <SpecDecLedger />
  const SpecDecOptimalGammaBlock = () => <SpecDecOptimalGamma />

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
      remarkPlugins={[remarkFrontmatter, remarkGfm, remarkMath, remarkUnwrapImages, remarkSidenotes]}
      rehypePlugins={[
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'wrap',
            properties: {className: ['anchor']},
          },
        ],
        rehypeRaw, // Parse raw HTML first (including sidenotes)
        rehypeKatex, // Then process math (including math in sidenotes)
        [
          rehypeShiki,
          {
            themes: {
              light: 'github-light',
              dark: 'github-dark',
            },
            defaultColor: false,
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
      ]}
      components={
        {
          img: ImageComponent,
          pre: PreComponent,
          'startup-breakdown': StartupBreakdownBlock,
          'entropy-bars': EntropyBarsBlock,
          'magnitude-histogram': MagnitudeHistogramBlock,
          'gumbel-collapse': GumbelCollapseBlock,
          'amplification-vs-stream-length': AmplificationVsStreamLengthBlock,
          'kernel-bandwidth-bars': KernelBandwidthBarsBlock,
          'mi300x-throughput-bars': Mi300xThroughputBarsBlock,
          'roofline-expert-stack': RooflineExpertStackBlock,
          'spec-dec-ledger': SpecDecLedgerBlock,
          'spec-dec-optimal-gamma': SpecDecOptimalGammaBlock,
        } as Components
      }
    >
      {processedContent}
    </MarkdownAsync>
  )
}
