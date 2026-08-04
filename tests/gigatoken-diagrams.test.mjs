import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const source = readFileSync(
  new URL('../src/components/GigatokenDiagrams.tsx', import.meta.url),
  'utf8',
)
const markdownRenderer = readFileSync(
  new URL('../src/components/MarkdownRenderer.tsx', import.meta.url),
  'utf8',
)
const globalStyles = readFileSync(
  new URL('../src/app/globals.css', import.meta.url),
  'utf8',
)
const parallelDiagram = source.match(/"gigatoken-parallel": \{[\s\S]*?\n  \}/)?.[0]
const workedExampleDiagrams = [
  source.match(/const bpePipelineSvg = `[\s\S]*?<\/svg>`/)?.[0],
  source.match(/const maskScannerSvg = `[\s\S]*?<\/svg>`/)?.[0],
]
const arrowMarkers = [...source.matchAll(/<marker\b[^>]*>/g)].map((match) =>
  match[0].replaceAll('\\"', '"'),
)
const arrowConnectors = [
  ...source.matchAll(/<path\b[^>]*marker-end=(?:\\)?"[^>]*\/>/g),
].map((match) => match[0].replaceAll('\\"', '"'))

test('keeps accent fills off text boxes in the final diagram', () => {
  assert.ok(parallelDiagram, 'expected the final Gigatoken diagram source')
  assert.doesNotMatch(
    parallelDiagram,
    /<rect[^>]*fill=\\"var\(--accent(?:-muted|-subtle)?\)\\"/,
  )
})

test('keeps worked-example diagrams within the article width', () => {
  for (const diagram of workedExampleDiagrams) {
    assert.ok(diagram, 'expected the worked-example diagram source')
    assert.doesNotMatch(diagram, /min-width:\s*\d+px/)
  }
})

test('switches worked-example layouts with compiled responsive utilities', () => {
  assert.match(source, /className="hidden md:block"/)
  assert.match(source, /className="block md:hidden"/)
})

test('uses separate dart heads and trims connector shafts at their bases', () => {
  assert.equal(arrowMarkers.length, 7)
  assert.equal(arrowConnectors.length, 32)
  assert.equal(source.match(/M0,0 L12,6 L0,12 L4,6 Z/g)?.length, 7)

  for (const marker of arrowMarkers) {
    assert.match(marker, /markerUnits="userSpaceOnUse"/)
    assert.match(marker, /markerWidth="12"/)
    assert.match(marker, /markerHeight="12"/)
    assert.match(marker, /refX="12"/)
    assert.match(marker, /refY="6"/)
  }

  for (const connector of arrowConnectors) {
    assert.match(connector, /stroke-dasharray="\d+(?:\.\d+)? 1000"/)
  }
})

test('keeps final merge arrowheads clear of the output box', () => {
  assert.ok(parallelDiagram, 'expected the final Gigatoken diagram source')
  assert.match(parallelDiagram, /M170 418 V438 H380 L390 448/)
  assert.match(parallelDiagram, /M450 418 V448/)
  assert.match(parallelDiagram, /M730 418 V438 H520 L510 448/)
  assert.doesNotMatch(parallelDiagram, /M(?:170|450|730) 418 V451/)
})

test('wraps the pretoken text example without horizontal scrolling', () => {
  assert.match(
    markdownRenderer,
    /codeString\.startsWith\([\s\S]*?" Gigatoken optimises pretokenisation for CPU microarchitectures\./,
  )
  assert.match(
    markdownRenderer,
    /'code-block-wrapper gigatoken-pretoken-example'/,
    'the scoped class must be a complete literal so Tailwind includes its CSS',
  )
  assert.match(
    globalStyles,
    /\.gigatoken-pretoken-example pre[\s\S]*?overflow-x:\s*hidden/,
  )
  assert.match(
    globalStyles,
    /\.gigatoken-pretoken-example pre code[\s\S]*?font-size:[\s\S]*?white-space:\s*pre-wrap/,
  )
})
