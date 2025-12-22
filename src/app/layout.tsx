import type {Metadata} from 'next'
import {Lora, Space_Grotesk} from 'next/font/google'
import './globals.css'

const lora = Lora({
  variable: '--font-lora',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Doubleword blog',
  description: 'Notes on building AI systems',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${lora.variable} ${spaceGrotesk.variable} font-serif antialiased bg-white text-black`}
      >
        {children}
      </body>
    </html>
  )
}
