import assert from 'node:assert/strict'
import test from 'node:test'
import {buildCtaHref} from '../src/lib/cta-url.ts'

test('returns a per-post CTA URL unchanged', () => {
  const destination = 'https://app.doubleword.ai?utm_source=blog&utm_campaign=inside_gigatoken'
  assert.equal(buildCtaHref({destination, postSlug: 'inside-gigatoken', ctaLocation: 'post_footer'}), destination)
})

test('generates the existing tracked app URL without an override', () => {
  assert.equal(
    buildCtaHref({postSlug: 'inside-gigatoken', ctaLocation: 'post_footer'}),
    'https://app.doubleword.ai?utm_source=blog&utm_medium=referral&utm_campaign=inside-gigatoken&utm_content=post_footer',
  )
})
