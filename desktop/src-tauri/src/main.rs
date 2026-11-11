// No console window behind the app on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod photos;

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn cache_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_cache_dir().map_err(|e| e.to_string())?.join("thumbs"))
}

#[tauri::command]
async fn scan_folder(dir: String) -> Result<Vec<photos::Entry>, String> {
    tauri::async_runtime::spawn_blocking(move || photos::scan(&dir)).await.map_err(|e| e.to_string())?
}

/// Thumbnails for a batch of photos, made in parallel on worker threads.
#[tauri::command]
async fn prepare_photos(app: tauri::AppHandle, paths: Vec<String>) -> Result<Vec<Result<photos::Prepared, String>>, String> {
    let cache = cache_dir(&app)?;
    let jobs: Vec<_> = paths.into_iter().map(|p| {
        let c = cache.clone();
        tauri::async_runtime::spawn_blocking(move || photos::prepare(&p, &c))
    }).collect();
    let mut out = Vec::with_capacity(jobs.len());
    for j in jobs { out.push(j.await.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn read_text(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Write via a temporary file and rename, so a crash mid-write never leaves a half file.
#[tauri::command]
fn write_text(path: String, text: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if let Some(d) = p.parent() { fs::create_dir_all(d).map_err(|e| e.to_string())?; }
    let tmp = p.with_extension("tmp");
    fs::write(&tmp, text).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &p).map_err(|e| e.to_string())
}

/// Binary write; the bytes travel as the raw request body, the target path in a header.
#[tauri::command]
fn write_bytes(request: tauri::ipc::Request<'_>) -> Result<(), String> {
    let path = request.headers().get("x-path").and_then(|v| v.to_str().ok()).ok_or("no path")?;
    let path = percent_decode(path);
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else { return Err("expected raw bytes".into()) };
    let p = PathBuf::from(&path);
    if let Some(d) = p.parent() { fs::create_dir_all(d).map_err(|e| e.to_string())?; }
    fs::write(&p, bytes).map_err(|e| e.to_string())
}

fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Ok(v) = u8::from_str_radix(&s[i + 1..i + 3], 16) { out.push(v); i += 3; continue; }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[derive(serde::Serialize)]
struct FileInfo { path: String, modified: u64 }

/// Files with one extension in a folder (not recursive), newest first.
#[tauri::command]
fn list_files(dir: String, ext: String) -> Result<Vec<FileInfo>, String> {
    let Ok(rd) = fs::read_dir(&dir) else { return Ok(vec![]) };
    let mut out: Vec<FileInfo> = rd.flatten().filter_map(|e| {
        let p = e.path();
        if p.extension().and_then(|x| x.to_str()).map(|x| x.eq_ignore_ascii_case(&ext)) != Some(true) { return None; }
        let m = e.metadata().ok()?.modified().ok()?.duration_since(std::time::UNIX_EPOCH).ok()?.as_millis() as u64;
        Some(FileInfo { path: p.to_string_lossy().into(), modified: m })
    }).collect();
    out.sort_by(|a, b| b.modified.cmp(&a.modified));
    Ok(out)
}

#[tauri::command]
fn remove_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    PathBuf::from(path).exists()
}

/// Copy a file, keeping at most `keep` older copies in the same folder (used for project versions).
#[tauri::command]
fn snapshot(path: String, dir: String, keep: usize) -> Result<(), String> {
    let src = PathBuf::from(&path);
    if !src.exists() { return Ok(()); }
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let name = src.file_stem().and_then(|s| s.to_str()).unwrap_or("proyek");
    fs::copy(&src, PathBuf::from(&dir).join(format!("{name}.{stamp}.lwalbum"))).map_err(|e| e.to_string())?;
    let mut old: Vec<_> = fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten()
        .filter(|e| e.file_name().to_string_lossy().starts_with(&format!("{name}."))).map(|e| e.path()).collect();
    old.sort();
    while old.len() > keep { let _ = fs::remove_file(old.remove(0)); }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_folder, prepare_photos, read_text, write_text, write_bytes, list_files, remove_file, path_exists, snapshot
        ])
        .run(tauri::generate_context!())
        .expect("error while running LW Album");
}
