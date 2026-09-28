import type { Metadata } from "next";
import { ClientGallery } from "@/components/gallery/ClientGallery";

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** The link preview (WhatsApp, iMessage) speaks the client's language, as the gallery does. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  let lang = "en";
  try {
    const res = await fetch(`${API}/api/gallery/${encodeURIComponent(slug)}/meta`, { next: { revalidate: 60 } });
    if (res.ok) lang = ((await res.json()) as { lang?: string }).lang === "id" ? "id" : "en";
  } catch {}
  const title = lang === "id" ? "Galeri Anda — Lintas Waktu" : "Your gallery — Lintas Waktu";
  return { title, openGraph: { title, locale: lang === "id" ? "id_ID" : "en_US" } };
}

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ClientGallery slug={slug} />;
}
