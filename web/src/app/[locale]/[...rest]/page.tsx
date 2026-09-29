import { notFound } from "next/navigation";

/** Any unknown path under a locale (e.g. /id/foo) gets the locale's own 404 — with nav, footer and language — instead of the bare root one. */
export default function CatchAll() {
  notFound();
}
