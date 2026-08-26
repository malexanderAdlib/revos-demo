// Demo build (Vercel preview) serves at the domain root; the real build is
// mounted under /revos by the agent's FastAPI alongside /scorecard, /lens, etc.
const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Static export so the agent's FastAPI can serve the built files directly.
  output: "export",
  basePath: DEMO ? "" : "/revos",
  trailingSlash: true,

  // Static exports can't run Image Optimization at request time.
  images: { unoptimized: true },
};

export default nextConfig;
