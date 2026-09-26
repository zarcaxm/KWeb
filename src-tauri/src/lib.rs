mod vault;

use vault::{
    get_last_vault, get_local_topic_opens, pick_directory, record_local_topic_open, set_last_vault,
    vault_load, vault_mkdir, vault_remove_dir, vault_remove_file, vault_rename, vault_start_watch,
    vault_stop_watch, vault_write,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_last_vault,
            set_last_vault,
            pick_directory,
            vault_load,
            vault_write,
            vault_mkdir,
            vault_rename,
            vault_remove_file,
            vault_remove_dir,
            record_local_topic_open,
            get_local_topic_opens,
            vault_start_watch,
            vault_stop_watch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
