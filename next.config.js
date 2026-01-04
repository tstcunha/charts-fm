/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lastfm.freetls.fastly.net', 'i.scdn.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig

