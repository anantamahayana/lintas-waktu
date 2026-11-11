import { jpegSize } from "./photos";

/**
 * A small PDF of JPEG pages (the images are embedded as they are, no re-encoding).
 * Each page is `widthPt` wide and as tall as its image's shape asks.
 */
export function pdfFromJpegs(jpegs: Uint8Array[], widthPt = 842): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const put = (x: string | Uint8Array) => { const b = typeof x === "string" ? enc.encode(x) : x; chunks.push(b); pos += b.length; };
  const obj = (n: number, body: () => void) => { offsets[n] = pos; put(`${n} 0 obj\n`); body(); put("\nendobj\n"); };

  const n = jpegs.length;
  // Objects: 1 catalog, 2 page tree, then per page: page, content, image.
  const pageId = (i: number) => 3 + i * 3;
  put("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");
  obj(1, () => put("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => put(`<< /Type /Pages /Count ${n} /Kids [${jpegs.map((_, i) => `${pageId(i)} 0 R`).join(" ")}] >>`));
  jpegs.forEach((jpg, i) => {
    const size = jpegSize(jpg) ?? { w: 1, h: 1 };
    const W = widthPt, H = Math.round((widthPt * size.h) / size.w * 100) / 100;
    const content = `q ${W} 0 0 ${H} 0 0 cm /Im Do Q`;
    obj(pageId(i), () => put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im ${pageId(i) + 2} 0 R >> >> /Contents ${pageId(i) + 1} 0 R >>`));
    obj(pageId(i) + 1, () => { put(`<< /Length ${content.length} >>\nstream\n`); put(content); put("\nendstream"); });
    obj(pageId(i) + 2, () => {
      put(`<< /Type /XObject /Subtype /Image /Width ${size.w} /Height ${size.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
      put(jpg); put("\nendstream");
    });
  });
  const xref = pos, total = 3 + n * 3;
  put(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let k = 1; k < total; k++) put(`${String(offsets[k]).padStart(10, "0")} 00000 n \n`);
  put(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}
