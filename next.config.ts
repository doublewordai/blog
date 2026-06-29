import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Allow the dev server / HMR to be reached over the LAN hostname, not just
  // localhost (used to preview drafts remotely). Dev-only; no prod effect.
  allowedDevOrigins: ['gotenks', 'gotenks:4446'],

  // Allow images from Sanity CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
  },

  // PostHog reverse proxy configuration
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
}

export default nextConfig
