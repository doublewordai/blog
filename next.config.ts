import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Allow images from Sanity CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
  },
}

export default nextConfig
