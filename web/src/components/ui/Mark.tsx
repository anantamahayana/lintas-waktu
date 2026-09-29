import clsx from "clsx";

/** A small time marker between parts of a page: two hairlines and a dot. Pure markup. */
export function Mark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={clsx("flex items-center gap-2.5 text-faint", className)}>
      <span className="h-px w-8 bg-current" />
      <span className="h-[3px] w-[3px] rounded-full bg-current" />
      <span className="h-px w-8 bg-current" />
    </span>
  );
}
