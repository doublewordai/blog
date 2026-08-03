'use client'

import posthog from 'posthog-js'
import type {ReactNode} from 'react'
import {buildCtaHref} from '@/lib/cta-url'

interface CtaLinkProps {
  /** Where on the page this link sits, e.g. 'post_footer' or 'header'. */
  ctaLocation: string
  /** Explicit outbound URL for CTAs with a post-specific destination. */
  destination?: string
  /** Post context, when the link is rendered on an article page. */
  postSlug?: string
  postTitle?: string
  children: ReactNode
  className?: string
  ariaLabel?: string
  title?: string
}

/**
 * Outbound link to the app, instrumented on both ends: the UTMs let
 * app.doubleword.ai attribute an arrival to the post and placement that sent
 * it, and the PostHog event records the click itself (autocapture already
 * catches these, but only for as long as the class names survive).
 */
export function CtaLink({
  ctaLocation,
  destination,
  postSlug,
  postTitle,
  children,
  className,
  ariaLabel,
  title,
}: CtaLinkProps) {
  const href = buildCtaHref({destination, postSlug, ctaLocation})

  const handleClick = () => {
    posthog.capture('cta_clicked', {
      cta_location: ctaLocation,
      post_slug: postSlug,
      post_title: postTitle,
      destination: href,
    })
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={ariaLabel}
      title={title}
      onClick={handleClick}
    >
      {children}
    </a>
  )
}
