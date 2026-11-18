//! Installed font families, read from the font files themselves (no OS font API needed).
use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};
use ttf_parser::{fonts_in_collection, name_id, Face};

/// Folders that usually hold fonts on this OS.
fn font_dirs() -> Vec<PathBuf> {
    let mut v: Vec<PathBuf> = Vec::new();
    if cfg!(target_os = "windows") {
        v.push(PathBuf::from(r"C:\Windows\Fonts"));
        if let Ok(d) = std::env::var("LOCALAPPDATA") { v.push(PathBuf::from(d).join(r"Microsoft\Windows\Fonts")); }
    } else if cfg!(target_os = "macos") {
        v.push("/System/Library/Fonts".into());
        v.push("/Library/Fonts".into());
        if let Ok(h) = std::env::var("HOME") { v.push(PathBuf::from(h).join("Library/Fonts")); }
    } else {
        v.push("/usr/share/fonts".into());
        v.push("/usr/local/share/fonts".into());
        if let Ok(h) = std::env::var("HOME") { v.push(PathBuf::from(&h).join(".fonts")); v.push(PathBuf::from(h).join(".local/share/fonts")); }
    }
    v
}

fn is_font(p: &Path) -> bool {
    matches!(p.extension().and_then(|e| e.to_str()).map(|e| e.to_ascii_lowercase()).as_deref(), Some("ttf" | "otf" | "ttc" | "otc"))
}

/// Family name of one face: typographic family (ID 16) when present, else the classic one (ID 1).
fn family(face: &Face) -> Option<String> {
    let find = |id: u16| face.names().into_iter().filter(|n| n.name_id == id).find_map(|n| n.to_string()).filter(|s| !s.trim().is_empty());
    find(name_id::TYPOGRAPHIC_FAMILY).or_else(|| find(name_id::FAMILY))
}

/// Family names in one font file's bytes (a .ttc holds several faces). Never panics on bad data.
pub fn families_in(data: &[u8]) -> Vec<String> {
    let n = fonts_in_collection(data).unwrap_or(1);
    (0..n).filter_map(|i| Face::parse(data, i).ok().and_then(|f| family(&f))).collect()
}

fn walk(dir: &Path, depth: u32, out: &mut BTreeSet<String>) {
    let Ok(rd) = fs::read_dir(dir) else { return };
    for e in rd.flatten() {
        let p = e.path();
        if p.is_dir() { if depth < 4 { walk(&p, depth + 1, out); } }
        else if is_font(&p) { if let Ok(data) = fs::read(&p) { out.extend(families_in(&data)); } }
    }
}

/// Every installed family, de-duplicated and sorted. Unreadable files are skipped.
pub fn list() -> Vec<String> {
    let mut set = BTreeSet::new();
    for d in font_dirs() { walk(&d, 0, &mut set); }
    let mut v: Vec<String> = set.into_iter().collect();
    v.sort_by_key(|s| s.to_lowercase());
    v
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn garbage_is_skipped() {
        assert!(families_in(&[]).is_empty());
        assert!(families_in(b"not a font at all").is_empty());
    }
    #[test]
    fn list_does_not_panic() { let v = list(); assert!(v.windows(2).all(|w| w[0].to_lowercase() <= w[1].to_lowercase())); }
}
