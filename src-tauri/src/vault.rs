use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tauri::{async_runtime, AppHandle, Emitter};

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
    /// Local-only recent opens: "{vaultRoot}\t{topicId}" -> epoch millis.
    /// Kept out of synced topic files so Drive does not fight over lastOpenedAt.
    #[serde(default)]
    topic_opens: HashMap<String, i64>,
}

struct WatchState {
    root: String,
    _watcher: RecommendedWatcher,
}

static WATCH_STATE: OnceLock<Mutex<Option<WatchState>>> = OnceLock::new();
static WATCH_DEBOUNCE_GEN: AtomicU64 = AtomicU64::new(0);

fn watch_state() -> &'static Mutex<Option<WatchState>> {
    WATCH_STATE.get_or_init(|| Mutex::new(None))
}

fn topic_open_key(root: &str, topic_id: &str) -> String {
    format!("{root}\t{topic_id}")
}

fn settings_dir() -> PathBuf {
    if let Ok(base) = std::env::var("APPDATA") {
        return PathBuf::from(base).join("KWeb");
    }
    if let Ok(base) = std::env::var("XDG_CONFIG_HOME") {
        return PathBuf::from(base).join("KWeb");
    }
    let base = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    PathBuf::from(base).join(".config").join("KWeb")
}

fn settings_file() -> PathBuf {
    settings_dir().join("settings.json")
}

fn atomic_write(target: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = target
        .parent()
        .ok_or_else(|| "Invalid target path".to_string())?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let file_name = target
        .file_name()
        .ok_or_else(|| "Invalid target path".to_string())?;
    let tmp_name = format!(
        ".{}.tmp-{}-{}",
        file_name.to_string_lossy(),
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0)
    );
    let tmp = parent.join(tmp_name);
    if let Err(err) = fs::write(&tmp, bytes) {
        let _ = fs::remove_file(&tmp);
        return Err(err.to_string());
    }
    if let Err(err) = fs::rename(&tmp, target) {
        let _ = fs::remove_file(&tmp);
        return Err(err.to_string());
    }
    Ok(())
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
    atomic_write(&settings_file(), text.as_bytes())
}

async fn run_blocking<T, F>(task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    async_runtime::spawn_blocking(task)
        .await
        .map_err(|e| e.to_string())?
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
        if should_skip_dir(&name) {
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

fn should_skip_dir(name: &str) -> bool {
    matches!(
        name,
        ".git"
            | ".hg"
            | ".svn"
            | ".next"
            | ".nuxt"
            | ".svelte-kit"
            | ".turbo"
            | ".cache"
            | "node_modules"
            | "target"
            | "dist"
            | "build"
            | "coverage"
            | "out"
    )
}

#[tauri::command]
pub async fn get_last_vault() -> Result<Option<String>, String> {
    run_blocking(|| Ok(read_settings().vault_path)).await
}

#[tauri::command]
pub async fn set_last_vault(path: String) -> Result<(), String> {
    run_blocking(move || {
        let mut settings = read_settings();
        settings.vault_path = Some(path);
        write_settings(&settings)
    })
    .await
}

#[tauri::command]
pub async fn pick_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    run_blocking(move || {
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
    })
    .await
}

#[tauri::command]
pub async fn vault_load(root: String) -> Result<VaultSnapshot, String> {
    run_blocking(move || {
        let root_path = canonicalize_dir(Path::new(&root))?;
        let mut snapshot = VaultSnapshot {
            files: Vec::new(),
            directories: Vec::new(),
        };
        walk(&root_path, &root_path, &mut snapshot)?;
        snapshot.directories.sort();
        snapshot.files.sort_by(|a, b| a.path.cmp(&b.path));
        Ok(snapshot)
    })
    .await
}

#[tauri::command]
pub async fn vault_write(root: String, relative: String, text: String) -> Result<(), String> {
    run_blocking(move || {
        let target = resolve(&root, &relative)?;
        atomic_write(&target, text.as_bytes())
    })
    .await
}

#[tauri::command]
pub async fn vault_write_bytes(
    root: String,
    relative: String,
    base64: String,
) -> Result<(), String> {
    run_blocking(move || {
        use base64::Engine as _;
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(base64.as_bytes())
            .map_err(|e| e.to_string())?;
        let target = resolve(&root, &relative)?;
        atomic_write(&target, &bytes)
    })
    .await
}

#[tauri::command]
pub async fn vault_mkdir(root: String, relative: String) -> Result<(), String> {
    run_blocking(move || {
        let target = resolve(&root, &relative)?;
        fs::create_dir_all(target).map_err(|e| e.to_string())
    })
    .await
}

#[tauri::command]
pub async fn vault_rename(root: String, from: String, to: String) -> Result<(), String> {
    run_blocking(move || {
        let source = resolve(&root, &from)?;
        let dest = resolve(&root, &to)?;
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::rename(source, dest).map_err(|e| e.to_string())
    })
    .await
}

#[tauri::command]
pub async fn vault_remove_file(root: String, relative: String) -> Result<(), String> {
    run_blocking(move || {
        let target = resolve(&root, &relative)?;
        if target.is_file() {
            fs::remove_file(target).map_err(|e| e.to_string())?;
        }
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn vault_remove_dir(root: String, relative: String) -> Result<(), String> {
    run_blocking(move || {
        let root_canon = canonicalize_dir(Path::new(&root))?;
        let target = resolve(&root, &relative)?;
        if target == root_canon {
            return Err("Cannot remove the vault root".into());
        }
        fs::remove_dir(target).map_err(|e| e.to_string())
    })
    .await
}

#[tauri::command]
pub async fn record_local_topic_open(
    root: String,
    topic_id: String,
    opened_at: i64,
) -> Result<(), String> {
    run_blocking(move || {
        let mut settings = read_settings();
        settings
            .topic_opens
            .insert(topic_open_key(&root, &topic_id), opened_at);
        write_settings(&settings)
    })
    .await
}

#[tauri::command]
pub async fn get_local_topic_opens(root: String) -> Result<HashMap<String, i64>, String> {
    run_blocking(move || {
        let settings = read_settings();
        let prefix = format!("{root}\t");
        let mut opens = HashMap::new();
        for (key, value) in settings.topic_opens {
            if let Some(topic_id) = key.strip_prefix(&prefix) {
                opens.insert(topic_id.to_string(), value);
            }
        }
        Ok(opens)
    })
    .await
}

fn path_is_temp(path: &Path) -> bool {
    path.file_name()
        .and_then(|n| n.to_str())
        .map(|name| name.contains(".tmp-"))
        .unwrap_or(false)
}

fn schedule_vault_emit(app: AppHandle, root: String) {
    let gen = WATCH_DEBOUNCE_GEN.fetch_add(1, Ordering::SeqCst) + 1;
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(400));
        if WATCH_DEBOUNCE_GEN.load(Ordering::SeqCst) != gen {
            return;
        }
        let _ = app.emit("vault-external-change", root);
    });
}

#[tauri::command]
pub async fn vault_start_watch(app: AppHandle, root: String) -> Result<(), String> {
    let root_path = canonicalize_dir(Path::new(&root))?;
    let root_string = root_path.to_string_lossy().to_string();

    {
        let mut guard = watch_state()
            .lock()
            .map_err(|_| "Vault watch lock poisoned".to_string())?;
        if let Some(existing) = guard.as_ref() {
            if existing.root == root_string {
                return Ok(());
            }
        }
        *guard = None;
    }

    let app_for_watch = app.clone();
    let watched_root = root_string.clone();
    let mut watcher = notify::recommended_watcher(move |result: Result<notify::Event, notify::Error>| {
        let Ok(event) = result else {
            return;
        };
        match event.kind {
            EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_) => {}
            _ => return,
        }
        let relevant = event.paths.iter().any(|path| {
            if path_is_temp(path) {
                return false;
            }
            let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
            name.ends_with(".md") || name == ".kweb.json" || name == "vault.json"
        });
        if relevant {
            schedule_vault_emit(app_for_watch.clone(), watched_root.clone());
        }
    })
    .map_err(|e| e.to_string())?;

    watcher
        .watch(&root_path, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    let mut guard = watch_state()
        .lock()
        .map_err(|_| "Vault watch lock poisoned".to_string())?;
    *guard = Some(WatchState {
        root: root_string,
        _watcher: watcher,
    });
    Ok(())
}

#[tauri::command]
pub async fn vault_stop_watch() -> Result<(), String> {
    let mut guard = watch_state()
        .lock()
        .map_err(|_| "Vault watch lock poisoned".to_string())?;
    *guard = None;
    WATCH_DEBOUNCE_GEN.fetch_add(1, Ordering::SeqCst);
    Ok(())
}
