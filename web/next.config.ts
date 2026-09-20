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

const nextConfig: NextConfig = {
  images: {
    // Local dev: the API is on 127.0.0.1 and next/image refuses private IPs by default
    ...(process.env.NODE_ENV !== "production" && isLoopback ? { dangerouslyAllowLocalIP: true } : {}),
    formats: ["image/avif", "image/webp"],
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
