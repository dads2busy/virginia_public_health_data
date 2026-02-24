import type { NextConfig } from 'next'

const basePath = process.env.NODE_ENV === 'production' ? '/virginia_public_health_data' : ''

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
