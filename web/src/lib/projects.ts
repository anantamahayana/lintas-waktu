/**
 * Portfolio projects — placeholder data until the admin/CMS (phase 2)
 * serves the same shape from the API. Keep this shape stable: the pages
 * only depend on it.
 */
export type Category = "wedding" | "prewedding" | "event" | "personal";

export type Project = {
  slug: string;
  title: string;
  category: Category;
  location: string;
  date: string; // "June 2026"
  /** Photo seeds → replaced by image URLs later */
  cover: string;
  gallery: string[];
  facts: { label: string; value: string }[];
  /** Short pull quote + body, EN for now */
  pull: string;
  body: string;
  film?: { title: string; duration: string };
  featured?: boolean;
};

const galleryOf = (slug: string, n: number) => Array.from({ length: n }, (_, i) => `${slug}-${i + 1}`);

export const projects: Project[] = [
  {
    slug: "ayu-marco",
    title: "Ayu & Marco",
    category: "wedding",
    location: "Uluwatu",
    date: "June 2026",
    cover: "work-Ayu & Marco",
    gallery: galleryOf("ayu-marco", 8),
    facts: [
      { label: "Location", value: "Uluwatu, Bali" },
      { label: "Coverage", value: "Photo + film, 10 hours" },
      { label: "Guests", value: "64" },
      { label: "Delivered", value: "540 photographs · 5 min film" },
    ],
    pull: "It rained until four. Then the wind dropped, the cliff dried, and the light did what Uluwatu light does in June.",
    body: "Ayu and Marco met in Melbourne and chose Bali because it was halfway between their families. The ceremony was small — sixty-four people, one long table, no speeches longer than a minute. We photographed from the morning preparations at the villa to the last song, and filmed the vows in full at their request.",
    film: { title: "Highlight film", duration: "5:12" },
    featured: true,
  },
  {
    slug: "nadia-tom",
    title: "Nadia & Tom",
    category: "prewedding",
    location: "Ubud",
    date: "May 2026",
    cover: "work-Nadia & Tom",
    gallery: galleryOf("nadia-tom", 6),
    facts: [
      { label: "Location", value: "Tegallalang, Ubud" },
      { label: "Session", value: "3 hours · 2 locations" },
      { label: "Delivered", value: "96 photographs" },
    ],
    pull: "A slow morning in the rice terraces before the heat, and an afternoon that ended in the river.",
    body: "Nadia and Tom asked for nothing posed. We walked the terraces at first light, stopped for coffee in a warung, and finished at the river below Tegenungan as the light went soft.",
    featured: true,
  },
  {
    slug: "hannah-jules",
    title: "Hannah & Jules",
    category: "wedding",
    location: "Nusa Penida",
    date: "April 2026",
    cover: "hannah-jules-cover",
    gallery: galleryOf("hannah-jules", 7),
    facts: [
      { label: "Location", value: "Nusa Penida" },
      { label: "Coverage", value: "Elopement · photo, 6 hours" },
      { label: "Guests", value: "2" },
    ],
    pull: "Two people, one officiant, and a cliff that made everyone quiet.",
    body: "An elopement on the eastern cliffs of Nusa Penida. We crossed by boat at dawn and had the whole afternoon to ourselves.",
  },
  {
    slug: "clara",
    title: "Clara",
    category: "personal",
    location: "Canggu",
    date: "March 2026",
    cover: "work-Clara",
    gallery: galleryOf("clara", 5),
    facts: [
      { label: "Session", value: "Personal branding · 1 hour" },
      { label: "Delivered", value: "40 photographs, web + print" },
    ],
    pull: "Portraits that look like her, not like a headshot.",
    body: "Clara runs a ceramics studio in Canggu and needed images for a new site. We shot in her workshop with the doors open and the kiln still warm.",
  },
  {
    slug: "sari-wayan",
    title: "Sari & Wayan",
    category: "wedding",
    location: "Sanur",
    date: "February 2026",
    cover: "work-Sari & Wayan",
    gallery: galleryOf("sari-wayan", 8),
    facts: [
      { label: "Location", value: "Sanur, Bali" },
      { label: "Coverage", value: "Ceremony + reception · photo & film" },
      { label: "Guests", value: "320" },
    ],
    pull: "A Balinese ceremony at home, then a reception on the beach the same evening.",
    body: "Traditional rites in the family compound in the morning, blessings from both families, and a beach reception at sunset with three hundred guests.",
    film: { title: "Highlight film", duration: "6:40" },
    featured: true,
  },
  {
    slug: "bali-spirit-festival",
    title: "Bali Spirit Festival",
    category: "event",
    location: "Ubud",
    date: "May 2026",
    cover: "work-Bali Spirit Festival",
    gallery: galleryOf("bali-spirit", 6),
    facts: [
      { label: "Coverage", value: "3 days · photo" },
      { label: "Delivered", value: "Same-day edits + full set" },
    ],
    pull: "Three days, forty workshops, and a lot of bare feet.",
    body: "Documentary coverage of the festival for social and press, with same-day edits delivered each evening.",
  },
  {
    slug: "villa-sungai-launch",
    title: "Villa Sungai launch",
    category: "event",
    location: "Pererenan",
    date: "January 2026",
    cover: "villa-sungai-cover",
    gallery: galleryOf("villa-sungai", 5),
    facts: [
      { label: "Coverage", value: "Evening · photo + short film" },
      { label: "Delivered", value: "120 photographs · 60 s reel" },
    ],
    pull: "An opening night, kept honest.",
    body: "Launch evening for a boutique villa: the space before guests arrived, the arrivals, the dinner, and the river at night.",
  },
  {
    slug: "kirana-ravi",
    title: "Kirana & Ravi",
    category: "prewedding",
    location: "Sidemen",
    date: "December 2025",
    cover: "kirana-ravi-cover",
    gallery: galleryOf("kirana-ravi", 6),
    facts: [
      { label: "Location", value: "Sidemen valley" },
      { label: "Session", value: "Half day" },
    ],
    pull: "Fog on the valley until nine, then Agung showed up.",
    body: "A half-day session in the Sidemen valley — walking the rice paths, a stop at the family temple, and the mountain clearing right when we needed it.",
  },
  {
    slug: "graduation-denpasar",
    title: "Graduation, Denpasar",
    category: "personal",
    location: "Denpasar",
    date: "November 2025",
    cover: "graduation-cover",
    gallery: galleryOf("graduation", 4),
    facts: [
      { label: "Session", value: "1 hour · campus" },
      { label: "Delivered", value: "30 photographs" },
    ],
    pull: "Four years, one hour, one very proud mother.",
    body: "A graduation session on campus with family, ending with portraits at the old gate.",
  },
  {
    slug: "dewi-putu",
    title: "Dewi & Putu",
    category: "wedding",
    location: "Tabanan",
    date: "October 2025",
    cover: "dewi-putu-cover",
    gallery: galleryOf("dewi-putu", 7),
    facts: [
      { label: "Location", value: "Tabanan" },
      { label: "Coverage", value: "Full day · photo" },
    ],
    pull: "Rice fields on every side, and rain that waited until the last guest left.",
    body: "A full-day wedding in Tabanan with the ceremony in the family temple and a reception among the fields.",
  },
  {
    slug: "family-canggu",
    title: "Family, Canggu",
    category: "personal",
    location: "Canggu",
    date: "September 2025",
    cover: "family-cover",
    gallery: galleryOf("family", 4),
    facts: [
      { label: "Session", value: "Family · 1 hour · beach" },
      { label: "Delivered", value: "35 photographs" },
    ],
    pull: "Three generations, one beach, no one looking at the camera.",
    body: "A relaxed family session at Berawa beach at sunset.",
  },
  {
    slug: "ubud-writers",
    title: "Ubud Writers",
    category: "event",
    location: "Ubud",
    date: "October 2025",
    cover: "ubud-writers-cover",
    gallery: galleryOf("ubud-writers", 5),
    facts: [
      { label: "Coverage", value: "2 days · photo" },
    ],
    pull: "Panels, readings, and the quiet between them.",
    body: "Documentary coverage of two festival days for the organisers' archive and press.",
  },
];

export const categories: Category[] = ["wedding", "prewedding", "event", "personal"];

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

/** "June 2026" → "2026-06" (for the timeline) */
export function whenOf(p: Project) {
  const [mon, year] = p.date.split(" ");
  const m = MONTHS.indexOf(mon.toLowerCase()) + 1;
  return `${year}-${String(m || 1).padStart(2, "0")}`;
}

/** Frame number in the contact sheet, e.g. "LW-0012" */
export function frameOf(p: Project) {
  return `LW-${String(projects.indexOf(p) + 1).padStart(4, "0")}`;
}

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}

export function nextProject(slug: string) {
  const i = projects.findIndex((p) => p.slug === slug);
  return projects[(i + 1) % projects.length];
}
