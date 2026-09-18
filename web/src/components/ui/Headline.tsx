import clsx from "clsx";

/**
 * The brand headline pattern: line 1 regular, line 2 italic inside a
 * highlight box. `size` maps to the type ramp in globals.css.
 */
export function Headline({
  line1,
  line2,
  size = "h2",
  align = "left",
  className,
  as: Tag = "h2",
}: {
  line1: string;
  line2: string;
  size?: "hero" | "h2" | "h3";
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={clsx(
        size === "hero" ? "t-hero" : size === "h3" ? "t-h3" : "t-h2",
        align === "center" && "text-center",
        "text-balance",
        className,
      )}
    >
      {line1}
      <br />
      <span className="hl">{line2}</span>
    </Tag>
  );
}
