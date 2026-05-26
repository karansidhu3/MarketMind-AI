const nextConfig = {
  // "standalone" bundles a self-contained Node server for Docker.
  // Skip it on Vercel — they have their own native Next.js runtime.
  output: process.env.VERCEL ? undefined : "standalone",

  // On Vercel, redirect the root to /demo so shared links land on the
  // working public demo rather than a broken login page.
  async redirects() {
    if (!process.env.VERCEL) return []
    return [
      {
        source: '/',
        destination: '/demo',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;