"""Film links for portfolio projects: recognise YouTube / Vimeo URLs, build the embed
URL the site plays, and find a poster image when the project has no photos of its own."""
import re

import httpx

YOUTUBE = re.compile(r"(?:youtu\.be/|youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|live/))([A-Za-z0-9_-]{11})")
VIMEO = re.compile(r"vimeo\.com/(?:video/|manage/videos/)?(\d+)(?:/([A-Za-z0-9]+))?")


def parse(url: str | None) -> dict | None:
    """{provider, id, embed_url, poster_url|None} or None when the link is not a video we can embed."""
    if not url:
        return None
    m = YOUTUBE.search(url)
    if m:
        vid = m.group(1)
        return {
            "provider": "youtube",
            "id": vid,
            # youtube-nocookie: no tracking cookies until the visitor presses play
            "embed_url": f"https://www.youtube-nocookie.com/embed/{vid}?autoplay=1&rel=0&modestbranding=1&playsinline=1",
            "poster_url": f"https://i.ytimg.com/vi/{vid}/maxresdefault.jpg",
        }
    m = VIMEO.search(url)
    if m:
        vid, h = m.group(1), m.group(2)
        q = f"?h={h}&" if h else "?"
        return {"provider": "vimeo", "id": vid, "embed_url": f"https://player.vimeo.com/video/{vid}{q}autoplay=1&dnt=1&title=0&byline=0&portrait=0", "poster_url": None}
    return None


def poster(url: str | None) -> str | None:
    """Best available poster for the link. Vimeo needs one oEmbed round-trip (done once, at save time)."""
    info = parse(url)
    if not info:
        return None
    if info["poster_url"]:
        return info["poster_url"]
    try:
        r = httpx.get("https://vimeo.com/api/oembed.json", params={"url": url, "width": 1600}, timeout=6)
        if r.status_code == 200:
            return r.json().get("thumbnail_url")
    except httpx.HTTPError:
        pass
    return None
