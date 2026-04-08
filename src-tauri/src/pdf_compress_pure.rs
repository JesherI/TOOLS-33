use std::process::Command;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressionResult {
    pub success: bool,
    pub original_size: u64,
    pub compressed_size: Option<u64>,
    pub compression_ratio: Option<String>,
    pub error: Option<String>,
    pub method: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum CompressionLevel {
    Light,   // /screen - 72dpi
    Medium,  // /ebook - 150dpi
    High,    // /printer - 300dpi
}

impl CompressionLevel {
    fn to_gs_param(&self) -> &'static str {
        match self {
            CompressionLevel::Light => "/screen",
            CompressionLevel::Medium => "/ebook",
            CompressionLevel::High => "/printer",
        }
    }
}

fn get_temp_path(filename: &str) -> PathBuf {
    let mut path = std::env::temp_dir();
    path.push(filename);
    path
}

fn find_ghostscript() -> Option<String> {
    // 1. Primero buscar en PATH
    let commands = vec!["gswin64c", "gswin32c", "gs"];
    
    for cmd in &commands {
        if let Ok(output) = Command::new(cmd).arg("--version").output() {
            if output.status.success() {
                println!("[Ghostscript] Encontrado en PATH: {}", cmd);
                return Some(cmd.to_string());
            }
        }
    }
    
    // 2. Buscar en ubicaciones comunes de instalación
    let common_paths = vec![
        r"C:\Program Files\gs\gs10.04.0\bin\gswin64c.exe",
        r"C:\Program Files\gs\gs10.03.1\bin\gswin64c.exe",
        r"C:\Program Files\gs\gs10.02.1\bin\gswin64c.exe",
        r"C:\Program Files\gs\gs10.01.2\bin\gswin64c.exe",
        r"C:\Program Files\gs\gs10.00.0\bin\gswin64c.exe",
        r"C:\Program Files (x86)\gs\gs10.04.0\bin\gswin32c.exe",
        r"C:\Program Files (x86)\gs\gs10.03.1\bin\gswin32c.exe",
        r"C:\Program Files (x86)\gs\gs10.02.1\bin\gswin32c.exe",
        r"C:\Program Files (x86)\gs\gs10.01.2\bin\gswin32c.exe",
        r"C:\Program Files (x86)\gs\gs10.00.0\bin\gswin32c.exe",
    ];
    
    for path in &common_paths {
        if std::path::Path::new(path).exists() {
            // Verificar que funciona
            if let Ok(output) = Command::new(path).arg("--version").output() {
                if output.status.success() {
                    println!("[Ghostscript] Encontrado en: {}", path);
                    return Some(path.to_string());
                }
            }
        }
    }
    
    // 3. Buscar dinámicamente en C:\Program Files\gs
    if let Ok(entries) = std::fs::read_dir(r"C:\Program Files\gs") {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let gs_exe = path.join("bin").join("gswin64c.exe");
                if gs_exe.exists() {
                    if let Ok(output) = Command::new(&gs_exe).arg("--version").output() {
                        if output.status.success() {
                            println!("[Ghostscript] Encontrado dinámicamente: {:?}", gs_exe);
                            return Some(gs_exe.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }
    
    // 4. También buscar en Program Files (x86)
    if let Ok(entries) = std::fs::read_dir(r"C:\Program Files (x86)\gs") {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let gs_exe = path.join("bin").join("gswin32c.exe");
                if gs_exe.exists() {
                    if let Ok(output) = Command::new(&gs_exe).arg("--version").output() {
                        if output.status.success() {
                            println!("[Ghostscript] Encontrado dinámicamente (x86): {:?}", gs_exe);
                            return Some(gs_exe.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }
    
    println!("[Ghostscript] No encontrado en ninguna ubicación");
    None
}

#[tauri::command]
pub async fn compress_pdf_rust(
    input_path: String,
    output_path: String,
    level: CompressionLevel,
) -> Result<CompressionResult, String> {
    let input_full = get_temp_path(&input_path);
    let output_full = get_temp_path(&output_path);
    
    let original_size = match std::fs::metadata(&input_full) {
        Ok(m) => m.len(),
        Err(e) => {
            return Ok(CompressionResult {
                success: false,
                original_size: 0,
                compressed_size: None,
                compression_ratio: None,
                error: Some(format!("No se puede leer archivo: {}", e)),
                method: "none".to_string(),
            });
        }
    };
    
    // Intentar Ghostscript primero
    if let Some(gs_cmd) = find_ghostscript() {
        match compress_with_ghostscript(&input_full, &output_full, &gs_cmd, &level) {
            Ok(result) => return Ok(result),
            Err(_) => {}
        }
    }
    
    // Fallback a básico
    compress_basic(&input_full, &output_full, original_size)
}

fn compress_with_ghostscript(
    input: &PathBuf,
    output: &PathBuf,
    gs_cmd: &str,
    level: &CompressionLevel,
) -> Result<CompressionResult, String> {
    let pdf_settings = format!("-dPDFSETTINGS={}", level.to_gs_param());
    let output_file = format!("-sOutputFile={}", output.to_string_lossy());
    let input_file = input.to_string_lossy().to_string();
    
    let args = vec![
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        &pdf_settings,
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        "-dDetectDuplicateImages=true",
        "-dCompressFonts=true",
        "-dOptimize=true",
        &output_file,
        &input_file,
    ];
    
    let result = Command::new(gs_cmd)
        .args(&args)
        .output();
    
    match result {
        Ok(cmd_output) => {
            if cmd_output.status.success() {
                let original_size = std::fs::metadata(input).map(|m| m.len()).unwrap_or(0);
                let compressed_size = std::fs::metadata(output).map(|m| m.len()).unwrap_or(0);
                
                let ratio = if compressed_size > 0 && compressed_size < original_size {
                    let reduction = (1.0 - (compressed_size as f64 / original_size as f64)) * 100.0;
                    format!("{:.1}%", reduction)
                } else {
                    "0%".to_string()
                };
                
                Ok(CompressionResult {
                    success: true,
                    original_size,
                    compressed_size: Some(compressed_size),
                    compression_ratio: Some(ratio),
                    error: None,
                    method: "ghostscript".to_string(),
                })
            } else {
                Err("Ghostscript failed".to_string())
            }
        }
        Err(_) => Err("Error ejecutando Ghostscript".to_string()),
    }
}

fn compress_basic(
    input: &PathBuf,
    output: &PathBuf,
    original_size: u64,
) -> Result<CompressionResult, String> {
    use lopdf::Document;
    
    let mut doc = Document::load(input)
        .map_err(|e| format!("Error cargando PDF: {}", e))?;
    
    // Eliminar metadatos
    if let Ok(trailer) = doc.trailer.get_mut(b"Info") {
        if let Ok(dict) = trailer.as_dict_mut() {
            dict.remove(b"Producer");
            dict.remove(b"Creator");
            dict.remove(b"Author");
            dict.remove(b"Title");
            dict.remove(b"Subject");
            dict.remove(b"Keywords");
        }
    }
    
    doc.renumber_objects();
    doc.delete_zero_length_streams();
    
    doc.save(output)
        .map_err(|e| format!("Error guardando: {}", e))?;
    
    let compressed_size = std::fs::metadata(output)
        .map(|m| m.len())
        .unwrap_or(0);
    
    let ratio = if compressed_size > 0 && compressed_size < original_size {
        let reduction = (1.0 - (compressed_size as f64 / original_size as f64)) * 100.0;
        format!("{:.1}%", reduction)
    } else {
        "0%".to_string()
    };
    
    Ok(CompressionResult {
        success: true,
        original_size,
        compressed_size: Some(compressed_size),
        compression_ratio: Some(ratio),
        error: None,
        method: "basic".to_string(),
    })
}

#[tauri::command]
pub async fn check_compression_available() -> bool {
    find_ghostscript().is_some()
}

#[tauri::command]
pub async fn get_compression_method() -> String {
    if find_ghostscript().is_some() {
        "ghostscript".to_string()
    } else {
        "basic".to_string()
    }
}

#[tauri::command]
pub async fn debug_ghostscript() -> serde_json::Value {
    use serde_json::json;
    
    let mut checked_paths = vec![];
    let mut found_path: Option<String> = None;
    
    // Verificar comandos en PATH
    let commands = vec!["gswin64c", "gswin32c", "gs"];
    for cmd in &commands {
        let result = if let Ok(output) = Command::new(cmd).arg("--version").output() {
            if output.status.success() {
                found_path = Some(format!("{} (PATH)", cmd));
                "✓ Encontrado"
            } else {
                "✗ En PATH pero no responde"
            }
        } else {
            "✗ No en PATH"
        };
        checked_paths.push(json!({
            "path": cmd,
            "result": result
        }));
    }
    
    // Verificar rutas comunes
    let common_paths = vec![
        r"C:\Program Files\gs\gs10.04.0\bin\gswin64c.exe",
        r"C:\Program Files\gs\gs10.03.1\bin\gswin64c.exe",
        r"C:\Program Files\gs\gs10.02.1\bin\gswin64c.exe",
        r"C:\Program Files\gs\gs10.01.2\bin\gswin64c.exe",
        r"C:\Program Files\gs\gs10.00.0\bin\gswin64c.exe",
        r"C:\Program Files (x86)\gs\gs10.04.0\bin\gswin32c.exe",
        r"C:\Program Files (x86)\gs\gs10.03.1\bin\gswin32c.exe",
    ];
    
    for path in &common_paths {
        let result = if std::path::Path::new(path).exists() {
            if let Ok(output) = Command::new(path).arg("--version").output() {
                if output.status.success() {
                    if found_path.is_none() {
                        found_path = Some(path.to_string());
                    }
                    "✓ Encontrado y funciona"
                } else {
                    "✗ Existe pero no responde"
                }
            } else {
                "✗ Existe pero no ejecutable"
            }
        } else {
            "✗ No existe"
        };
        checked_paths.push(json!({
            "path": path,
            "result": result
        }));
    }
    
    // Verificar directorios dinámicamente
    let mut dynamic_found = vec![];
    if let Ok(entries) = std::fs::read_dir(r"C:\Program Files\gs") {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let gs_exe = path.join("bin").join("gswin64c.exe");
                dynamic_found.push(gs_exe.to_string_lossy().to_string());
            }
        }
    }
    
    json!({
        "found": found_path.is_some(),
        "found_path": found_path,
        "checked_paths": checked_paths,
        "dynamic_dirs_found": dynamic_found,
        "recommendation": if found_path.is_none() {
            "Ghostscript no detectado. Reinicia TOOLS 33 después de instalar, o verifica que se instaló en C:\\Program Files\\gs"
        } else {
            "Ghostscript detectado correctamente"
        }
    })
}

#[tauri::command]
pub async fn install_ghostscript(app_handle: tauri::AppHandle) -> Result<bool, String> {
    // Verificar si ya está instalado
    if find_ghostscript().is_some() {
        return Ok(true);
    }
    
    // Intentar encontrar el script en múltiples ubicaciones
    let current_dir = std::env::current_dir().ok();
    println!("[Ghostscript] Current dir: {:?}", current_dir);
    
    let resource_path = app_handle
        .path()
        .resolve("scripts/install-ghostscript.ps1", tauri::path::BaseDirectory::Resource)
        .ok();
    println!("[Ghostscript] Resource path: {:?}", resource_path);
    
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()));
    println!("[Ghostscript] Exe dir: {:?}", exe_dir);
    
    let possible_paths: Vec<Option<PathBuf>> = vec![
        // En desarrollo: relativo al directorio del proyecto
        current_dir.clone().map(|d| d.join("scripts").join("install-ghostscript.ps1")),
        // Parent del current dir (por si estamos en src-tauri)
        current_dir.clone().and_then(|d| d.parent().map(|p| p.join("scripts").join("install-ghostscript.ps1"))),
        // En producción: recurso empaquetado
        resource_path,
        // Al lado del ejecutable
        exe_dir.map(|d| d.join("scripts").join("install-ghostscript.ps1")),
    ];
    
    let script_path: Option<PathBuf> = possible_paths
        .into_iter()
        .flatten()
        .find(|p: &PathBuf| p.exists());
    
    let script_path = match script_path {
        Some(p) => p,
        None => return Err("Script de instalación no encontrado. Descarga Ghostscript manualmente de ghostscript.com".to_string()),
    };
    
    println!("[Ghostscript] Ejecutando script: {:?}", script_path);
    
    // Verificar que el script existe
    if !script_path.exists() {
        return Err(format!("Script no encontrado en: {:?}", script_path));
    }
    
    // En Windows, ejecutar con ventana visible para permitir UAC
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NEW_CONSOLE: u32 = 0x00000010;
        
        // Ejecutar PowerShell en una nueva ventana visible
        // Esto permite que el UAC se muestre si el usuario tiene permisos
        let mut cmd = Command::new("powershell.exe");
        cmd.args(&[
            "-ExecutionPolicy", "Bypass",
            "-File", &script_path.to_string_lossy(),
            "-Silent"
        ])
        .creation_flags(CREATE_NEW_CONSOLE);
        
        let mut child = cmd.spawn()
            .map_err(|e| format!("No se pudo iniciar PowerShell: {}", e))?;
        
        // Esperar a que termine
        let status = child.wait()
            .map_err(|e| format!("Error esperando PowerShell: {}", e))?;
        
        println!("[Ghostscript] Exit code: {:?}", status.code());
        
        // Verificar si se instaló correctamente
        if find_ghostscript().is_some() {
            println!("[Ghostscript] Instalación exitosa verificada");
            return Ok(true);
        }
        
        // Si no se detectó, verificar el código de salida
        match status.code() {
            Some(0) => {
                // Éxito pero no detectado - necesita reinicio
                return Ok(true);
            }
            Some(2) => {
                // Código 2 = sin permisos de administrador
                return Err("Se requieren permisos de administrador. Ejecuta TOOLS 33 como administrador (clic derecho > Ejecutar como administrador) o instala Ghostscript manualmente desde ghostscript.com".to_string());
            }
            Some(3) => {
                // Código 3 = instalación posible pero no verificada
                return Ok(true);
            }
            Some(code) => {
                return Err(format!("La instalación falló con código {}. Intenta instalar manualmente desde ghostscript.com", code));
            }
            None => {
                return Err("El proceso de instalación fue interrumpido".to_string());
            }
        }
    }
    
    #[cfg(not(windows))]
    {
        // Para sistemas no-Windows (Linux/Mac)
        let output = Command::new("powershell")
            .args(&[
                "-ExecutionPolicy", "Bypass",
                "-File", &script_path.to_string_lossy(),
                "-Silent"
            ])
            .output()
            .map_err(|e| format!("Error ejecutando PowerShell: {}", e))?;
        
        if output.status.success() {
            Ok(true)
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("Error: {}", stderr))
        }
    }
}
