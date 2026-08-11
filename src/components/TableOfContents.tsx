import GithubSlugger from 'github-slugger'

interface TocChild {
  text: string
  id: string
}

interface TocEntry {
  text: string
  id: string
  children: TocChild[]
  appendix: boolean
  appendixStart: boolean
}

// Reduce a raw markdown heading line to the text content rehype-slug sees:
// markup stripped, then remark-smartypants' punctuation substitutions applied.
function headingText(raw: string): string {
  return raw
    .replace(/\[>[^\]]*\]/g, '') // sidenote references
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/(\*\*|__)/g, '')
    .replace(/\.\.\./g, '…')
    .replace(/---/g, '—')
    .replace(/--/g, '—')
    .trim()
}

export function extractToc(markdown: string): TocEntry[] {
  // MarkdownRenderer strips the leading H1 (the title) before parsing, so it
  // never reaches rehype-slug; mirror that so slug numbering stays aligned.
  const content = markdown.replace(/^(---[\s\S]*?---\n+)?#\s+.+\n+/, '$1')

  const slugger = new GithubSlugger()
  const toc: TocEntry[] = []
  let last: TocEntry | null = null
  let inAppendix = false
  let inFence = false

  for (const line of content.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line)
    if (!m) continue

    const depth = m[1].length
    const text = headingText(m[2])
    // Every heading consumes a slug, so duplicate-name suffixes (-1, -2)
    // match rehype-slug even for depths the ToC doesn't display.
    const id = slugger.slug(text)

    if (depth === 2) {
      const appendixStart = !inAppendix && /^appendix\b/i.test(text)
      if (appendixStart) inAppendix = true
      last = {text, id, children: [], appendix: inAppendix, appendixStart}
      toc.push(last)
    } else if (depth === 3 && last) {
      last.children.push({text, id})
    }
  }

  return toc
}

export function TableOfContents({content}: {content: string}) {
  const toc = extractToc(content)
  if (toc.length < 3) return null

  return (
    <nav aria-label="Table of contents" className="font-ui">
      <div className="small-caps text-[0.75rem] text-[--muted-light] mb-2.5">Contents</div>
      <ul className="space-y-1.5 text-[0.75rem] leading-snug">
        {toc.map((h2) => (
          <li
            key={h2.id}
            className={[
              h2.appendix ? 'opacity-60' : '',
              h2.appendixStart ? 'mt-3 pt-3 border-t border-[--rule]' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <a
              href={`#${h2.id}`}
              className="text-[--muted] hover:text-[--accent] no-underline transition-colors"
            >
              {h2.text}
            </a>
            {h2.children.length > 0 && (
              <ul className="ml-2.5 mt-1 space-y-1 border-l border-[--rule] pl-2.5">
                {h2.children.map((h3) => (
                  <li key={h3.id}>
                    <a
                      href={`#${h3.id}`}
                      className="text-[0.7rem] text-[--muted-light] hover:text-[--accent] no-underline transition-colors"
                    >
                      {h3.text}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
