"""Seed the twelve sample portfolio projects (placeholder photographs from Unsplash).

    python -m app.content.seed          # adds any sample project whose slug is missing
    python -m app.content.seed --reset  # also overwrites copy/images of existing samples

The samples are ordinary rows in the `projects` table: edit, unpublish or delete them
in /admin/projects, and set a Google Drive folder to replace the placeholder images.
"""
import json
import sys

from ..database import SessionLocal, migrate
from .models import Project, ProjectCategory

U = "https://images.unsplash.com/photo-"

# Named slots (same ids as the site's original dummy set) and the shared pool
NAMED = {
    "work-Ayu & Marco": "1693576587780-31fa6109191a",
    "work-Nadia & Tom": "1558516771-69938e11c13a",
    "work-Clara": "1625759190925-a67568fd123b",
    "work-Sari & Wayan": "1542897644-e04428948020",
    "work-Bali Spirit Festival": "1678895575027-42c28b790963",
}
POOL = [
    "1693576588167-2e7148490dc5", "1693576587780-31fa6109191a", "1611328899715-96406c154508",
    "1621311616895-ea7369886a29", "1558516771-69938e11c13a", "1656558136312-71b8f36bea25",
    "1544091441-9cca7fbe8923", "1561834637-5ab8857d190d", "1542897644-e04428948020",
    "1678895575027-42c28b790963", "1584365280669-74efeef30305", "1575573334553-4d5633270377",
    "1700751474902-067ef1de7cab", "1625759190925-a67568fd123b", "1613871352838-08d682c95aae",
]


def _hash(s: str) -> int:
    h = 0
    for ch in s:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return h


def _pick(seed: str) -> str:
    return U + (NAMED.get(seed) or POOL[_hash(seed) % len(POOL)])


def _images(cover_seed: str, gallery_seed: str, n: int) -> list[str]:
    """Cover first, then the gallery — de-duplicated so a project never repeats a photo."""
    urls = [_pick(cover_seed)] + [_pick(f"{gallery_seed}-{i + 1}") for i in range(n)]
    seen: set[str] = set()
    return [u for u in urls if not (u in seen or seen.add(u))]


MONTHS = {m: i + 1 for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"])}


def _month(date_label: str) -> str:
    mon, year = date_label.split(" ")
    return f"{year}-{MONTHS[mon]:02d}"


SAMPLES: list[dict] = [
    dict(
        slug="ayu-marco", title="Ayu & Marco", category="wedding", location="Uluwatu", date_label="June 2026",
        images=_images("work-Ayu & Marco", "ayu-marco", 8),
        facts=[{"label": "Location", "value": "Uluwatu, Bali"}, {"label": "Coverage", "value": "Photo + film, 10 hours"}, {"label": "Guests", "value": "64"}, {"label": "Delivered", "value": "540 photographs · 5 min film"}],
        pull_en="It rained until four. Then the wind dropped, the cliff dried, and the light did what Uluwatu light does in June.",
        pull_id="Hujan sampai jam empat. Lalu angin reda, tebing mengering, dan cahaya melakukan apa yang selalu dilakukan cahaya Uluwatu di bulan Juni.",
        body_en="Ayu and Marco met in Melbourne and chose Bali because it was halfway between their families. The ceremony was small — sixty-four people, one long table, no speeches longer than a minute. We photographed from the morning preparations at the villa to the last song, and filmed the vows in full at their request.",
        body_id="Ayu dan Marco bertemu di Melbourne dan memilih Bali karena letaknya di tengah-tengah kedua keluarga. Upacaranya kecil — enam puluh empat orang, satu meja panjang, tak ada pidato lebih dari semenit. Kami memotret dari persiapan pagi di vila sampai lagu terakhir, dan merekam ikrar secara utuh atas permintaan mereka.",
        film_title="Highlight film", film_duration="5:12", featured=True,
    ),
    dict(
        slug="nadia-tom", title="Nadia & Tom", category="prewedding", location="Ubud", date_label="May 2026",
        images=_images("work-Nadia & Tom", "nadia-tom", 6),
        facts=[{"label": "Location", "value": "Tegallalang, Ubud"}, {"label": "Session", "value": "3 hours · 2 locations"}, {"label": "Delivered", "value": "96 photographs"}],
        pull_en="A slow morning in the rice terraces before the heat, and an afternoon that ended in the river.",
        pull_id="Pagi yang pelan di terasering sebelum panas datang, dan sore yang berakhir di sungai.",
        body_en="Nadia and Tom asked for nothing posed. We walked the terraces at first light, stopped for coffee in a warung, and finished at the river below Tegenungan as the light went soft.",
        body_id="Nadia dan Tom tak mau ada yang diatur. Kami menyusuri terasering saat cahaya pertama, berhenti ngopi di warung, dan mengakhiri sesi di sungai bawah Tegenungan saat cahaya melembut.",
        featured=True,
    ),
    dict(
        slug="hannah-jules", title="Hannah & Jules", category="wedding", location="Nusa Penida", date_label="April 2026",
        images=_images("hannah-jules-cover", "hannah-jules", 7),
        facts=[{"label": "Location", "value": "Nusa Penida"}, {"label": "Coverage", "value": "Elopement · photo, 6 hours"}, {"label": "Guests", "value": "2"}],
        pull_en="Two people, one officiant, and a cliff that made everyone quiet.",
        pull_id="Dua orang, satu penghulu, dan tebing yang membuat semua terdiam.",
        body_en="An elopement on the eastern cliffs of Nusa Penida. We crossed by boat at dawn and had the whole afternoon to ourselves.",
        body_id="Pernikahan intim di tebing timur Nusa Penida. Kami menyeberang dengan perahu saat fajar dan punya sepanjang sore hanya untuk kami.",
    ),
    dict(
        slug="clara", title="Clara", category="personal", location="Canggu", date_label="March 2026",
        images=_images("work-Clara", "clara", 5),
        facts=[{"label": "Session", "value": "Personal branding · 1 hour"}, {"label": "Delivered", "value": "40 photographs, web + print"}],
        pull_en="Portraits that look like her, not like a headshot.",
        pull_id="Potret yang terlihat seperti dirinya, bukan seperti pas foto.",
        body_en="Clara runs a ceramics studio in Canggu and needed images for a new site. We shot in her workshop with the doors open and the kiln still warm.",
        body_id="Clara mengelola studio keramik di Canggu dan butuh foto untuk situs barunya. Kami memotret di bengkelnya dengan pintu terbuka dan tungku yang masih hangat.",
    ),
    dict(
        slug="sari-wayan", title="Sari & Wayan", category="wedding", location="Sanur", date_label="February 2026",
        images=_images("work-Sari & Wayan", "sari-wayan", 8),
        facts=[{"label": "Location", "value": "Sanur, Bali"}, {"label": "Coverage", "value": "Ceremony + reception · photo & film"}, {"label": "Guests", "value": "320"}],
        pull_en="A Balinese ceremony at home, then a reception on the beach the same evening.",
        pull_id="Upacara adat Bali di rumah, lalu resepsi di pantai pada malam yang sama.",
        body_en="Traditional rites in the family compound in the morning, blessings from both families, and a beach reception at sunset with three hundred guests.",
        body_id="Upacara adat di rumah keluarga pada pagi hari, restu dari kedua keluarga, dan resepsi di pantai saat matahari terbenam bersama tiga ratus tamu.",
        film_title="Highlight film", film_duration="6:40", featured=True,
    ),
    dict(
        slug="bali-spirit-festival", title="Bali Spirit Festival", category="event", location="Ubud", date_label="May 2026",
        images=_images("work-Bali Spirit Festival", "bali-spirit", 6),
        facts=[{"label": "Coverage", "value": "3 days · photo"}, {"label": "Delivered", "value": "Same-day edits + full set"}],
        pull_en="Three days, forty workshops, and a lot of bare feet.",
        pull_id="Tiga hari, empat puluh lokakarya, dan banyak kaki telanjang.",
        body_en="Documentary coverage of the festival for social and press, with same-day edits delivered each evening.",
        body_id="Liputan dokumenter festival untuk media sosial dan pers, dengan hasil edit hari yang sama dikirim setiap malam.",
    ),
    dict(
        slug="villa-sungai-launch", title="Villa Sungai launch", category="event", location="Pererenan", date_label="January 2026",
        images=_images("villa-sungai-cover", "villa-sungai", 5),
        facts=[{"label": "Coverage", "value": "Evening · photo + short film"}, {"label": "Delivered", "value": "120 photographs · 60 s reel"}],
        pull_en="An opening night, kept honest.",
        pull_id="Malam pembukaan, direkam apa adanya.",
        body_en="Launch evening for a boutique villa: the space before guests arrived, the arrivals, the dinner, and the river at night.",
        body_id="Malam peluncuran sebuah vila butik: ruangnya sebelum tamu datang, kedatangan, makan malam, dan sungai di malam hari.",
    ),
    dict(
        slug="kirana-ravi", title="Kirana & Ravi", category="prewedding", location="Sidemen", date_label="December 2025",
        images=_images("kirana-ravi-cover", "kirana-ravi", 6),
        facts=[{"label": "Location", "value": "Sidemen valley"}, {"label": "Session", "value": "Half day"}],
        pull_en="Fog on the valley until nine, then Agung showed up.",
        pull_id="Kabut menutupi lembah sampai jam sembilan, lalu Gunung Agung muncul.",
        body_en="A half-day session in the Sidemen valley — walking the rice paths, a stop at the family temple, and the mountain clearing right when we needed it.",
        body_id="Sesi setengah hari di lembah Sidemen — menyusuri pematang sawah, singgah di pura keluarga, dan gunung yang terbuka tepat saat kami membutuhkannya.",
    ),
    dict(
        slug="graduation-denpasar", title="Graduation, Denpasar", category="personal", location="Denpasar", date_label="November 2025",
        images=_images("graduation-cover", "graduation", 4),
        facts=[{"label": "Session", "value": "1 hour · campus"}, {"label": "Delivered", "value": "30 photographs"}],
        pull_en="Four years, one hour, one very proud mother.",
        pull_id="Empat tahun, satu jam, dan seorang ibu yang sangat bangga.",
        body_en="A graduation session on campus with family, ending with portraits at the old gate.",
        body_id="Sesi wisuda di kampus bersama keluarga, diakhiri dengan potret di gerbang tua.",
    ),
    dict(
        slug="dewi-putu", title="Dewi & Putu", category="wedding", location="Tabanan", date_label="October 2025",
        images=_images("dewi-putu-cover", "dewi-putu", 7),
        facts=[{"label": "Location", "value": "Tabanan"}, {"label": "Coverage", "value": "Full day · photo"}],
        pull_en="Rice fields on every side, and rain that waited until the last guest left.",
        pull_id="Sawah di segala sisi, dan hujan yang menunggu sampai tamu terakhir pulang.",
        body_en="A full-day wedding in Tabanan with the ceremony in the family temple and a reception among the fields.",
        body_id="Pernikahan seharian penuh di Tabanan dengan upacara di pura keluarga dan resepsi di tengah sawah.",
    ),
    dict(
        slug="family-canggu", title="Family, Canggu", category="personal", location="Canggu", date_label="September 2025",
        images=_images("family-cover", "family", 4),
        facts=[{"label": "Session", "value": "Family · 1 hour · beach"}, {"label": "Delivered", "value": "35 photographs"}],
        pull_en="Three generations, one beach, no one looking at the camera.",
        pull_id="Tiga generasi, satu pantai, tak ada yang melihat ke kamera.",
        body_en="A relaxed family session at Berawa beach at sunset.",
        body_id="Sesi keluarga yang santai di pantai Berawa saat matahari terbenam.",
    ),
    dict(
        slug="ubud-writers", title="Ubud Writers", category="event", location="Ubud", date_label="October 2025",
        images=_images("ubud-writers-cover", "ubud-writers", 5),
        facts=[{"label": "Coverage", "value": "2 days · photo"}],
        pull_en="Panels, readings, and the quiet between them.",
        pull_id="Diskusi panel, pembacaan karya, dan keheningan di antaranya.",
        body_en="Documentary coverage of two festival days for the organisers' archive and press.",
        body_id="Liputan dokumenter dua hari festival untuk arsip penyelenggara dan pers.",
    ),
]


def seed(reset: bool = False) -> None:
    migrate()
    db = SessionLocal()
    try:
        added = updated = 0
        for i, s in enumerate(SAMPLES):
            p = db.query(Project).filter(Project.slug == s["slug"]).first()
            is_new = p is None
            if p is None:
                p = Project(slug=s["slug"], published=True)
                db.add(p)
            elif not reset:
                continue
            p.title = s["title"]
            p.category = ProjectCategory(s["category"])
            p.location = s["location"]
            p.date_label = s["date_label"]
            p.month = _month(s["date_label"])
            p.drive_folder_id = p.drive_folder_id or ""
            p.placeholder_urls = json.dumps(s["images"])
            if not p.drive_folder_id:
                p.cover_file_id = "ph-0"
            p.pull_en, p.pull_id = s["pull_en"], s["pull_id"]
            p.body_en, p.body_id = s["body_en"], s["body_id"]
            p.facts = json.dumps(s["facts"])
            p.film_title = s.get("film_title")
            p.film_duration = s.get("film_duration")
            p.featured = bool(s.get("featured"))
            p.sort_order = i
            added += is_new
            updated += not is_new
        db.commit()
        print(f"sample projects: {added} added, {updated} updated, {len(SAMPLES)} total")
    finally:
        db.close()


if __name__ == "__main__":
    seed(reset="--reset" in sys.argv)
