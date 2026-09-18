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

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Temporary dummy photos (lib/dummy-photos.ts) until real ones are uploaded via the admin
      { protocol: "https", hostname: "images.unsplash.com" },
      // Portfolio photographs served by the API image proxy
      ...apiHosts(),
    ],
  },
};

export default withNextIntl(nextConfig);
