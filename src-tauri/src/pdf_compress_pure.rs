use std::process::{Command, Stdio};
use std::path::PathBuf;
use serde::{Deserialize, Serialize};

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
    // Ghostscript se instala automáticamente con TOOLS 33
    // Solo necesitamos encontrar la ruta correcta
    
    // Helper para ejecutar comando silenciosamente
    #[cfg(windows)]
    fn run_silent(cmd: &str, args: &[&str]) -> Option<std::process::Output> {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        Command::new(cmd)
            .args(args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .ok()
    }
    
    #[cfg(not(windows))]
    fn run_silent(cmd: &str, args: &[&str]) -> Option<std::process::Output> {
        Command::new(cmd)
            .args(args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .output()
            .ok()
    }
    
    // 1. Buscar en ubicaciones estándar (Ghostscript se instala en C:\Program Files\gs por defecto)
    if let Ok(entries) = std::fs::read_dir(r"C:\Program Files\gs") {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let gs_exe = path.join("bin").join("gswin64c.exe");
                if gs_exe.exists() {
                    if let Some(output) = run_silent(&gs_exe.to_string_lossy(), &["--version"]) {
                        if output.status.success() {
                            return Some(gs_exe.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }
    
    // 2. También buscar en x86
    if let Ok(entries) = std::fs::read_dir(r"C:\Program Files (x86)\gs") {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let gs_exe = path.join("bin").join("gswin32c.exe");
                if gs_exe.exists() {
                    if let Some(output) = run_silent(&gs_exe.to_string_lossy(), &["--version"]) {
                        if output.status.success() {
                            return Some(gs_exe.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }
    
    // 3. Buscar en PATH (por si se instaló manualmente antes)
    let commands = vec!["gswin64c", "gswin32c", "gs"];
    for cmd in &commands {
        if let Some(output) = run_silent(cmd, &["--version"]) {
            if output.status.success() {
                return Some(cmd.to_string());
            }
        }
    }
    
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
    
    // Configurar comando para que sea completamente silencioso (sin ventanas)
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let result = Command::new(gs_cmd)
            .args(&args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .creation_flags(CREATE_NO_WINDOW)
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
    
    #[cfg(not(windows))]
    {
        let result = Command::new(gs_cmd)
            .args(&args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
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
