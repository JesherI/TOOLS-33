mod pdf_compress_pure;

use pdf_compress_pure::compress_pdf_rust;
use tauri_plugin_updater::UpdaterExt;
use sysinfo::{System, RefreshKind, CpuRefreshKind, MemoryRefreshKind};
use std::process::Command;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

// Windows-specific imports for hiding console windows
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

// CREATE_NO_WINDOW flag to prevent console window from appearing
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Clean ANSI escape codes from text output
#[allow(dead_code)]
fn clean_ansi_codes(text: &str) -> String {
    // Remove ANSI escape sequences (e.g., [1G, [18A, [40C, etc.)
    // This regex matches escape sequences that start with ESC[ or just [
    let cleaned = text
        .replace("\x1B[", "[")  // Normalize escape sequences
        .replace('\x1B', "");   // Remove ESC character
    
    // Remove bracketed escape sequences like [1G, [18A, [40C, [0m, etc.
    let mut result = String::new();
    let mut chars = cleaned.chars().peekable();
    
    while let Some(ch) = chars.next() {
        if ch == '[' {
            // Check if this is an escape sequence (followed by numbers and a letter)
            let mut is_escape = false;
            let mut temp = String::new();
            temp.push(ch);
            
            while let Some(&next_ch) = chars.peek() {
                if next_ch.is_ascii_digit() || next_ch == ';' || next_ch == '?' {
                    temp.push(next_ch);
                    chars.next();
                } else if next_ch.is_ascii_alphabetic() || next_ch == '@' || next_ch == 'G' || next_ch == 'A' || next_ch == 'C' || next_ch == 'D' || next_ch == 'H' || next_ch == 'J' || next_ch == 'K' || next_ch == 'm' {
                    // This is the end of an escape sequence
                    temp.push(next_ch);
                    chars.next();
                    is_escape = true;
                    break;
                } else {
                    break;
                }
            }
            
            if !is_escape {
                result.push_str(&temp);
            }
        } else {
            result.push(ch);
        }
    }
    
    result.trim().to_string()
}

#[derive(serde::Serialize, Clone)]
struct SystemInfo {
    os_name: String,
    os_version: String,
    cpu: String,
    cpu_cores: usize,
    cpu_threads: usize,
    cpu_freq: String,
    ram_gb: String,
    ram_used: String,
    ram_percent: u8,
    gpu: String,
    gpu_memory: String,
    hostname: String,
    architecture: String,
    disk_total: String,
    disk_used: String,
    disk_percent: u8,
    uptime: String,
}

// Estructura para cachear información estática del sistema
struct SystemCache {
    static_info: Option<StaticSystemInfo>,
    last_update: u64,
}

#[derive(Clone)]
#[allow(dead_code)]
struct StaticSystemInfo {
    os_name: String,
    os_version: String,
    cpu: String,
    cpu_cores: usize,
    cpu_threads: usize,
    cpu_freq: String,
    #[allow(dead_code)]
    ram_gb: String,
    gpu: String,
    gpu_memory: String,
    hostname: String,
    architecture: String,
    #[allow(dead_code)]
    disk_total: String,
}

// Cache global thread-safe (válida por 60 segundos)
static SYSTEM_CACHE: Mutex<SystemCache> = Mutex::new(SystemCache {
    static_info: None,
    last_update: 0,
});

const CACHE_TTL_SECONDS: u64 = 60;

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
            get_system_info,
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

#[allow(dead_code)]
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

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
    // Obtener información dinámica (siempre actualizada)
    let mut sys = System::new_with_specifics(
        RefreshKind::new()
            .with_cpu(CpuRefreshKind::new())
            .with_memory(MemoryRefreshKind::everything())
    );
    sys.refresh_memory();
    
    // Información de RAM (dinámica)
    let total_ram = sys.total_memory();
    let used_ram = sys.used_memory();
    let ram_gb = format!("{:.0} GB", total_ram as f64 / 1024.0);
    let ram_used = format!("{:.0} GB", used_ram as f64 / 1024.0);
    let ram_percent = if total_ram > 0 {
        ((used_ram as f64 / total_ram as f64) * 100.0) as u8
    } else {
        0
    };
    
    // Información de disco (dinámica)
    let (disk_total, disk_used, disk_percent) = get_disk_info_fast();
    
    // Uptime (dinámico)
    let uptime = System::uptime();
    let uptime_str = format_uptime(uptime);
    
    // Verificar caché de información estática
    let cache = SYSTEM_CACHE.lock().unwrap();
    
    if cache.static_info.is_some() && (now - cache.last_update) < CACHE_TTL_SECONDS {
        // Usar caché
        let static_info = cache.static_info.as_ref().unwrap();
        return SystemInfo {
            os_name: static_info.os_name.clone(),
            os_version: static_info.os_version.clone(),
            cpu: static_info.cpu.clone(),
            cpu_cores: static_info.cpu_cores,
            cpu_threads: static_info.cpu_threads,
            cpu_freq: static_info.cpu_freq.clone(),
            ram_gb,
            ram_used,
            ram_percent,
            gpu: static_info.gpu.clone(),
            gpu_memory: static_info.gpu_memory.clone(),
            hostname: static_info.hostname.clone(),
            architecture: static_info.architecture.clone(),
            disk_total,
            disk_used,
            disk_percent,
            uptime: uptime_str,
        };
    }
    
    // Obtener información estática (solo cuando expira la caché)
    drop(cache); // Liberar el lock mientras hacemos operaciones lentas
    
    // Información básica del sistema
    let os_name = System::name().unwrap_or_else(|| "Unknown".to_string());
    let os_version = System::os_version().unwrap_or_else(|| "Unknown".to_string());
    let hostname = System::host_name().unwrap_or_else(|| "Unknown".to_string());
    let architecture = std::env::consts::ARCH.to_string();
    
    // Información de CPU (refrescar una sola vez)
    sys.refresh_cpu();
    let cpu = sys.cpus().first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_else(|| "Unknown CPU".to_string());
    
    let cpu_cores = sys.physical_core_count().unwrap_or(0);
    let cpu_threads = sys.cpus().len();
    
    let cpu_freq = sys.cpus().first()
        .map(|cpu| format!("{:.2} GHz", cpu.frequency() as f64 / 1000.0))
        .unwrap_or_else(|| "Unknown".to_string());
    
    // Información de GPU (obtener una sola vez)
    let (gpu, gpu_memory) = get_gpu_info_fast();
    
    // Guardar en caché
    let static_info = StaticSystemInfo {
        os_name: os_name.clone(),
        os_version: os_version.clone(),
        cpu: cpu.clone(),
        cpu_cores,
        cpu_threads,
        cpu_freq: cpu_freq.clone(),
        ram_gb: ram_gb.clone(),
        gpu: gpu.clone(),
        gpu_memory: gpu_memory.clone(),
        hostname: hostname.clone(),
        architecture: architecture.clone(),
        disk_total: disk_total.clone(),
    };
    
    let mut cache = SYSTEM_CACHE.lock().unwrap();
    cache.static_info = Some(static_info);
    cache.last_update = now;
    
    SystemInfo {
        os_name,
        os_version,
        cpu,
        cpu_cores,
        cpu_threads,
        cpu_freq,
        ram_gb,
        ram_used,
        ram_percent,
        gpu,
        gpu_memory,
        hostname,
        architecture,
        disk_total,
        disk_used,
        disk_percent,
        uptime: uptime_str,
    }
}

#[allow(dead_code)]
fn get_gpu_info() -> (String, String) {
    // Intentar obtener GPU usando PowerShell (más confiable en Windows 11)
    // -NoProfile: Evita cargar el perfil del usuario (que puede tener neofetch u otros scripts)
    // Obtiene TODAS las GPUs y selecciona la mejor (dedicada > integrada)
    let ps_cmd = r#"$PSStyle.OutputRendering = 'PlainText'; Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM | ForEach-Object { $_.Name + "|" + $_.AdapterRAM }"#;

    let mut cmd = Command::new("powershell");
    cmd.args(&["-NoProfile", "-Command", ps_cmd]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output();

    match output {
        Ok(output) => {
            let text = clean_ansi_codes(&String::from_utf8_lossy(&output.stdout));
            
            if text.is_empty() || text.to_lowercase().contains("error") {
                // Fallback a wmic
                return get_gpu_info_wmic();
            }
            
            // Parsear todas las GPUs encontradas
            let gpus: Vec<(String, u64)> = text
                .lines()
                .filter(|line| line.contains('|'))
                .filter_map(|line| {
                    let parts: Vec<&str> = line.split('|').collect();
                    if parts.len() >= 2 {
                        let name = parts[0]
                            .replace("(R)", "")
                            .replace("(TM)", "")
                            .replace("  ", " ")
                            .trim()
                            .to_string();
                        let memory = parts[1].trim().parse::<u64>().unwrap_or(0);
                        Some((name, memory))
                    } else {
                        None
                    }
                })
                .collect();
            
            if let Some((name, memory_bytes)) = select_best_gpu(gpus) {
                let memory = format_gpu_memory(memory_bytes);
                return (name, memory);
            }
            
            get_gpu_info_wmic()
        }
        Err(_) => get_gpu_info_wmic(),
    }
}

/// Selecciona la mejor GPU de la lista (prioriza dedicadas sobre integradas)
#[allow(dead_code)]
fn select_best_gpu(gpus: Vec<(String, u64)>) -> Option<(String, u64)> {
    if gpus.is_empty() {
        return None;
    }
    
    // Palabras clave para detectar GPUs dedicadas vs integradas
    let dedicated_keywords = ["nvidia", "amd", "radeon", "geforce", "rtx", "gtx"];
    let integrated_keywords = ["intel", "uhd", "iris", "hd graphics"];
    
    // Primero buscar GPUs dedicadas
    let dedicated: Vec<_> = gpus.iter()
        .filter(|(name, _)| {
            let name_lower = name.to_lowercase();
            dedicated_keywords.iter().any(|&kw| name_lower.contains(kw))
        })
        .collect();
    
    if !dedicated.is_empty() {
        // Devolver la dedicada con más memoria
        return dedicated.into_iter()
            .max_by_key(|(_, mem)| *mem)
            .map(|(name, mem)| (name.clone(), *mem));
    }
    
    // Si no hay dedicada, buscar integradas
    let integrated: Vec<_> = gpus.iter()
        .filter(|(name, _)| {
            let name_lower = name.to_lowercase();
            integrated_keywords.iter().any(|&kw| name_lower.contains(kw))
        })
        .collect();
    
    if !integrated.is_empty() {
        return integrated.into_iter()
            .max_by_key(|(_, mem)| *mem)
            .map(|(name, mem)| (name.clone(), *mem));
    }
    
    // Si no coincide con ninguna categoría, devolver la primera
    gpus.into_iter().next()
}

/// Formatea los bytes de memoria GPU a string legible
#[allow(dead_code)]
fn format_gpu_memory(bytes: u64) -> String {
    if bytes > 0 {
        if bytes > 1024 * 1024 * 1024 {
            format!("{:.1} GB", bytes as f64 / 1024.0 / 1024.0 / 1024.0)
        } else {
            format!("{:.0} MB", bytes as f64 / 1024.0 / 1024.0)
        }
    } else {
        "Shared Memory".to_string()
    }
}

#[allow(dead_code)]
fn get_gpu_info_wmic() -> (String, String) {
    // Fallback usando wmic - obtiene todas las GPUs
    let mut cmd = Command::new("wmic");
    cmd.args(&["path", "win32_VideoController", "get", "Name,AdapterRAM", "/format:csv"]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output();
    
    match output {
        Ok(output) => {
            let text = String::from_utf8_lossy(&output.stdout);
            
            // Parsear salida CSV de WMIC
            // Formato: Node,Name,AdapterRAM
            let gpus: Vec<(String, u64)> = text
                .lines()
                .skip(1) // Skip header
                .filter(|line| !line.trim().is_empty())
                .filter_map(|line| {
                    let parts: Vec<&str> = line.split(',').collect();
                    if parts.len() >= 3 {
                        let name = parts[1]
                            .replace("(R)", "")
                            .replace("(TM)", "")
                            .replace("  ", " ")
                            .trim()
                            .to_string();
                        let memory = parts[2].trim().parse::<u64>().unwrap_or(0);
                        if !name.is_empty() && name != "Name" {
                            Some((name, memory))
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                })
                .collect();
            
            if let Some((name, memory_bytes)) = select_best_gpu(gpus) {
                let memory = format_gpu_memory(memory_bytes);
                return (name, memory);
            }
            
            ("Graphics Adapter".to_string(), "Unknown".to_string())
        }
        Err(_) => ("Graphics Adapter".to_string(), "Unknown".to_string()),
    }
}

#[allow(dead_code)]
fn get_disk_info() -> (String, String, u8) {
    // Usar PowerShell para obtener información del disco del sistema (donde está Windows)
    // -NoProfile: Evita cargar el perfil del usuario
    // Simplificado para obtener directamente los valores numéricos
    let ps_cmd = r#"$PSStyle.OutputRendering = 'PlainText'; $sysDrive = $env:SystemDrive; $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$sysDrive'"; if ($disk -and $disk.Size) { "$($disk.Size),$($disk.FreeSpace)" } else { "" }"#;

    let mut cmd = Command::new("powershell");
    cmd.args(&["-NoProfile", "-Command", ps_cmd]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output();

    match output {
        Ok(output) => {
            let text = clean_ansi_codes(&String::from_utf8_lossy(&output.stdout));
            let text = text.trim();
            
            // Log para debugging
            eprintln!("Disk info PowerShell output: '{}'", text);
            
            if text.is_empty() || text.to_lowercase().contains("error") || !text.contains(',') {
                eprintln!("Falling back to wmic for disk info");
                return get_disk_info_wmic();
            }
            
            let parts: Vec<&str> = text.split(',').collect();
            if parts.len() >= 2 {
                let total_str = parts[0].trim();
                let free_str = parts[1].trim();
                
                eprintln!("Total: '{}', Free: '{}'", total_str, free_str);
                
                let total = total_str.parse::<u64>().unwrap_or(0);
                let free = free_str.parse::<u64>().unwrap_or(0);
                let used = total.saturating_sub(free);
                
                eprintln!("Parsed - Total: {} bytes, Free: {} bytes, Used: {} bytes", total, free, used);
                
                if total > 0 {
                    let percent = ((used as f64 / total as f64) * 100.0) as u8;
                    
                    return (
                        format!("{:.0} GB", total as f64 / 1024.0 / 1024.0 / 1024.0),
                        format!("{:.0} GB", used as f64 / 1024.0 / 1024.0 / 1024.0),
                        percent
                    );
                }
            }
            
            get_disk_info_wmic()
        }
        Err(e) => {
            eprintln!("Error executing PowerShell for disk info: {:?}", e);
            get_disk_info_wmic()
        }
    }
}

#[allow(dead_code)]
fn get_disk_info_wmic() -> (String, String, u8) {
    // Fallback usando PowerShell para obtener el disco del sistema primero, luego wmic
    let sys_drive = std::env::var("SystemDrive").unwrap_or_else(|_| "C:".to_string());
    let drive_letter = sys_drive.trim_end_matches(':');
    
    eprintln!("System drive detected: {}", sys_drive);
    
    // Fallback usando wmic con el disco del sistema
    let mut cmd = Command::new("wmic");
    cmd.args(&["logicaldisk", "where", &format!("DeviceID='{}:'", drive_letter), "get", "Size,FreeSpace", "/value"]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output();
    
    match output {
        Ok(output) => {
            let text = String::from_utf8_lossy(&output.stdout);
            eprintln!("WMIC disk output: '{}'", text);
            
            // Si wmic falla, intentar con PowerShell como último recurso
            if text.trim().is_empty() || !text.contains("Size=") {
                eprintln!("WMIC returned empty or invalid, trying PowerShell alternative");
                return get_disk_info_ps_fallback();
            }
            
            let total = text.lines()
                .find(|line| line.starts_with("Size="))
                .and_then(|line| {
                    let val = line.replace("Size=", "").trim().to_string();
                    eprintln!("Found Size line: '{}'", val);
                    val.parse::<u64>().ok()
                })
                .unwrap_or(0);
            
            let free = text.lines()
                .find(|line| line.starts_with("FreeSpace="))
                .and_then(|line| {
                    let val = line.replace("FreeSpace=", "").trim().to_string();
                    eprintln!("Found FreeSpace line: '{}'", val);
                    val.parse::<u64>().ok()
                })
                .unwrap_or(0);
            
            eprintln!("WMIC - Total: {}, Free: {}", total, free);
            
            let used = total.saturating_sub(free);
            let percent = if total > 0 {
                ((used as f64 / total as f64) * 100.0) as u8
            } else {
                0
            };
            
            (
                format!("{:.0} GB", total as f64 / 1024.0 / 1024.0 / 1024.0),
                format!("{:.0} GB", used as f64 / 1024.0 / 1024.0 / 1024.0),
                percent
            )
        }
        Err(e) => {
            eprintln!("Error executing WMIC for disk info: {:?}", e);
            get_disk_info_ps_fallback()
        }
    }
}

#[allow(dead_code)]
fn get_disk_info_ps_fallback() -> (String, String, u8) {
    // Último recurso: obtener información de disco usando Get-Volume (más moderno)
    let ps_cmd = r#"$PSStyle.OutputRendering = 'PlainText'; $vol = Get-Volume -DriveLetter $env:SystemDrive[0]; if ($vol -and $vol.Size) { "$($vol.Size),$($vol.SizeRemaining)" } else { "" }"#;
    
    let mut cmd = Command::new("powershell");
    cmd.args(&["-NoProfile", "-Command", ps_cmd]);
    
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    
    match cmd.output() {
        Ok(output) => {
            let text = clean_ansi_codes(&String::from_utf8_lossy(&output.stdout));
            let text = text.trim();
            eprintln!("PS Fallback disk output: '{}'", text);
            
            if text.contains(',') {
                let parts: Vec<&str> = text.split(',').collect();
                if parts.len() >= 2 {
                    let total = parts[0].trim().parse::<u64>().unwrap_or(0);
                    let free = parts[1].trim().parse::<u64>().unwrap_or(0);
                    let used = total.saturating_sub(free);
                    
                    if total > 0 {
                        let percent = ((used as f64 / total as f64) * 100.0) as u8;
                        return (
                            format!("{:.0} GB", total as f64 / 1024.0 / 1024.0 / 1024.0),
                            format!("{:.0} GB", used as f64 / 1024.0 / 1024.0 / 1024.0),
                            percent
                        );
                    }
                }
            }
            ("Unknown".to_string(), "Unknown".to_string(), 0)
        }
        Err(e) => {
            eprintln!("Error in PS fallback: {:?}", e);
            ("Unknown".to_string(), "Unknown".to_string(), 0)
        }
    }
}

// Versión optimizada para obtener info de GPU (sin fallbacks múltiples)
fn get_gpu_info_fast() -> (String, String) {
    // Comando simplificado para obtener solo la GPU principal
    let ps_cmd = r#"Get-CimInstance Win32_VideoController | Select-Object -First 1 Name, AdapterRAM | ForEach-Object { "$($_.Name)|$($_.AdapterRAM)" }"#;

    let mut cmd = Command::new("powershell");
    cmd.args(&["-NoProfile", "-Command", ps_cmd]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.output() {
        Ok(output) => {
            let text = String::from_utf8_lossy(&output.stdout);
            if let Some(line) = text.lines().next() {
                let parts: Vec<&str> = line.split('|').collect();
                if parts.len() >= 2 {
                    let name = parts[0]
                        .replace("(R)", "")
                        .replace("(TM)", "")
                        .replace("  ", " ")
                        .trim()
                        .to_string();
                    
                    let memory_bytes = parts[1].trim().parse::<u64>().unwrap_or(0);
                    let memory = if memory_bytes > 1024 * 1024 * 1024 {
                        format!("{:.1} GB", memory_bytes as f64 / 1024.0 / 1024.0 / 1024.0)
                    } else if memory_bytes > 0 {
                        format!("{:.0} MB", memory_bytes as f64 / 1024.0 / 1024.0)
                    } else {
                        "Shared Memory".to_string()
                    };
                    
                    return (name, memory);
                }
            }
            ("Graphics Adapter".to_string(), "Unknown".to_string())
        }
        Err(_) => ("Graphics Adapter".to_string(), "Unknown".to_string()),
    }
}

// Versión optimizada para obtener info de disco (sin múltiples fallbacks)
fn get_disk_info_fast() -> (String, String, u8) {
    let ps_cmd = r#"$d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$env:SystemDrive'" | Select-Object Size, FreeSpace; "$($d.Size),$($d.FreeSpace)""#;

    let mut cmd = Command::new("powershell");
    cmd.args(&["-NoProfile", "-Command", ps_cmd]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.output() {
        Ok(output) => {
            let text = String::from_utf8_lossy(&output.stdout);
            let parts: Vec<&str> = text.trim().split(',').collect();
            
            if parts.len() >= 2 {
                if let (Ok(total), Ok(free)) = (parts[0].trim().parse::<u64>(), parts[1].trim().parse::<u64>()) {
                    let used = total.saturating_sub(free);
                    let percent = if total > 0 {
                        ((used as f64 / total as f64) * 100.0) as u8
                    } else {
                        0
                    };
                    
                    return (
                        format!("{:.0} GB", total as f64 / 1024.0 / 1024.0 / 1024.0),
                        format!("{:.0} GB", used as f64 / 1024.0 / 1024.0 / 1024.0),
                        percent
                    );
                }
            }
            ("Unknown".to_string(), "Unknown".to_string(), 0)
        }
        Err(_) => ("Unknown".to_string(), "Unknown".to_string(), 0),
    }
}

fn format_uptime(seconds: u64) -> String {
    let days = seconds / 86400;
    let hours = (seconds % 86400) / 3600;
    let minutes = (seconds % 3600) / 60;
    
    if days > 0 {
        format!("{}d {}h {}m", days, hours, minutes)
    } else if hours > 0 {
        format!("{}h {}m", hours, minutes)
    } else {
        format!("{}m", minutes)
    }
}
