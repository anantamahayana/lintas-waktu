"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Small QR rendered as inline SVG (crisp in print). */
export function QR({ value, size = 88, className }: { value: string; size?: number; className?: string }) {
  const [svg, setSvg] = useState<string>("");
  useEffect(() => {
    QRCode.toString(value, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1f1e1c", light: "#0000" } }).then(setSvg).catch(() => setSvg(""));
  }, [value]);
  const style = { width: size, height: size, display: "inline-block" } as const;
  if (!svg) return <span aria-hidden className={className} style={style} />;
  return <span aria-label="Verification QR code" role="img" className={className} style={style} dangerouslySetInnerHTML={{ __html: svg }} />;
}
