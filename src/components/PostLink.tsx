'use client'

import Link from 'next/link'
import posthog from 'posthog-js'
import type {ReactNode} from 'react'

interface PostLinkProps {
  href: string
  postTitle: string
  postId: string
  children: ReactNode
  className?: string
}

export function PostLink({href, postTitle, postId, children, className}: PostLinkProps) {
  const handleClick = () => {
    posthog.capture('post_link_clicked', {
      post_title: postTitle,
      post_id: postId,
      post_slug: href.replace('/', ''),
    })
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  )
}
