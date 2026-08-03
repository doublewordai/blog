import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const source = readFileSync(
  new URL('../src/components/GigatokenDiagrams.tsx', import.meta.url),
  'utf8',
)
const parallelDiagram = source.match(/"gigatoken-parallel": \{[\s\S]*?\n  \}/)?.[0]

test('keeps accent fills off text boxes in the final diagram', () => {
  assert.ok(parallelDiagram, 'expected the final Gigatoken diagram source')
  assert.doesNotMatch(
    parallelDiagram,
    /<rect[^>]*fill=\\"var\(--accent(?:-muted|-subtle)?\)\\"/,
  )
})
