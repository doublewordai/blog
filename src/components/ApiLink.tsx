/**
 * Top-right link to the Doubleword Inference API console.
 * Full label on sm+ screens, compact "API" on narrow viewports.
 */
export function ApiLink() {
  return (
    <a
      href="https://app.doubleword.ai"
      target="_blank"
      rel="noopener noreferrer"
      className="api-link"
    >
      <span className="hidden sm:inline">Doubleword Inference API</span>
      <span className="sm:hidden">Inference API</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 17 17 7" />
        <path d="M7 7h10v10" />
      </svg>
    </a>
  )
}
