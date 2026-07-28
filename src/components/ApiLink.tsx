import {CtaLink} from '@/components/CtaLink'

/**
 * Link to the Doubleword Inference API console, shown beside the theme toggle.
 * The label collapses with available width: "Inference API" → "API" → icon-only.
 * Post context is passed when it renders on an article page so the click and
 * the arrival both carry the post that prompted it.
 */
export function ApiLink({postSlug, postTitle}: {postSlug?: string; postTitle?: string}) {
  return (
    <CtaLink
      ctaLocation="header"
      postSlug={postSlug}
      postTitle={postTitle}
      className="api-link"
      ariaLabel="Doubleword Inference API"
      title="Doubleword Inference API"
    >
      <span className="hidden lg:inline">Inference API</span>
      <span className="hidden sm:inline lg:hidden">API</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 17 17 7" />
        <path d="M7 7h10v10" />
      </svg>
    </CtaLink>
  )
}
