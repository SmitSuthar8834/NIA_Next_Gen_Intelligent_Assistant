/** @type {import('next').NextConfig} */
const nextConfig = {
  // Comment out standalone output for now to avoid Windows symlink issues
  // output: 'standalone',
  serverExternalPackages: [],
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        }/:path*`,
      },
    ];
  },
};

export default nextConfig;
