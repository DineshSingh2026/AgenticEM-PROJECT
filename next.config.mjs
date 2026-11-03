import createMDX from "@next/mdx";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets phones/laptops on the local network load dev assets (next dev only).
  allowedDevOrigins: ["192.168.*.*"],
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  transpilePackages: ["three"],
  images: { formats: ["image/avif", "image/webp"] },
  // Developers, Trust, Insights and Operators pages were removed; keep old bookmarks and shared links working.
  async redirects() {
    return [
      { source: "/developers", destination: "/contact", permanent: true },
      { source: "/trust", destination: "/", permanent: true },
      { source: "/operators", destination: "/", permanent: true },
      { source: "/insights", destination: "/", permanent: true },
      { source: "/insights/:slug*", destination: "/", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.glsl": { loaders: ["raw-loader"], as: "*.js" },
      "*.vert": { loaders: ["raw-loader"], as: "*.js" },
      "*.frag": { loaders: ["raw-loader"], as: "*.js" },
    },
  },
  webpack(config) {
    config.module.rules.push({ test: /\.(glsl|vert|frag)$/, type: "asset/source" });
    return config;
  },
};

const withMDX = createMDX({});
export default withMDX(nextConfig);
