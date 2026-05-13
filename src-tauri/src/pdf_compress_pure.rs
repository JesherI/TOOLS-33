use std::process::{Command, Stdio};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use tokio::sync::Semaphore;
use tauri::ipc::Channel;

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

// ──────────────────────────────────────────────
// Nuevos tipos para compress_pdf_ultra
// ──────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressFileInput {
    pub id: String,
    pub name: String,
    pub path: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProgressEvent {
    pub file_id: String,
    pub file_name: String,
    pub phase: String,
    pub progress: u8,
    pub current_page: Option<u32>,
    pub total_pages: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileCompressResult {
    pub file_id: String,
    pub file_name: String,
    pub success: bool,
    pub original_size: u64,
    pub compressed_size: Option<u64>,
    pub compression_ratio: Option<String>,
    pub error: Option<String>,
}

// ──────────────────────────────────────────────
// compress_pdf_ultra — comando principal
// ──────────────────────────────────────────────

#[tauri::command]
pub async fn compress_pdf_ultra(
    files: Vec<CompressFileInput>,
    level: CompressionLevel,
    flatten_mode: bool,
    output_dir: String,
    on_event: Channel<ProgressEvent>,
) -> Result<Vec<FileCompressResult>, String> {
    let num_cpus = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .max(2);

    let semaphore = Arc::new(Semaphore::new(num_cpus));
    let temp_base = std::env::temp_dir().join("tools33_ultra");
    let _ = std::fs::create_dir_all(&temp_base);
    let _ = std::fs::create_dir_all(&output_dir);

    let output_dir = PathBuf::from(&output_dir);

    let mut handles = Vec::with_capacity(files.len());
    for file in files {
        let sem = semaphore.clone();
        let level = level.clone();
        let on_event = on_event.clone();
        let temp_dir = temp_base.join(&file.id);
        let out_dir = output_dir.clone();
        let _ = std::fs::create_dir_all(&temp_dir);

        handles.push(tokio::spawn(async move {
            process_single_file(file, temp_dir, out_dir, level, flatten_mode, sem, on_event).await
        }));
    }

    let mut results = Vec::with_capacity(handles.len());
    for handle in handles {
        match handle.await {
            Ok(r) => results.push(r),
            Err(e) => results.push(FileCompressResult {
                file_id: String::new(),
                file_name: "unknown".into(),
                success: false,
                original_size: 0,
                compressed_size: None,
                compression_ratio: None,
                error: Some(format!("Task panicked: {}", e)),
            }),
        }
    }

    let _ = std::fs::remove_dir_all(&temp_base);
    Ok(results)
}

async fn process_single_file(
    file: CompressFileInput,
    temp_dir: PathBuf,
    output_dir: PathBuf,
    level: CompressionLevel,
    flatten_mode: bool,
    semaphore: Arc<Semaphore>,
    on_event: Channel<ProgressEvent>,
) -> FileCompressResult {
    let file_id = file.id.clone();
    let file_name = file.name.clone();
    let file_path = file.path.clone();

    let original_size = std::fs::metadata(&file_path).map(|m| m.len()).unwrap_or(0);

    emit_progress(&on_event, &file_id, &file_name, "reading", 0, None, None);

    let output_path = temp_dir.join("output.pdf");
    let input_path = PathBuf::from(&file_path);

    // Count pages
    let total_pages = count_pdf_pages(&input_path);

    if total_pages <= 1 || total_pages as usize <= semaphore.available_permits().max(1) {
        emit_progress(&on_event, &file_id, &file_name, "compressing", 10, Some(1), Some(total_pages as u32));

        let result = compress_with_semaphore(
            &input_path, &output_path, &level, flatten_mode, &semaphore, &on_event,
            &file_id, &file_name, total_pages as u32, &output_dir,
        ).await;

        let _ = std::fs::remove_dir_all(&temp_dir);
        return result;
    }

    // Chunked parallel compression
    emit_progress(&on_event, &file_id, &file_name, "compressing", 5, Some(0), Some(total_pages as u32));

    let num_cpus = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .max(2);
    let chunks = build_page_chunks(total_pages as u32, num_cpus);
    let chunk_count = chunks.len();
    let chunk_dir = temp_dir.join("chunks");
    let _ = std::fs::create_dir_all(&chunk_dir);

    let mut chunk_tasks = Vec::with_capacity(chunk_count);
    for (i, (start, end)) in chunks.into_iter().enumerate() {
        let chunk_out = chunk_dir.join(format!("chunk_{:04}.pdf", i));
        let page_range = format!("{}-{}", start, end);
        let inp = input_path.to_string_lossy().to_string();
        let outp = chunk_out.to_string_lossy().to_string();
        let lvl = level.clone();
        let sem = semaphore.clone();
        let evt = on_event.clone();
        let fid = file_id.clone();
        let fnm = file_name.clone();
        let total = total_pages as u32;

        chunk_tasks.push(tokio::spawn(async move {
            let _permit = sem.acquire().await.unwrap_or_else(|_|
                panic!("Semaphore closed")
            );
            let success = tokio::task::spawn_blocking(move || {
                let gs = match find_ghostscript() {
                    Some(gs) => gs,
                    None => return Err("Ghostscript no encontrado".to_string()),
                };
                run_gs_page_range(&inp, &outp, &page_range, &lvl, &gs, false)
            }).await.unwrap_or(Err("Task cancelled".to_string()));

            let progress = 10 + ((i + 1) * 80 / chunk_count) as u8;
            evt.send(ProgressEvent {
                file_id: fid, file_name: fnm,
                phase: "compressing".into(),
                progress,
                current_page: Some(end),
                total_pages: Some(total),
            }).ok();

            (i, chunk_out, success)
        }));
    }

    let mut chunk_paths = Vec::with_capacity(chunk_count);
    for task in chunk_tasks {
        match task.await {
            Ok((i, path, Ok(()))) => chunk_paths.push((i, path)),
            Ok((_, _, Err(e))) => {
                let _ = std::fs::remove_dir_all(&temp_dir);
                return err_result(&file_id, &file_name, original_size, &e);
            }
            Err(e) => {
                let _ = std::fs::remove_dir_all(&temp_dir);
                return err_result(&file_id, &file_name, original_size, &format!("Chunk task: {}", e));
            }
        }
    }
    chunk_paths.sort_by_key(|(i, _)| *i);

    emit_progress(&on_event, &file_id, &file_name, "merging", 92, Some(total_pages as u32), Some(total_pages as u32));

    let chunk_strs: Vec<String> = chunk_paths.into_iter()
        .map(|(_, p)| p.to_string_lossy().to_string())
        .collect();
    let out_str = output_path.to_string_lossy().to_string();

    if let Err(e) = crate::pdf_merge::merge_pdfs(chunk_strs, out_str).await {
        let _ = std::fs::remove_dir_all(&temp_dir);
        return err_result(&file_id, &file_name, original_size, &format!("Merge: {}", e));
    }

    // Save compressed file to output_dir
    let compressed_size = save_to_output(&output_path, &output_dir, &file_name, &level);

    let ratio = compressed_size.and_then(|cs| {
        if cs > 0 && cs < original_size {
            let reduction = (1.0 - (cs as f64 / original_size as f64)) * 100.0;
            Some(format!("{:.1}%", reduction))
        } else if cs >= original_size {
            Some("0%".to_string())
        } else {
            None
        }
    });

    emit_progress(&on_event, &file_id, &file_name, "done", 100, Some(total_pages as u32), Some(total_pages as u32));

    let _ = std::fs::remove_dir_all(&temp_dir);
    FileCompressResult {
        file_id, file_name, success: true, original_size,
        compressed_size,
        compression_ratio: ratio,
        error: None,
    }
}

async fn compress_with_semaphore(
    input_path: &Path,
    output_path: &Path,
    level: &CompressionLevel,
    flatten_mode: bool,
    semaphore: &Arc<Semaphore>,
    on_event: &Channel<ProgressEvent>,
    file_id: &str,
    file_name: &str,
    total_pages: u32,
    output_dir: &Path,
) -> FileCompressResult {
    let _permit = match semaphore.acquire().await {
        Ok(p) => p,
        Err(_) => return err_result(file_id, file_name, 0, "Semaphore error"),
    };

    let inp = input_path.to_string_lossy().to_string();
    let outp = output_path.to_string_lossy().to_string();
    let lvl = level.clone();
    let flatten = flatten_mode;

    let success = tokio::task::spawn_blocking(move || {
        let gs = match find_ghostscript() {
            Some(gs) => gs,
            None => return Err("Ghostscript no encontrado".to_string()),
        };
        if flatten {
            let result = flatten_pdf_to_image(&PathBuf::from(&inp), &PathBuf::from(&outp), &gs)
                .map_err(|e| format!("Flatten: {}", e))?;
            if result.success { Ok(()) } else { Err(result.error.unwrap_or("Flatten fail".into())) }
        } else {
            compress_with_ghostscript(
                &PathBuf::from(&inp), &PathBuf::from(&outp), &gs, &lvl,
            ).map_err(|e| format!("GS: {}", e))?;
            Ok(())
        }
    }).await.unwrap_or(Err("Task cancelled".to_string()));

    let original_size = std::fs::metadata(input_path).map(|m| m.len()).unwrap_or(0);

    match success {
        Ok(()) => {
            let compressed_size = save_to_output(output_path, output_dir, file_name, level);

            let ratio = compressed_size.and_then(|cs| {
                if cs > 0 && cs < original_size {
                    let reduction = (1.0 - (cs as f64 / original_size as f64)) * 100.0;
                    Some(format!("{:.1}%", reduction))
                } else if cs >= original_size {
                    Some("0%".to_string())
                } else {
                    None
                }
            });

            on_event.send(ProgressEvent {
                file_id: file_id.into(), file_name: file_name.into(),
                phase: "done".into(), progress: 100,
                current_page: Some(total_pages), total_pages: Some(total_pages),
            }).ok();

            FileCompressResult {
                file_id: file_id.into(), file_name: file_name.into(),
                success: true, original_size,
                compressed_size,
                compression_ratio: ratio,
                error: None,
            }
        }
        Err(e) => err_result(file_id, file_name, original_size, &e),
    }
}

/// Copy compressed file to output_dir and return its size
fn save_to_output(
    src: &Path,
    output_dir: &Path,
    file_name: &str,
    level: &CompressionLevel,
) -> Option<u64> {
    let safe_name = file_name.trim_end_matches(".pdf").trim_end_matches(".PDF");
    let level_tag = match level {
        CompressionLevel::Light => "light",
        CompressionLevel::Medium => "medium",
        CompressionLevel::High => "high",
    };
    let dest_name = format!("{}_compressed_{}.pdf", safe_name, level_tag);
    let dest = output_dir.join(&dest_name);

    match std::fs::copy(src, &dest) {
        Ok(_) => std::fs::metadata(&dest).ok().map(|m| m.len()),
        Err(e) => {
            eprintln!("Error saving to {}: {}", dest.display(), e);
            None
        }
    }
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

fn count_pdf_pages(path: &Path) -> usize {
    lopdf::Document::load(path)
        .map(|doc| doc.get_pages().len())
        .unwrap_or(1)
}

fn build_page_chunks(total_pages: u32, num_chunks: usize) -> Vec<(u32, u32)> {
    let per_chunk = (total_pages as f64 / num_chunks as f64).ceil() as u32;
    let mut chunks = Vec::new();
    let mut start = 1u32;
    while start <= total_pages {
        let end = (start + per_chunk - 1).min(total_pages);
        chunks.push((start, end));
        start = end + 1;
    }
    chunks
}

fn run_gs_page_range(
    input: &str,
    output: &str,
    page_range: &str,
    level: &CompressionLevel,
    gs_cmd: &str,
    _flatten_mode: bool,
) -> Result<(), String> {
    let pdf_settings = format!("-dPDFSETTINGS={}", level.to_gs_param());
    let page_list = format!("-sPageList={}", page_range);
    let output_file = format!("-sOutputFile={}", output);

    let args: Vec<&str> = vec![
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        &pdf_settings,
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        "-dDetectDuplicateImages=true",
        "-dCompressFonts=true",
        "-dOptimize=true",
        &page_list,
        &output_file,
        input,
    ];

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
            Ok(o) if o.status.success() => Ok(()),
            Ok(_) => Err("GS page range fail".into()),
            Err(e) => Err(format!("GS error: {}", e)),
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
            Ok(o) if o.status.success() => Ok(()),
            Ok(_) => Err("GS page range fail".into()),
            Err(e) => Err(format!("GS error: {}", e)),
        }
    }
}

fn emit_progress(
    channel: &Channel<ProgressEvent>,
    file_id: &str,
    file_name: &str,
    phase: &str,
    progress: u8,
    current_page: Option<u32>,
    total_pages: Option<u32>,
) {
    let _ = channel.send(ProgressEvent {
        file_id: file_id.into(),
        file_name: file_name.into(),
        phase: phase.into(),
        progress,
        current_page,
        total_pages,
    });
}

fn err_result(file_id: &str, file_name: &str, original_size: u64, error: &str) -> FileCompressResult {
    FileCompressResult {
        file_id: file_id.into(),
        file_name: file_name.into(),
        success: false,
        original_size,
        compressed_size: None,
        compression_ratio: None,
        error: Some(error.into()),
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
    flatten_mode: bool,
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
        // Si modo flatten está activado, convertir a imagen plana
        if flatten_mode {
            match flatten_pdf_to_image(&input_full, &output_full, &gs_cmd) {
                Ok(result) => return Ok(result),
                Err(e) => {
                    eprintln!("Modo flatten falló: {}. Intentando modo normal...", e);
                }
            }
        }
        
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

/// Modo Flatten: Convierte PDF a imagen raster (PNG) a 300dpi, luego a PDF plano
/// Similar a "Flatten Image" en Photoshop - elimina capas vectoriales y metadatos CAD
fn flatten_pdf_to_image(
    input: &PathBuf,
    output: &PathBuf,
    gs_cmd: &str,
) -> Result<CompressionResult, String> {
    let original_size = std::fs::metadata(input).map(|m| m.len()).unwrap_or(0);
    let temp_dir = std::env::temp_dir();
    let base_name = input.file_stem().unwrap_or_default().to_string_lossy();
    
    // Paso 1: Convertir PDF a imagen PNG a 300dpi (alta calidad para impresión)
    let png_output = temp_dir.join(format!("{}_flattened.png", base_name));
    let png_output_str = format!("-sOutputFile={}", png_output.to_string_lossy());
    let input_file = input.to_string_lossy().to_string();
    
    let gs_args = vec![
        "-sDEVICE=png16m",              // PNG 24-bit color
        "-r300",                        // 300 DPI para buena calidad de impresión
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        "-dGraphicsAlphaBits=4",        // Suavizado de bordes
        "-dTextAlphaBits=4",            // Suavizado de texto
        "-dUseTrimBox",                 // Usar trimbox si existe
        &png_output_str,
        &input_file,
    ];
    
    // Ejecutar Ghostscript para convertir a PNG
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let result = Command::new(gs_cmd)
            .args(&gs_args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        
        match result {
            Ok(cmd_output) => {
                if !cmd_output.status.success() {
                    return Err("Ghostscript failed converting PDF to PNG".to_string());
                }
            }
            Err(e) => return Err(format!("Error ejecutando Ghostscript: {}", e)),
        }
    }
    
    #[cfg(not(windows))]
    {
        let result = Command::new(gs_cmd)
            .args(&gs_args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .output();
        
        match result {
            Ok(cmd_output) => {
                if !cmd_output.status.success() {
                    return Err("Ghostscript failed converting PDF to PNG".to_string());
                }
            }
            Err(e) => return Err(format!("Error ejecutando Ghostscript: {}", e)),
        }
    }
    
    // Verificar que se creó el PNG
    if !png_output.exists() {
        return Err("PNG file was not created".to_string());
    }
    
    // Paso 2: Convertir PNG de vuelta a PDF
    let output_file = format!("-sOutputFile={}", output.to_string_lossy());
    let png_input = png_output.to_string_lossy().to_string();
    
    let pdf_args = vec![
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        "-dAutoRotatePages=/None",      // No rotar automáticamente
        "-dColorConversionStrategy=/LeaveColorUnchanged",
        &output_file,
        &png_input,
    ];
    
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let result = Command::new(gs_cmd)
            .args(&pdf_args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        
        match result {
            Ok(cmd_output) => {
                // Limpiar archivo PNG temporal
                let _ = std::fs::remove_file(&png_output);
                
                if cmd_output.status.success() {
                    let flattened_size = std::fs::metadata(output).map(|m| m.len()).unwrap_or(0);
                    
                    let ratio = if flattened_size > 0 && flattened_size < original_size {
                        let reduction = (1.0 - (flattened_size as f64 / original_size as f64)) * 100.0;
                        format!("{:.1}%", reduction)
                    } else {
                        "0%".to_string()
                    };
                    
                    Ok(CompressionResult {
                        success: true,
                        original_size,
                        compressed_size: Some(flattened_size),
                        compression_ratio: Some(ratio),
                        error: None,
                        method: "ghostscript-flatten".to_string(),
                    })
                } else {
                    Err("Ghostscript failed converting PNG to PDF".to_string())
                }
            }
            Err(e) => {
                let _ = std::fs::remove_file(&png_output);
                Err(format!("Error ejecutando Ghostscript: {}", e))
            }
        }
    }
    
    #[cfg(not(windows))]
    {
        let result = Command::new(gs_cmd)
            .args(&pdf_args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .output();
        
        match result {
            Ok(cmd_output) => {
                let _ = std::fs::remove_file(&png_output);
                
                if cmd_output.status.success() {
                    let flattened_size = std::fs::metadata(output).map(|m| m.len()).unwrap_or(0);
                    
                    let ratio = if flattened_size > 0 && flattened_size < original_size {
                        let reduction = (1.0 - (flattened_size as f64 / original_size as f64)) * 100.0;
                        format!("{:.1}%", reduction)
                    } else {
                        "0%".to_string()
                    };
                    
                    Ok(CompressionResult {
                        success: true,
                        original_size,
                        compressed_size: Some(flattened_size),
                        compression_ratio: Some(ratio),
                        error: None,
                        method: "ghostscript-flatten".to_string(),
                    })
                } else {
                    Err("Ghostscript failed converting PNG to PDF".to_string())
                }
            }
            Err(e) => {
                let _ = std::fs::remove_file(&png_output);
                Err(format!("Error ejecutando Ghostscript: {}", e))
            }
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
