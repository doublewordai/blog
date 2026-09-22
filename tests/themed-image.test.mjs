import assert from 'node:assert/strict'
import test from 'node:test'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {ThemedImage} from '../src/components/ThemedImage.ts'

test('ordinary images retain a single image and their attributes', () => {
  const html = renderToStaticMarkup(createElement(ThemedImage, {src: '/photo.jpg', alt: 'Photo', loading: 'lazy'}))
  assert.equal((html.match(/<img /g) || []).length, 1)
  assert.match(html, /alt="Photo"/)
  assert.match(html, /loading="lazy"/)
  assert.doesNotMatch(html, /data-figure-theme/)
})

test('paired figures render distinct fixed sources with the same accessible description', () => {
  const html = renderToStaticMarkup(createElement(ThemedImage, {src: '/light.svg', darkSrc: '/dark.svg', alt: 'Throughput', className: 'diagram'}))
  const images = html.match(/<img [^>]+>/g)
  assert.equal(images.length, 2)
  assert.match(images[0], /src="\/light.svg"/)
  assert.match(images[0], /data-figure-theme="light"/)
  assert.match(images[1], /src="\/dark.svg"/)
  assert.match(images[1], /data-figure-theme="dark"/)
  for (const image of images) {
    assert.match(image, /alt="Throughput"/)
    assert.match(image, /class="diagram"/)
  }
})
