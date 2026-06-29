import type {Metadata} from 'next'
import {draftMode} from 'next/headers'
import {VisualEditing} from 'next-sanity/visual-editing'
import {Analytics} from '@vercel/analytics/react'
import {SpeedInsights} from '@vercel/speed-insights/next'

// Self-hosted Google fonts via next/font: build-time subsetting, automatic
// preload, and a size-adjusted fallback face (eliminates FOUC + layout shift).
import {Crimson_Pro, IBM_Plex_Sans, Source_Sans_3, JetBrains_Mono} from 'next/font/google'

const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-crimson',
})
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-plex',
})
const sourceSans3 = Source_Sans_3({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source',
})
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
})

import 'katex/dist/katex.min.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Doubleword blog',
  description: 'Notes on building AI systems',
  alternates: {
    types: {
      'application/rss+xml': [
        {url: '/rss.xml', title: 'Doubleword blog'},
      ],
    },
  },
}

// Script to prevent flash of wrong theme
const themeScript = `
  (function() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
`

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${crimsonPro.variable} ${ibmPlexSans.variable} ${sourceSans3.variable} ${jetBrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{__html: themeScript}} />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
        {(await draftMode()).isEnabled && <VisualEditing />}
      </body>
    </html>
  )
}
