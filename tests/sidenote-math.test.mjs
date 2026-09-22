import test from 'node:test'
import assert from 'node:assert/strict'
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import {toHtml} from 'hast-util-to-html'
import {remarkSidenotes} from '../src/plugins/remark-sidenotes.mjs'

test('sidenote equation wrappers survive the Markdown pipeline and contain rendered math', async () => {
  const markdown = String.raw`An explanation.[>math]

[>math]: Keep <span class="math-keep">$x$,</span> together and **render** the equation.
<span class="sidenote-equation">$\dfrac{x}{y}$</span>`
  const processor = unified()
    .use(remarkParse).use(remarkMath).use(remarkSidenotes)
    .use(remarkRehype, {allowDangerousHtml: true})
    .use(rehypeRaw).use(rehypeKatex)
  const result = toHtml(await processor.run(processor.parse(markdown)))
  assert.match(result, /class="math-keep"><span class="katex">/)
  assert.match(result, /class="sidenote-equation"><span class="katex">/)
  assert.match(result, /<strong>render<\/strong>/)
  assert.doesNotMatch(result, /katex-error|\[&gt;math\]|&lt;span/)
})
