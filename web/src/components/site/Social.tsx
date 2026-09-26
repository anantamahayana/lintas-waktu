import type { SiteInfo } from "@/lib/content";
import { waLink } from "@/lib/site";

export type SocialKey = "whatsapp" | "email" | "instagram" | "youtube";

/** Thin line icons in the site's ink colour (currentColor), sized to sit beside small text. */
export function SocialIcon({ k, className = "h-[18px] w-[18px]" }: { k: SocialKey; className?: string }) {
  const common = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (k === "whatsapp")
    return (
      <svg {...common}>
        <path d="M3.5 20.5l1.3-4.1A8.6 8.6 0 1 1 8 19.3z" />
        <path d="M9 8.6c.2-.5.6-.6.9-.6h.4c.2 0 .4.1.5.4l.6 1.4c.1.2 0 .5-.1.6l-.5.6c.4.9 1.2 1.8 2.3 2.3l.6-.5c.2-.2.4-.2.6-.1l1.4.6c.3.1.4.3.4.5v.4c0 .3-.2.7-.6.9-.9.5-2.4.3-4-.9s-2.5-2.9-2.6-3.9c-.1-.5 0-1.1.1-1.7z" />
      </svg>
    );
  if (k === "email")
    return (
      <svg {...common}>
        <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
        <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
      </svg>
    );
  if (k === "instagram")
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
      <path d="M10.2 9.3v5.4l4.6-2.7z" fill="currentColor" />
    </svg>
  );
}

/** A YouTube setting may be a full link, "@handle" or a bare handle. */
export function youtubeUrl(v: string) {
  const s = v.trim();
  if (!s) return "";
  if (/^https?:\/\//.test(s)) return s;
  return `https://www.youtube.com/${s.startsWith("@") ? s : `@${s}`}`;
}
const youtubeLabel = (v: string) => {
  const m = v.match(/youtube\.com\/(@[\w.-]+)/i);
  return m ? m[1] : v.startsWith("http") ? "YouTube" : v.startsWith("@") ? v : `@${v}`;
};

/** The studio's channels, in display order; YouTube only once it is set in Site settings. */
export function socialLinks(site: SiteInfo): { k: SocialKey; label: string; href: string; external: boolean }[] {
  const out: { k: SocialKey; label: string; href: string; external: boolean }[] = [
    { k: "whatsapp", label: site.whatsapp.display, href: waLink(undefined, site.whatsapp.number), external: true },
    { k: "email", label: site.email, href: `mailto:${site.email}`, external: false },
    { k: "instagram", label: `@${site.instagram}`, href: `https://instagram.com/${site.instagram}`, external: true },
  ];
  if (site.youtube) out.push({ k: "youtube", label: youtubeLabel(site.youtube), href: youtubeUrl(site.youtube), external: true });
  return out;
}
