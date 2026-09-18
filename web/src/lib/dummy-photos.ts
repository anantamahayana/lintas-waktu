/**
 * Temporary, context-appropriate placeholder photographs (Unsplash, free
 * licence) keyed by the slot `seed` used in <Photo/>. Every slot maps to a
 * fixed image so layouts are stable between reloads.
 *
 * Remove this file once real photographs are uploaded through the admin.
 */
const U = (id: string) => `https://images.unsplash.com/photo-${id}`;

const photos = {
  // Hero strip — arch of five
  "hero-0": U("1611328899715-96406c154508"), // couple on the beach
  "hero-1": U("1544091441-9cca7fbe8923"), // couple looking at a hill
  "hero-2": U("1693576588167-2e7148490dc5"), // bride & groom on a cliff (centre)
  "hero-3": U("1621311616895-ea7369886a29"), // silhouettes at sunset
  "hero-4": U("1656558136312-71b8f36bea25"), // couple on a deck over water

  // Selected work
  "work-Ayu & Marco": U("1693576587780-31fa6109191a"), // bride on rocks by the ocean
  "work-Nadia & Tom": U("1558516771-69938e11c13a"), // couple on a hilltop
  "work-Clara": U("1625759190925-a67568fd123b"), // portrait
  "work-Sari & Wayan": U("1542897644-e04428948020"), // Balinese ceremony
  "work-Bali Spirit Festival": U("1678895575027-42c28b790963"), // gathering at a doorway

  // Behind the camera
  "behind-main": U("1613871352838-08d682c95aae"), // person seated under trees
  "behind-a": U("1575573334553-4d5633270377"), // white chairs under palms
  "behind-b": U("1584365280669-74efeef30305"), // rice field

  // Process steps (small circles)
  "step-0": U("1561834637-5ab8857d190d"),
  "step-1": U("1693576588167-2e7148490dc5"),
  "step-2": U("1656558136312-71b8f36bea25"),
  "step-3": U("1700751474902-067ef1de7cab"),

  // Closing CTA
  cta: U("1621311616895-ea7369886a29"),
} as const;

const fallback = U("1693576588167-2e7148490dc5");

/** Returns a sized Unsplash URL for the slot; unknown seeds get the fallback. */
export function dummyPhoto(seed: string, width = 1600): string {
  const base = (photos as Record<string, string>)[seed] ?? fallback;
  return `${base}?w=${width}&q=80&auto=format&fit=crop`;
}
