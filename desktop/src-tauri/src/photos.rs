//! Reading photo folders: listing files, thumbnails (cached on disk), real sizes, EXIF time and
//! orientation, and full-size previews pulled out of RAW files.

use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::{BufReader, Cursor};
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use image::imageops::FilterType;
use image::{DynamicImage, ImageFormat};
use serde::Serialize;

const IMAGE_EXT: &[&str] = &["jpg", "jpeg", "png", "webp"];
const RAW_EXT: &[&str] = &["cr2", "cr3", "nef", "nrw", "arw", "srf", "sr2", "raf", "orf", "rw2", "pef", "dng", "srw", "3fr", "iiq"];
const THUMB_H: u32 = 480;

#[derive(Serialize)]
pub struct Entry {
    /// Path relative to the scanned folder, with forward slashes: the photo's stable id.
    rel: String,
    path: String,
    size: u64,
    mtime: u64,
    raw: bool,
}

fn ext_of(p: &Path) -> String {
    p.extension().and_then(|e| e.to_str()).unwrap_or("").to_ascii_lowercase()
}

fn walk(root: &Path, dir: &Path, out: &mut Vec<Entry>) {
    let Ok(rd) = fs::read_dir(dir) else { return };
    for e in rd.flatten() {
        let p = e.path();
        let name = e.file_name().to_string_lossy().to_string();
        if name.starts_with('.') { continue; }
        let Ok(md) = e.metadata() else { continue };
        if md.is_dir() { walk(root, &p, out); continue; }
        let ext = ext_of(&p);
        let raw = RAW_EXT.contains(&ext.as_str());
        if !raw && !IMAGE_EXT.contains(&ext.as_str()) { continue; }
        let rel = p.strip_prefix(root).unwrap_or(&p).to_string_lossy().replace('\\', "/");
        let mtime = md.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok()).map(|d| d.as_millis() as u64).unwrap_or(0);
        out.push(Entry { rel, path: p.to_string_lossy().to_string(), size: md.len(), mtime, raw });
    }
}

/// Every photo under `dir` (subfolders included). When a RAW and a JPEG share a name, both are listed;
/// the app pairs them.
pub fn scan(dir: &str) -> Result<Vec<Entry>, String> {
    let root = PathBuf::from(dir);
    if !root.is_dir() { return Err(format!("Folder tidak ditemukan: {dir}")); }
    let mut out = Vec::new();
    walk(&root, &root, &mut out);
    out.sort_by(|a, b| a.rel.cmp(&b.rel));
    Ok(out)
}

#[derive(Serialize, Clone)]
pub struct Prepared {
    /// Small JPEG for grids and the editor.
    thumb: String,
    /// What to show and print at full size: the file itself, or for RAW its extracted preview.
    full: String,
    w: u32,
    h: u32,
    /// Capture time from EXIF, in ms since 1970 (local time read as UTC), when present.
    taken: Option<u64>,
    camera: Option<String>,
}

fn cache_key(path: &Path, size: u64, mtime: u64) -> String {
    let mut h = DefaultHasher::new();
    path.hash(&mut h); size.hash(&mut h); mtime.hash(&mut h);
    "v2".hash(&mut h);
    format!("{:016x}", h.finish())
}

struct Meta { orientation: u32, taken: Option<u64>, camera: Option<String> }

fn exif_meta(bytes: &[u8]) -> Meta {
    let mut m = Meta { orientation: 1, taken: None, camera: None };
    let Ok(ex) = exif::Reader::new().read_from_container(&mut Cursor::new(bytes)) else { return m };
    if let Some(f) = ex.get_field(exif::Tag::Orientation, exif::In::PRIMARY) {
        if let Some(v) = f.value.get_uint(0) { m.orientation = v; }
    }
    let when = ex.get_field(exif::Tag::DateTimeOriginal, exif::In::PRIMARY).or_else(|| ex.get_field(exif::Tag::DateTime, exif::In::PRIMARY));
    if let Some(f) = when {
        if let exif::Value::Ascii(ref v) = f.value {
            if let Some(s) = v.first() {
                if let Ok(dt) = exif::DateTime::from_ascii(s) { m.taken = Some(to_ms(&dt)); }
            }
        }
    }
    let model = ex.get_field(exif::Tag::Model, exif::In::PRIMARY).map(|f| f.display_value().to_string().trim_matches('"').trim().to_string());
    m.camera = model.filter(|s| !s.is_empty());
    m
}

fn to_ms(d: &exif::DateTime) -> u64 {
    // Days from civil date (proleptic Gregorian), then to milliseconds.
    let (y, mo, da) = (d.year as i64, d.month as i64, d.day as i64);
    let y2 = if mo <= 2 { y - 1 } else { y };
    let era = if y2 >= 0 { y2 } else { y2 - 399 } / 400;
    let yoe = y2 - era * 400;
    let mp = (mo + 9) % 12;
    let doy = (153 * mp + 2) / 5 + da - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    let days = era * 146097 + doe - 719468;
    let secs = days * 86400 + d.hour as i64 * 3600 + d.minute as i64 * 60 + d.second as i64;
    (secs.max(0) as u64) * 1000
}

fn orient(img: DynamicImage, o: u32) -> DynamicImage {
    match o {
        2 => img.fliph(),
        3 => img.rotate180(),
        4 => img.flipv(),
        5 => img.rotate90().fliph(),
        6 => img.rotate90(),
        7 => img.rotate270().fliph(),
        8 => img.rotate270(),
        _ => img,
    }
}
fn swaps(o: u32) -> bool { (5..=8).contains(&o) }

/// The largest embedded JPEG inside a RAW file (most cameras store a full-size one).
fn largest_embedded_jpeg(b: &[u8]) -> Option<&[u8]> {
    let mut best: Option<&[u8]> = None;
    let mut i = 0;
    while i + 3 < b.len() {
        if b[i] == 0xFF && b[i + 1] == 0xD8 && b[i + 2] == 0xFF {
            if let Some(end) = jpeg_end(b, i) {
                let s = &b[i..end];
                if best.map_or(true, |x| s.len() > x.len()) { best = Some(s); }
                i = end;
                continue;
            }
        }
        i += 1;
    }
    best.filter(|s| s.len() > 50_000)
}

/// Walk JPEG markers from SOI to EOI so data inside the image is not mistaken for a marker.
fn jpeg_end(b: &[u8], start: usize) -> Option<usize> {
    let mut i = start + 2;
    while i + 2 <= b.len() {
        if b[i] != 0xFF { return None; }
        let m = b[i + 1];
        if m == 0xD9 { return Some(i + 2); }
        if m == 0xFF { i += 1; continue; }
        if (0xD0..=0xD7).contains(&m) || m == 0x01 { i += 2; continue; }
        if i + 4 > b.len() { return None; }
        let len = ((b[i + 2] as usize) << 8) | b[i + 3] as usize;
        if len < 2 { return None; }
        i += 2 + len;
        if m == 0xDA {
            // Entropy-coded data: run to the next marker that is not a stuffed byte or restart.
            while i + 1 < b.len() {
                if b[i] == 0xFF && b[i + 1] != 0 && !(0xD0..=0xD7).contains(&b[i + 1]) { break; }
                i += 1;
            }
        }
    }
    None
}

/// Decode a JPEG at reduced scale (fast: the decoder skips most of the work).
fn decode_jpeg_small(bytes: &[u8], target_h: u32) -> Result<DynamicImage, String> {
    let mut d = jpeg_decoder::Decoder::new(BufReader::new(Cursor::new(bytes)));
    d.read_info().map_err(|e| e.to_string())?;
    let info = d.info().ok_or("no info")?;
    let short = info.width.min(info.height) as u32;
    let want = ((target_h as f32 / short as f32) * info.width as f32).max(1.0) as u16;
    let _ = d.scale(want.max(1), ((target_h as f32 / short as f32) * info.height as f32).max(1.0) as u16);
    let px = d.decode().map_err(|e| e.to_string())?;
    let info = d.info().ok_or("no info")?;
    let (w, h) = (info.width as u32, info.height as u32);
    match info.pixel_format {
        jpeg_decoder::PixelFormat::RGB24 => image::RgbImage::from_raw(w, h, px).map(DynamicImage::ImageRgb8).ok_or("bad size".into()),
        jpeg_decoder::PixelFormat::L8 => image::GrayImage::from_raw(w, h, px).map(DynamicImage::ImageLuma8).ok_or("bad size".into()),
        _ => image::load_from_memory_with_format(bytes, ImageFormat::Jpeg).map_err(|e| e.to_string()),
    }
}

fn jpeg_dims(bytes: &[u8]) -> Option<(u32, u32)> {
    let mut d = jpeg_decoder::Decoder::new(Cursor::new(bytes));
    d.read_info().ok()?;
    d.info().map(|i| (i.width as u32, i.height as u32))
}

fn save_jpeg(img: &DynamicImage, path: &Path, quality: u8) -> Result<(), String> {
    let f = fs::File::create(path).map_err(|e| e.to_string())?;
    let mut enc = image::codecs::jpeg::JpegEncoder::new_with_quality(std::io::BufWriter::new(f), quality);
    enc.encode_image(&img.to_rgb8()).map_err(|e| e.to_string())
}

/// Make (or reuse from the cache) the thumbnail and full-size source for one photo.
pub fn prepare(path: &str, cache: &Path) -> Result<Prepared, String> {
    let p = PathBuf::from(path);
    let md = fs::metadata(&p).map_err(|e| e.to_string())?;
    let mtime = md.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok()).map(|d| d.as_millis() as u64).unwrap_or(0);
    let key = cache_key(&p, md.len(), mtime);
    fs::create_dir_all(cache).map_err(|e| e.to_string())?;
    let thumb = cache.join(format!("{key}.t.jpg"));
    let info = cache.join(format!("{key}.json"));
    if thumb.exists() {
        if let Ok(s) = fs::read_to_string(&info) {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&s) {
                let full = v["full"].as_str().unwrap_or(path).to_string();
                if Path::new(&full).exists() {
                    return Ok(Prepared {
                        thumb: thumb.to_string_lossy().into(), full,
                        w: v["w"].as_u64().unwrap_or(0) as u32, h: v["h"].as_u64().unwrap_or(0) as u32,
                        taken: v["taken"].as_u64(), camera: v["camera"].as_str().map(String::from),
                    });
                }
            }
        }
    }

    let bytes = fs::read(&p).map_err(|e| e.to_string())?;
    let ext = ext_of(&p);
    let meta = exif_meta(&bytes);
    let o = meta.orientation;
    let (full, w, h, small) = if RAW_EXT.contains(&ext.as_str()) {
        let jpg = largest_embedded_jpeg(&bytes).ok_or("RAW ini tidak menyimpan pratinjau JPEG")?;
        // The preview is written upright, so everything downstream can ignore orientation.
        let img = orient(image::load_from_memory_with_format(jpg, ImageFormat::Jpeg).map_err(|e| e.to_string())?, o);
        let full = cache.join(format!("{key}.full.jpg"));
        save_jpeg(&img, &full, 95)?;
        let (w, h) = (img.width(), img.height());
        let small = img.resize(u32::MAX, THUMB_H, FilterType::Triangle);
        (full.to_string_lossy().to_string(), w, h, small)
    } else if ext == "jpg" || ext == "jpeg" {
        let (sw, sh) = jpeg_dims(&bytes).ok_or("JPEG rusak")?;
        let (w, h) = if swaps(o) { (sh, sw) } else { (sw, sh) };
        let small = orient(decode_jpeg_small(&bytes, THUMB_H)?, o);
        let small = if small.height() > THUMB_H * 2 { small.resize(u32::MAX, THUMB_H, FilterType::Triangle) } else { small };
        (path.to_string(), w, h, small)
    } else {
        let img = orient(image::load_from_memory(&bytes).map_err(|e| e.to_string())?, o);
        let (w, h) = (img.width(), img.height());
        (path.to_string(), w, h, img.resize(u32::MAX, THUMB_H, FilterType::Triangle))
    };
    save_jpeg(&small, &thumb, 82)?;
    let rec = serde_json::json!({ "full": full, "w": w, "h": h, "taken": meta.taken, "camera": meta.camera });
    let _ = fs::write(&info, rec.to_string());
    Ok(Prepared { thumb: thumb.to_string_lossy().into(), full, w, h, taken: meta.taken, camera: meta.camera })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn jpeg(w: u32, h: u32) -> Vec<u8> {
        let img = DynamicImage::ImageRgb8(image::RgbImage::from_fn(w, h, |x, y| image::Rgb([(x % 251) as u8, (y % 241) as u8, ((x * y) % 239) as u8])));
        let mut v = Vec::new();
        image::codecs::jpeg::JpegEncoder::new_with_quality(&mut v, 90).encode_image(&img.to_rgb8()).unwrap();
        v
    }

    #[test]
    fn finds_the_largest_embedded_jpeg() {
        let small = jpeg(160, 120);
        let big = jpeg(1200, 800);
        let mut raw = b"II*\0 fake raw header".to_vec();
        raw.extend(&small);
        raw.extend(vec![0u8; 500]);
        raw.extend(&big);
        raw.extend(b"trailing sensor data \xFF\xD8 not a jpeg");
        assert_eq!(largest_embedded_jpeg(&raw).unwrap(), &big[..]);
    }

    #[test]
    fn prepares_jpeg_and_raw_with_cache() {
        let dir = std::env::temp_dir().join(format!("lwalbum-test-{}", std::process::id()));
        let cache = dir.join("cache");
        fs::create_dir_all(dir.join("sub")).unwrap();
        fs::write(dir.join("a.jpg"), jpeg(1800, 1200)).unwrap();
        let mut raw = b"II*\0".to_vec();
        raw.extend(jpeg(1500, 1000));
        fs::write(dir.join("sub/b.CR2"), &raw).unwrap();
        fs::write(dir.join("notes.txt"), "x").unwrap();

        let list = scan(dir.to_str().unwrap()).unwrap();
        let rels: Vec<_> = list.iter().map(|e| (e.rel.as_str(), e.raw)).collect();
        assert_eq!(rels, vec![("a.jpg", false), ("sub/b.CR2", true)]);

        let a = prepare(&list[0].path, &cache).unwrap();
        assert_eq!((a.w, a.h), (1800, 1200));
        assert_eq!(a.full, list[0].path);
        let t = image::open(&a.thumb).unwrap();
        assert!(t.height() >= 120 && t.height() <= THUMB_H * 2, "thumb {}x{}", t.width(), t.height());

        let b = prepare(&list[1].path, &cache).unwrap();
        assert_eq!((b.w, b.h), (1500, 1000));
        assert!(b.full.ends_with(".full.jpg"));
        assert_eq!(image::open(&b.full).unwrap().width(), 1500);
        // Second call comes from the cache.
        let again = prepare(&list[1].path, &cache).unwrap();
        assert_eq!(again.full, b.full);
        fs::remove_dir_all(&dir).ok();
    }
}
