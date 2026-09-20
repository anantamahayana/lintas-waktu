/**
 * Portfolio project shape as the pages consume it. The data comes from the
 * API (lib/content.ts) — there is no local copy of the portfolio.
 */
export type Category = "wedding" | "prewedding" | "event" | "personal";
/** photo = photographs only · film = a film (+ optional stills) · both */
export type Kind = "photo" | "film" | "both";

export type Project = {
  slug: string;
  title: string;
  category: Category;
  kind: Kind;
  location: string;
  date: string; // "June 2026"
  /** Stable key for the cover slot (used as the Photo seed / transition name) */
  cover: string;
  gallery: string[];
  facts: { label: string; value: string }[];
  /** Copy already resolved to the page locale */
  pull: string;
  body: string;
  film?: { title: string; duration: string; embedUrl?: string; poster?: string };
  featured?: boolean;
};

export const categories: Category[] = ["wedding", "prewedding", "event", "personal"];
