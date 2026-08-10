import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const markdownRenderer = readFileSync(
  new URL('../src/components/MarkdownRenderer.tsx', import.meta.url),
  'utf8',
)

const criuBlocks = [
  ['criu-data-path', 'CriuDataPathBlock', 'CriuDataPath'],
  ['criu-results', 'CriuResultsBlock', 'CriuResults'],
  ['criu-block-size-results', 'CriuBlockSizeResultsBlock', 'CriuBlockSizeResults'],
]

const blockTags = markdownRenderer.match(
  /const BLOCK_TAGS = new Set\(\[([\s\S]*?)\n\s*\]\)/,
)?.[1]

test('registers each CRIU custom block with the intended renderer', () => {
  for (const [tag, block] of criuBlocks) {
    assert.match(
      markdownRenderer,
      new RegExp(`['"]${tag}['"]\\s*:\\s*${block}\\b`),
      `expected <${tag}> to render with ${block}`,
    )
  }
})

test('connects the CRIU Markdown adapters to the figure components', () => {
  for (const [tag, block, component] of criuBlocks) {
    assert.match(
      markdownRenderer,
      new RegExp(`const\\s+${block}\\s*=\\s*\\(\\)\\s*=>\\s*<${component}\\s*/>`),
      `expected the <${tag}> adapter to render ${component}`,
    )
  }
})

test('unwraps one-line CRIU custom blocks from Markdown paragraphs', () => {
  assert.ok(blockTags, 'expected the Markdown renderer BLOCK_TAGS set')
  assert.match(
    markdownRenderer,
    /BLOCK_TAGS\.has\(c\.tagName\)/,
    'expected paragraph rendering to consult BLOCK_TAGS',
  )

  for (const [tag] of criuBlocks) {
    assert.match(
      blockTags,
      new RegExp(`['"]${tag}['"]`),
      `expected <${tag}> to be treated as a block element`,
    )
  }
})
