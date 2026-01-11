import type {Metadata} from 'next'
import {draftMode} from 'next/headers'
import {Crimson_Pro, IBM_Plex_Sans, JetBrains_Mono, Source_Sans_3} from 'next/font/google'
import {VisualEditing} from 'next-sanity/visual-editing'
import {Analytics} from '@vercel/analytics/react'
import {SpeedInsights} from '@vercel/speed-insights/next'
import 'katex/dist/katex.min.css'
import './globals.css'

const crimsonPro = Crimson_Pro({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

const sourceSans = Source_Sans_3({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Doubleword blog',
  description: 'Notes on building AI systems',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: themeScript}} />
      </head>
      <body className={`${crimsonPro.variable} ${ibmPlexSans.variable} ${sourceSans.variable} ${jetbrainsMono.variable}`}>
        {children}
        <Analytics />
        <SpeedInsights />
        {(await draftMode()).isEnabled && <VisualEditing />}
      </body>
    </html>
  )
}
