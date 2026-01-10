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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${crimsonPro.variable} ${ibmPlexSans.variable} ${sourceSans.variable} ${jetbrainsMono.variable}`}>
        {children}
        <Analytics />
        <SpeedInsights />
        {(await draftMode()).isEnabled && <VisualEditing />}
      </body>
    </html>
  )
}
