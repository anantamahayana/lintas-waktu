import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** remotePatterns entries for the API host (API_URL / NEXT_PUBLIC_API_URL) */
function apiHosts() {
  const urls = [process.env.API_URL, process.env.NEXT_PUBLIC_API_URL, "http://localhost:8000"].filter(Boolean) as string[];
  return urls.map((u) => {
    const { protocol, hostname, port } = new URL(u);
    return { protocol: protocol.replace(":", "") as "http" | "https", hostname, port: port || undefined };
  });
}

const isLoopback = apiHosts().some((h) => ["localhost", "127.0.0.1"].includes(h.hostname));

const API_INTERNAL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // Dev through a tunnel (ngrok) — let those hosts load HMR/_next assets
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.app"],
  // Browser → API through Next (same origin). Lets one public URL (ngrok, a single
  // domain in production) serve site + API, and avoids CORS. Only when
  // NEXT_PUBLIC_API_URL is empty; with a URL set the browser talks to the API directly.
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_URL) return [];
    return {
      // after Next's own /api routes (inquiry, revalidate), before the 404
      afterFiles: ["gallery", "admin", "public"].map((p) => ({ source: `/api/${p}/:path*`, destination: `${API_INTERNAL}/api/${p}/:path*` })),
    };
  },
  images: {
    // Local dev: the API is on 127.0.0.1 and next/image refuses private IPs by default
    ...(process.env.NODE_ENV !== "production" && isLoopback ? { dangerouslyAllowLocalIP: true } : {}),
    formats: ["image/avif", "image/webp"],
    // 75 for chrome (nav, cards); 85 for the photographs themselves — they are the product
    qualities: [75, 85],
    // full-width rows on 2K/retina screens get a 2560 variant instead of an upscaled 1920
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2560],
    remotePatterns: [
      // Temporary dummy photos (lib/dummy-photos.ts) until real ones are uploaded via the admin
      { protocol: "https", hostname: "images.unsplash.com" },
      // Film posters (YouTube / Vimeo thumbnails) for film-only projects
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
      // Portfolio photographs served by the API image proxy
      ...apiHosts(),
    ],
  },
};

export default withNextIntl(nextConfig);
