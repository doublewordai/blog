/**
 * Link to the Doubleword Inference API console, shown beside the theme toggle.
 * The label collapses with available width: "Inference API" → "API" → icon-only.
 */
export function ApiLink() {
  return (
    <a
      href="https://app.doubleword.ai"
      target="_blank"
      rel="noopener noreferrer"
      className="api-link"
      aria-label="Doubleword Inference API"
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
    </a>
  )
}
