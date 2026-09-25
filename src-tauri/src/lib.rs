mod vault;

use vault::{
    get_last_vault, pick_directory, set_last_vault, vault_load, vault_mkdir, vault_remove_dir,
    vault_remove_file, vault_rename, vault_write,
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
            vault_remove_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
