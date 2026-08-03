type CtaHrefOptions = {
  destination?: string
  postSlug?: string
  ctaLocation: string
}

const CTA_DESTINATION = 'https://app.doubleword.ai'

export function buildCtaHref({destination, postSlug, ctaLocation}: CtaHrefOptions): string {
  if (destination) return destination
  const params = new URLSearchParams({
    utm_source: 'blog',
    utm_medium: 'referral',
    utm_campaign: postSlug ?? 'site',
    utm_content: ctaLocation,
  })
  return `${CTA_DESTINATION}?${params.toString()}`
}
