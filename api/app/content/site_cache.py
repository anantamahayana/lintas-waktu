"""Tell the Next.js site that public content changed.

The site caches API responses (projects, settings) for a minute. After an
admin edit we POST to its /api/revalidate route so the change shows at once.
Best effort: a failure only means the site catches up on its own within
the minute, so errors are logged, never raised.
"""
import logging

import httpx

from ..config import get_settings

log = logging.getLogger(__name__)


def invalidate(reason: str = "") -> None:
    s = get_settings()
    if not s.revalidate_secret:
        return  # not configured (e.g. local dev without the secret) — the site's TTL applies
    try:
        r = httpx.post(
            f"{s.frontend_url.rstrip('/')}/api/revalidate",
            headers={"authorization": f"Bearer {s.revalidate_secret}"},
            json={"reason": reason},
            timeout=5,
        )
        if r.status_code != 200:
            log.warning("site revalidate failed: %s %s", r.status_code, r.text[:200])
    except httpx.HTTPError as e:
        log.warning("site revalidate unreachable: %s", e)
