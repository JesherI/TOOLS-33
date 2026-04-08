mod pdf_compress_pure;

use pdf_compress_pure::compress_pdf_rust;
use tauri_plugin_updater::UpdaterExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            compress_pdf_rust,
            check_for_updates,
            install_update,
        ])
        .setup(|_app| {
            // Verificar actualizaciones automáticamente al iniciar (en producción)
            #[cfg(not(dev))]
            {
                let handle = _app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    // Esperar 5 segundos después de iniciar para verificar
                    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                    if let Err(e) = auto_check_update(&handle).await {
                        println!("Error checking for updates: {}", e);
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(serde::Serialize)]
struct UpdateInfo {
    available: bool,
    version: Option<String>,
    body: Option<String>,
}

#[tauri::command]
async fn check_for_updates(app_handle: tauri::AppHandle) -> Result<UpdateInfo, String> {
    match check_update_internal(&app_handle).await {
        Ok(info) => Ok(info),
        Err(e) => Err(format!("Error checking for updates: {}", e)),
    }
}

#[tauri::command]
async fn install_update(app_handle: tauri::AppHandle) -> Result<(), String> {
    install_update_internal(&app_handle).await
        .map_err(|e| format!("Error installing update: {}", e))
}

async fn check_update_internal(app_handle: &tauri::AppHandle) -> anyhow::Result<UpdateInfo> {
    let updater = app_handle.updater_builder().build()?;
    
    if let Some(update) = updater.check().await? {
        Ok(UpdateInfo {
            available: true,
            version: Some(update.version.clone()),
            body: update.body.clone(),
        })
    } else {
        Ok(UpdateInfo {
            available: false,
            version: None,
            body: None,
        })
    }
}

async fn install_update_internal(app_handle: &tauri::AppHandle) -> anyhow::Result<()> {
    let updater = app_handle.updater_builder().build()?;
    
    if let Some(update) = updater.check().await? {
        // Descargar e instalar
        update.download_and_install(|_, _| {}, || {}).await?;
        // Reiniciar la aplicación
        app_handle.restart();
    }
    
    Ok(())
}

async fn auto_check_update(app_handle: &tauri::AppHandle) -> anyhow::Result<()> {
    let updater = app_handle.updater_builder().build()?;
    
    if let Some(update) = updater.check().await? {
        println!("Update available: {}", update.version);
        
        // Descargar e instalar silenciosamente
        update.download_and_install(|_, _| {}, || {}).await?;
        
        // Reiniciar para aplicar la actualización
        println!("Update installed, restarting...");
        app_handle.restart();
    }
    
    Ok(())
}
