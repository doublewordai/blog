'use client'

import Link from 'next/link'
import posthog from 'posthog-js'
import type {ReactNode} from 'react'

interface BackLinkProps {
  href: string
  fromPostSlug?: string
  fromPostTitle?: string
  children: ReactNode
  className?: string
}

export function BackLink({href, fromPostSlug, fromPostTitle, children, className}: BackLinkProps) {
  const handleClick = () => {
    posthog.capture('back_to_articles_clicked', {
      from_post_slug: fromPostSlug,
      from_post_title: fromPostTitle,
    })
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  )
}
