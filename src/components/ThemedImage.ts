import {createElement, Fragment, type ImgHTMLAttributes} from 'react'

/** Both palettes are static files; the page's data-theme chooses the visible one. */
export function ThemedImage({
  darkSrc,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & {darkSrc?: string}) {
  if (!darkSrc) return createElement('img', props)

  return createElement(
    Fragment,
    null,
    createElement('img', {...props, 'data-figure-theme': 'light'}),
    createElement('img', {...props, src: darkSrc, 'data-figure-theme': 'dark'}),
  )
}
