import type { CSSProperties } from "react";

/**
 * How a photograph sits in its box on the site, chosen in the admin:
 * x/y = the point that must stay visible (percent), zoom ≥ 1, and fit "whole" to show the
 * entire photo in a box of its own shape (ratio = width / height) where the layout allows.
 */
export type Frame = { x: number; y: number; zoom: number; fit?: "cover" | "whole"; ratio?: number | null };

export const FRAME0: Frame = { x: 50, y: 50, zoom: 1, fit: "cover" };

/** Style for the element that carries the box's aspect ratio: the photo's own shape when "whole". */
export function boxStyle(f?: Frame | null): CSSProperties | undefined {
  return f?.fit === "whole" && f.ratio ? { aspectRatio: String(f.ratio), height: "auto", minHeight: 0 } : undefined;
}
