"""
XMP sidecar generation for Capture One / Lightroom.

Each selected photo gets a `<name>.xmp` file with Rating = 5 and Label = Green
(Label = Yellow for picks beyond the package limit, so paid extras stand out).
A client note, if any, lands in dc:description. Placed next to the RAW file and
synchronized, the editing software picks these up so the client's picks are
marked without any manual typing.
"""
import io
import zipfile
from datetime import datetime, timezone
from xml.sax.saxutils import escape

XMP_TEMPLATE = """<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Photo Selection Platform">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:xmp="http://ns.adobe.com/xap/1.0/"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/"
        xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
      xmp:Rating="5"
      xmp:Label="{label}"
      xmp:MetadataDate="{date}">{description}
      <dc:subject>
        <rdf:Bag>
          <rdf:li>client-selected</rdf:li>
          <rdf:li>{client}</rdf:li>{extra_tag}
        </rdf:Bag>
      </dc:subject>
      <xmpMM:DerivedFrom rdf:parseType="Resource">
        <stRef:filePath xmlns:stRef="http://ns.adobe.com/xap/1.0/sType/ResourceRef#">{filename}</stRef:filePath>
      </xmpMM:DerivedFrom>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>
"""

DESCRIPTION_XML = """
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">{note}</rdf:li>
        </rdf:Alt>
      </dc:description>"""


def base_name(filename: str) -> str:
    return filename.rsplit(".", 1)[0] if "." in filename else filename


def xmp_for(filename: str, client_name: str, note: str | None = None, is_extra: bool = False) -> str:
    return XMP_TEMPLATE.format(
        date=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        client=escape(client_name),
        filename=escape(filename),
        label="Yellow" if is_extra else "Green",
        description=DESCRIPTION_XML.format(note=escape(note)) if note else "",
        extra_tag="\n          <rdf:li>extra</rdf:li>" if is_extra else "",
    )


def build_zip(client_name: str, photos) -> bytes:
    """`photos` are SelectedPhoto rows (filename, note, is_extra)."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in photos:
            zf.writestr(f"{base_name(p.filename)}.xmp", xmp_for(p.filename, client_name, p.note, p.is_extra))
        lines = [p.filename + ("  [extra]" if p.is_extra else "") + (f"  # {p.note}" if p.note else "") for p in photos]
        zf.writestr("selected_files.txt", "\n".join(lines) + "\n")
    return buf.getvalue()


def filenames_string(filenames: list[str]) -> str:
    return ", ".join(base_name(f) for f in filenames)


def _q(v: str) -> str:
    return '"' + (v or "").replace('"', '""') + '"'


def build_csv(client_name: str, photos) -> str:
    lines = ["no,filename,base_name,client,extra,note"]
    for i, p in enumerate(photos, 1):
        lines.append(
            f"{i},{_q(p.filename)},{_q(base_name(p.filename))},{_q(client_name)},{'yes' if p.is_extra else 'no'},{_q(p.note or '')}"
        )
    return "\n".join(lines) + "\n"
