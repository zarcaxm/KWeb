use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultFile {
    pub path: String,
    pub text: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultSnapshot {
    pub files: Vec<VaultFile>,
    pub directories: Vec<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Default)]
struct Settings {
    vault_path: Option<String>,
}

fn settings_dir() -> PathBuf {
    let base = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".into());
    PathBuf::from(base).join("KWeb")
}

fn settings_file() -> PathBuf {
    settings_dir().join("settings.json")
}

fn read_settings() -> Settings {
    let Ok(text) = fs::read_to_string(settings_file()) else {
        return Settings::default();
    };
    serde_json::from_str(&text).unwrap_or_default()
}

fn write_settings(settings: &Settings) -> Result<(), String> {
    fs::create_dir_all(settings_dir()).map_err(|e| e.to_string())?;
    let text = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(settings_file(), text).map_err(|e| e.to_string())
}

fn canonicalize_dir(path: &Path) -> Result<PathBuf, String> {
    if !path.is_dir() {
        return Err("Folder does not exist".into());
    }
    dunce::canonicalize(path).map_err(|e| e.to_string())
}

fn resolve(root: &str, relative: &str) -> Result<PathBuf, String> {
    let root_canon = canonicalize_dir(Path::new(root))?;
    let mut target = root_canon.clone();
    for part in relative.split(['/', '\\']) {
        if part.is_empty() || part == "." {
            continue;
        }
        if part == ".." {
            return Err("Invalid path".into());
        }
        target.push(part);
    }

    if target.exists() {
        let canon = dunce::canonicalize(&target).map_err(|e| e.to_string())?;
        if !canon.starts_with(&root_canon) {
            return Err("Path is outside the vault".into());
        }
        return Ok(canon);
    }

    if let Some(parent) = target.parent() {
        if parent.exists() {
            let parent_canon = dunce::canonicalize(parent).map_err(|e| e.to_string())?;
            if !parent_canon.starts_with(&root_canon) {
                return Err("Path is outside the vault".into());
            }
        }
    }

    Ok(target)
}

fn relative_path(root: &Path, full: &Path) -> Result<String, String> {
    let root = dunce::canonicalize(root).map_err(|e| e.to_string())?;
    let full = dunce::canonicalize(full).map_err(|e| e.to_string())?;
    let rel = full
        .strip_prefix(&root)
        .map_err(|_| "Path is outside the vault".to_string())?;
    let mut out = String::new();
    for (index, component) in rel.components().enumerate() {
        if index > 0 {
            out.push('/');
        }
        out.push_str(&component.as_os_str().to_string_lossy());
    }
    Ok(out)
}

fn walk(dir: &Path, root: &Path, snapshot: &mut VaultSnapshot) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if name == ".git" {
            continue;
        }
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        if meta.is_dir() {
            let rel = relative_path(root, &path)?;
            if !rel.is_empty() {
                snapshot.directories.push(rel);
            }
            walk(&path, root, snapshot)?;
        } else if meta.is_file() {
            let rel = relative_path(root, &path)?;
            let is_markdown = rel.ends_with(".md");
            let is_meta = name == ".kweb.json" || rel == ".kweb/vault.json";
            if is_markdown || is_meta {
                let text = fs::read_to_string(&path).map_err(|e| format!("{rel}: {e}"))?;
                snapshot.files.push(VaultFile { path: rel, text });
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn get_last_vault() -> Option<String> {
    read_settings().vault_path
}

#[tauri::command]
pub fn set_last_vault(path: String) -> Result<(), String> {
    let mut settings = read_settings();
    settings.vault_path = Some(path);
    write_settings(&settings)
}

#[tauri::command]
pub fn pick_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let picked = app
        .dialog()
        .file()
        .set_title("Choose a vault folder")
        .blocking_pick_folder();
    match picked {
        None => Ok(None),
        Some(file) => {
            let path = file.into_path().map_err(|err| err.to_string())?;
            Ok(Some(path.to_string_lossy().to_string()))
        }
    }
}

#[tauri::command]
pub fn vault_load(root: String) -> Result<VaultSnapshot, String> {
    let root_path = canonicalize_dir(Path::new(&root))?;
    let mut snapshot = VaultSnapshot {
        files: Vec::new(),
        directories: Vec::new(),
    };
    walk(&root_path, &root_path, &mut snapshot)?;
    snapshot.directories.sort();
    snapshot.files.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(snapshot)
}

#[tauri::command]
pub fn vault_write(root: String, relative: String, text: String) -> Result<(), String> {
    let target = resolve(&root, &relative)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(target, text).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn vault_mkdir(root: String, relative: String) -> Result<(), String> {
    let target = resolve(&root, &relative)?;
    fs::create_dir_all(target).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn vault_rename(root: String, from: String, to: String) -> Result<(), String> {
    let source = resolve(&root, &from)?;
    let dest = resolve(&root, &to)?;
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(source, dest).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn vault_remove_file(root: String, relative: String) -> Result<(), String> {
    let target = resolve(&root, &relative)?;
    if target.is_file() {
        fs::remove_file(target).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn vault_remove_dir(root: String, relative: String) -> Result<(), String> {
    let root_canon = canonicalize_dir(Path::new(&root))?;
    let target = resolve(&root, &relative)?;
    if target == root_canon {
        return Err("Cannot remove the vault root".into());
    }
    fs::remove_dir(target).map_err(|e| e.to_string())
}
