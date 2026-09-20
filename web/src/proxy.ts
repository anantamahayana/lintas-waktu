import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Run on every path except: API, Next internals, files with an extension,
  // and the client gallery / admin (served without a locale prefix).
  matcher: ["/((?!api|_next|_vercel|g/|i/|verify|admin|opengraph-image|.*\\..*).*)"],
};
