import Link from "next/link";
import "./globals.css";

/** Root-level 404 (paths outside any locale). Minimal, no i18n context. */
export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col items-center justify-center text-center gap-6 px-6">
        <span className="t-mono text-mute">404 · Page not found</span>
        <h1 className="t-display-sm max-w-[20ch]">This moment has passed. <em>The page didn’t.</em></h1>
        <Link href="/" className="ink-btn">Back to home</Link>
      </body>
    </html>
  );
}
