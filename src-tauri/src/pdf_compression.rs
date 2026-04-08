use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;
use tokio::fs;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressionResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub original_size: u64,
    pub compressed_size: Option<u64>,
    pub compression_ratio: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CompressionLevel {
    Light,   // /screen - 72dpi
    Medium,  // /ebook - 150dpi  
    High,    // /printer - 300dpi
}

impl CompressionLevel {
    fn to_gs_setting(&self) -> &'static str {
        match self {
            CompressionLevel::Light => "/screen",   // 72dpi, comprime imágenes agresivamente
            CompressionLevel::Medium => "/ebook",   // 150dpi, buen balance
            CompressionLevel::High => "/prepress",  // 300dpi, alta calidad pero optimizado
        }
    }
}

/// Comprime un PDF usando Ghostscript
#[tauri::command]
pub async fn compress_pdf(
    input_path: String,
    output_path: String,
    level: CompressionLevel,
) -> Result<CompressionResult, String> {
    // Verificar que el archivo existe
    let input = PathBuf::from(&input_path);
    if !input.exists() {
        return Ok(CompressionResult {
            success: false,
            output_path: None,
            original_size: 0,
            compressed_size: None,
            compression_ratio: None,
            error: Some("El archivo no existe".to_string()),
        });
    }

    // Obtener tamaño original
    let original_size = fs::metadata(&input).await
        .map(|m| m.len())
        .unwrap_or(0);

    // Buscar Ghostscript (gswin64c en Windows, gs en Linux/Mac)
    let gs_cmd = find_ghostscript().await;
    
    if gs_cmd.is_none() {
        return Ok(CompressionResult {
            success: false,
            output_path: None,
            original_size,
            compressed_size: None,
            compression_ratio: None,
            error: Some("Ghostscript no encontrado. Por favor instálalo.".to_string()),
        });
    }

    let gs = gs_cmd.unwrap();
    let pdf_settings = level.to_gs_setting();

    // Comando Ghostscript para compresión
    let args = vec![
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        &format!("-dPDFSETTINGS={}", pdf_settings),
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        "-dDetectDuplicateImages=true",
        "-dCompressFonts=true",
        "-dOptimize=true",
        &format!("-sOutputFile={}", output_path),
        &input_path,
    ];

    let output = Command::new(&gs)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await;

    match output {
        Ok(result) => {
            if result.status.success() {
                // Obtener tamaño comprimido
                let compressed_size = fs::metadata(&output_path).await
                    .map(|m| m.len())
                    .ok();

                let ratio = compressed_size.map(|cs| {
                    let reduction = (1.0 - (cs as f64 / original_size as f64)) * 100.0;
                    if reduction > 0.0 {
                        format!("{:.1}%", reduction)
                    } else {
                        format!("+{:.1}%", reduction.abs())
                    }
                });

                Ok(CompressionResult {
                    success: true,
                    output_path: Some(output_path),
                    original_size,
                    compressed_size,
                    compression_ratio: ratio,
                    error: None,
                })
            } else {
                let error_msg = String::from_utf8_lossy(&result.stderr);
                Ok(CompressionResult {
                    success: false,
                    output_path: None,
                    original_size,
                    compressed_size: None,
                    compression_ratio: None,
                    error: Some(format!("Error de Ghostscript: {}", error_msg)),
                })
            }
        }
        Err(e) => {
            Ok(CompressionResult {
                success: false,
                output_path: None,
                original_size,
                compressed_size: None,
                compression_ratio: None,
                error: Some(format!("Error ejecutando comando: {}", e)),
            })
        }
    }
}

/// Busca Ghostscript en el sistema
async fn find_ghostscript() -> Option<String> {
    // Intentar nombres comunes según el sistema operativo
    let commands = if cfg!(target_os = "windows") {
        vec!["gswin64c", "gswin32c", "gs"]
    } else {
        vec!["gs", "ghostscript"]
    };

    for cmd in commands {
        if let Ok(output) = Command::new("which")
            .arg(cmd)
            .output()
            .await 
        {
            if output.status.success() {
                return Some(cmd.to_string());
            }
        }
        
        // En Windows, intentar sin 'which'
        if cfg!(target_os = "windows") {
            if Command::new(cmd).arg("--version").output().await.is_ok() {
                return Some(cmd.to_string());
            }
        }
    }

    None
}

/// Comprime múltiples PDFs
#[tauri::command]
pub async fn compress_pdfs_batch(
    files: Vec<String>,
    output_dir: String,
    level: CompressionLevel,
) -> Vec<CompressionResult> {
    let mut results = Vec::new();

    fs::create_dir_all(&output_dir).await.ok();

    for (idx, input_path) in files.iter().enumerate() {
        let filename = PathBuf::from(input_path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("compressed");
        
        let output_path = format!("{}/{}_compressed.pdf", output_dir, filename);
        
        let result = compress_pdf(
            input_path.clone(),
            output_path,
            level.clone(),
        ).await.unwrap_or_else(|e| CompressionResult {
            success: false,
            output_path: None,
            original_size: 0,
            compressed_size: None,
            compression_ratio: None,
            error: Some(e),
        });

        results.push(result);
    }

    results
}

/// Verifica si Ghostscript está instalado
#[tauri::command]
pub async fn check_ghostscript() -> bool {
    find_ghostscript().await.is_some()
}
