import {MarkdownAsync, type Components} from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkFrontmatter from 'remark-frontmatter'
import remarkUnwrapImages from 'remark-unwrap-images'
import {remarkSidenotes} from '@/plugins/remark-sidenotes.mjs'
import remarkSmartypants from 'remark-smartypants'
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
import DrafterCrossover from './DrafterCrossover'
import PricingEnvelope from './PricingEnvelope'
import AcceptanceCurve from './AcceptanceCurve'
import ParetoFrontier from './ParetoFrontier'
import ExpertPopularity from './ExpertPopularity'
import WidthVsDepth from './WidthVsDepth'
import AcceptLengthHist from './AcceptLengthHist'
import AcceptJointHeatmap from './AcceptJointHeatmap'
import GatingLadder from './GatingLadder'

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
  const DrafterCrossoverBlock = () => <DrafterCrossover />
  const PricingEnvelopeBlock = () => <PricingEnvelope />
  const AcceptanceCurveBlock = () => <AcceptanceCurve />
  const ParetoFrontierBlock = () => <ParetoFrontier />

  // Width-vs-depth (speculating-on-the-margin) chart blocks. Self-contained.
  const ExpertPopularityBlock = () => <ExpertPopularity />
  const WidthVsDepthBlock = () => <WidthVsDepth />
  const AcceptLengthHistBlock = () => <AcceptLengthHist />
  const AcceptJointHeatmapBlock = () => <AcceptJointHeatmap />
  const GatingLadderBlock = () => <GatingLadder />

  // <ghost-aside> ... </ghost-aside>: muted dashed-border aside, ported from the
  // personal blog's Aside.astro. Open/close tags must sit on their own lines with
  // blank lines around the content so the inner markdown still gets parsed.
  const GhostAsideBlock = ({children}: {children?: React.ReactNode}) => (
    <aside
      style={{
        margin: '1.5rem 0',
        padding: '0.6rem 0 0.6rem 0.9rem',
        borderLeft: '3px dashed color-mix(in srgb, var(--foreground) 25%, transparent)',
        color: 'color-mix(in srgb, var(--foreground) 72%, transparent)',
        fontSize: '0.95rem',
      }}
    >
      <span
        style={{
          display: 'block',
          fontSize: '0.75rem',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '0.3rem',
        }}
      >
        Note
      </span>
      <div>{children}</div>
    </aside>
  )

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
      remarkPlugins={[remarkFrontmatter, remarkGfm, remarkMath, remarkUnwrapImages, remarkSidenotes, remarkSmartypants]}
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
              'c',
              'cpp',
              'asm',
              'sass',
            ],
            // map fence labels used in posts to loaded grammars
            // (matches the personal blog's Shiki langAlias)
            langAlias: {
              cuda: 'cpp',
              ptx: 'asm',
              txt: 'text',
            },
            defaultLanguage: 'text',
            // any unlisted language still renders themed (never invisible)
            fallbackLanguage: 'text',
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
          'drafter-crossover': DrafterCrossoverBlock,
          'pricing-envelope': PricingEnvelopeBlock,
          'acceptance-curve': AcceptanceCurveBlock,
          'pareto-frontier': ParetoFrontierBlock,
          'expert-popularity': ExpertPopularityBlock,
          'width-vs-depth': WidthVsDepthBlock,
          'accept-length-hist': AcceptLengthHistBlock,
          'accept-joint-heatmap': AcceptJointHeatmapBlock,
          'gating-ladder': GatingLadderBlock,
          'ghost-aside': GhostAsideBlock,
        } as Components
      }
    >
      {processedContent}
    </MarkdownAsync>
  )
}
