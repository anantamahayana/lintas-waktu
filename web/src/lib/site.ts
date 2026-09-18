/**
 * Site-wide contact details. Placeholders until real ones are supplied;
 * later served from the admin "Site settings".
 */
export const site = {
  name: "Lintas Waktu",
  whatsapp: {
    /** E.164 without "+", e.g. "6281234567890" */
    number: "628000000000",
    display: "+62 8xx xxxx xxxx",
  },
  email: "hello@lintaswaktu.com",
  instagram: "lintaswaktu",
} as const;

/** wa.me link with an optional pre-filled message */
export function waLink(text?: string, number: string = site.whatsapp.number) {
  const base = `https://wa.me/${number}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
