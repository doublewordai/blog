'use client'

import Link from 'next/link'
import posthog from 'posthog-js'
import type {ReactNode} from 'react'

interface PaginationLinkProps {
  href: string
  targetPage: number
  currentPage: number
  totalPages: number
  children: ReactNode
  className?: string
}

export function PaginationLink({
  href,
  targetPage,
  currentPage,
  totalPages,
  children,
  className,
}: PaginationLinkProps) {
  const handleClick = () => {
    posthog.capture('pagination_clicked', {
      target_page: targetPage,
      from_page: currentPage,
      total_pages: totalPages,
      direction: targetPage > currentPage ? 'next' : targetPage < currentPage ? 'previous' : 'same',
    })
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  )
}
