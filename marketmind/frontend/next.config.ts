const nextConfig = {
  // "standalone" bundles a self-contained Node server for Docker.
  // Skip it on Vercel — they have their own native Next.js runtime.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;