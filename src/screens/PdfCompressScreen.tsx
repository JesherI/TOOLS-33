import { useState, useRef, useCallback, useEffect } from "react";
import { ParticleCanvas } from "../components/particles";
import { WindowControls } from "../components/window";
import { Sidebar } from "../components/sidebar";
import {
  compressPDFWithRust,
  checkCompressionAvailable,
  installGhostscript,
  debugGhostscript,
  formatFileSize,
  CompressionLevel
} from "../utils";

interface PdfCompressScreenProps {
  onNavigate?: (screen: "home" | "pdf-compress") => void;
}

interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: "pending" | "compressing" | "done" | "error";
  progress?: number;
  compressedSize?: number;
  compressionRatio?: string;
  errorMessage?: string;
}

export function PdfCompressScreen({ onNavigate }: PdfCompressScreenProps) {
  const [phase, setPhase] = useState<"upload" | "list" | "compressing">("upload");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>("medium");
  const [isDragging, setIsDragging] = useState(false);
  const [hasGhostscript, setHasGhostscript] = useState<boolean | null>(null);
  const [isInstallingGs, setIsInstallingGs] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar si Ghostscript está instalado
  useEffect(() => {
    checkCompressionAvailable().then(setHasGhostscript);
  }, []);

  // Manejar archivos seleccionados
  const handleFiles = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileItem[] = Array.from(selectedFiles).map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: "pending",
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    setPhase("list");
  }, []);

  // Click en el área de drop
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // Eliminar archivo de la lista
  const removeFile = (id: string) => {
    setFiles((prev) => {
      const newFiles = prev.filter((f) => f.id !== id);
      if (newFiles.length === 0) {
        setPhase("upload");
      }
      return newFiles;
    });
  };

  // Comprimir archivos con Rust puro
  const handleCompress = async () => {
    setPhase("compressing");
    
    const { writeFile, readFile, remove, BaseDirectory } = await import("@tauri-apps/plugin-fs");
    
    for (const fileItem of files) {
      if (fileItem.status === "done") continue;

      // Marcar como comprimiendo
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: "compressing", progress: 10 } : f
      ));

      try {
        // Guardar archivo temporal en directorio temp de Tauri
        const arrayBuffer = await fileItem.file.arrayBuffer();
        const tempInput = `input_${fileItem.id}.pdf`;
        const tempOutput = `output_${fileItem.id}.pdf`;
        
        console.log(`Guardando archivo temporal: ${tempInput}`);
        
        await writeFile(tempInput, new Uint8Array(arrayBuffer), {
          baseDir: BaseDirectory.Temp,
        });
        
        console.log(`Archivo temporal guardado, iniciando compresión...`);

        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, progress: 30 } : f
        ));

        // Comprimir con Rust puro (lopdf)
        console.log(`Llamando a compressPDFWithRust con:`, {
          input: tempInput,
          output: tempOutput,
          level: compressionLevel
        });
        
        const result = await compressPDFWithRust(
          tempInput,
          tempOutput,
          compressionLevel
        );
        
        console.log(`Resultado de compresión:`, result);

        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, progress: 80 } : f
        ));

        if (result.success) {
          // Leer archivo comprimido
          const compressedData = await readFile(tempOutput, {
            baseDir: BaseDirectory.Temp,
          });

          // Descargar con nombre descriptivo incluyendo nivel de compresión
          const blob = new Blob([compressedData], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          
          // Crear nombre con sufijo descriptivo
          const baseName = fileItem.name.replace(/\.pdf$/i, "");
          const levelSuffix = compressionLevel === "light" 
            ? "light" 
            : compressionLevel === "medium" 
            ? "medium" 
            : "high";
          const newFileName = `${baseName}_compressed_${levelSuffix}.pdf`;
          
          link.download = newFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          // Limpiar archivos temporales
          await remove(tempInput, { baseDir: BaseDirectory.Temp }).catch(() => {});
          await remove(tempOutput, { baseDir: BaseDirectory.Temp }).catch(() => {});

          // Actualizar estado
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { 
              ...f, 
              status: "done", 
              progress: 100,
              compressedSize: result.compressed_size,
              compressionRatio: result.compression_ratio
            } : f
          ));
        } else {
          throw new Error(result.error || "Error en compresión");
        }
      } catch (error) {
        console.error(`=== ERROR EN ARCHIVO ${fileItem.name} ===`);
        console.error('Tipo:', typeof error);
        console.error('Error completo:', error);
        
        let errorMsg = "Error al procesar archivo";
        
        if (error instanceof Error) {
          errorMsg = `${error.name}: ${error.message}`;
          if ((error as any).stack) {
            console.error('Stack:', (error as any).stack);
          }
        } else if (typeof error === 'string') {
          errorMsg = error;
        } else if (error && typeof error === 'object') {
          errorMsg = JSON.stringify(error);
        }
        
        console.error('Mensaje final:', errorMsg);
        
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { 
            ...f, 
            status: "error",
            errorMessage: errorMsg
          } : f
        ));
      }
    }

    setPhase("list");
  };

  // Descripción según nivel de compresión
  const getCompressionDescription = (level: CompressionLevel): string => {
    switch (level) {
      case "light":
        return "Elimina metadatos y optimiza estructura. Sin pérdida de calidad.";
      case "medium":
        return "Compresión de imágenes al 65%. Balance calidad/tamaño.";
      case "high":
        return "Compresión máxima al 45%. Reducción significativa.";
      default:
        return "";
    }
  };

  // Verificar si todos los archivos están comprimidos
  const allCompressed = files.every(f => f.status === "done");
  const isCompressing = phase === "compressing";

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        currentScreen="pdf-compress"
        onNavigate={onNavigate}
      />

      {/* Window Controls */}
      <div className="absolute top-4 right-4 z-50" data-tauri-drag-region>
        <WindowControls />
      </div>

      {/* Particles Background */}
      <ParticleCanvas
        config={{
          connectionDistance: 120,
          mouseInfluenceRadius: 300,
          mouseInfluenceStrength: 0.03,
          returnSpeed: 0.05,
          colors: {
            particle: "#f97316",
            connection: "rgba(249, 115, 22,",
          },
        }}
        density={15000}
      />

      {/* Main Content */}
      <div className="absolute inset-0 pl-16 flex items-center justify-center">
        <div className="w-full max-w-4xl mx-8">
          {phase === "upload" ? (
            /* FASE 1: UPLOAD */
            <div
              onClick={handleClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer
                transition-all duration-300 backdrop-blur-sm
                ${
                  isDragging
                    ? "border-orange-500 bg-orange-500/10 scale-105"
                    : "border-orange-500/30 bg-black/40 hover:border-orange-500/50 hover:bg-orange-500/5"
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />

              {/* Badge de Rust */}
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full text-xs text-orange-400 font-mono">
                  Powered by Rust (lopdf)
                </span>
              </div>

              {/* Icon */}
              <div className="mb-6">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="1.5"
                  className="mx-auto"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-orange-500 mb-3">
                Arrastra archivos aquí
              </h2>
              <p className="text-gray-400 mb-2">
                o haz clic para seleccionar archivos
              </p>
              <p className="text-sm text-gray-500">
                Compresión pura Rust - Sin dependencias externas
              </p>
            </div>
          ) : (
            /* FASE 2: LISTA */
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-orange-500">
                    Archivos ({files.length})
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Compresión pura Rust con lopdf
                  </p>
                </div>
                {!isCompressing && (
                  <button
                    onClick={() => {
                      setFiles([]);
                      setPhase("upload");
                    }}
                    className="text-sm text-gray-400 hover:text-orange-400 transition-colors"
                  >
                    Limpiar todo
                  </button>
                )}
              </div>

              {/* Lista de archivos con scroll estilizado */}
              <div className="space-y-2 mb-8 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-500/30 scrollbar-track-transparent hover:scrollbar-thumb-orange-500/50">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      file.status === "done" 
                        ? "bg-green-500/10 border-green-500/30" 
                        : file.status === "error"
                        ? "bg-red-500/10 border-red-500/30"
                        : file.status === "compressing"
                        ? "bg-orange-500/10 border-orange-500/30"
                        : "bg-white/5 border-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={file.status === "done" ? "#22c55e" : file.status === "error" ? "#ef4444" : "#f97316"}
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm text-gray-200 font-medium">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                          {file.status === "done" && file.compressedSize && (
                            <>
                              <span className="text-xs text-green-400">→</span>
                              <p className="text-xs text-green-400">
                                {formatFileSize(file.compressedSize)} 
                                ({file.compressionRatio} menos)
                              </p>
                            </>
                          )}
                          {file.status === "error" && (
                            <div className="flex items-center gap-1 mt-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                              </svg>
                              <p className="text-xs text-red-400" title={file.errorMessage}>
                                {file.errorMessage && file.errorMessage.length > 40 
                                  ? file.errorMessage.substring(0, 40) + "..." 
                                  : file.errorMessage}
                              </p>
                            </div>
                          )}
                        </div>
                        {/* Barra de progreso */}
                        {file.status === "compressing" && (
                          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-orange-500 transition-all duration-200"
                              style={{ width: `${file.progress || 0}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    {!isCompressing && (
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Selector de nivel de compresión */}
              {!isCompressing && !allCompressed && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-3">
                    Nivel de compresión (lopdf)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["light", "medium", "high"] as CompressionLevel[]).map(
                      (level) => (
                        <button
                          key={level}
                          onClick={() => setCompressionLevel(level)}
                          disabled={isCompressing}
                          className={`
                            p-4 rounded-xl border text-left transition-all duration-200
                            ${
                              compressionLevel === level
                                ? "border-orange-500 bg-orange-500/20"
                                : "border-white/10 bg-white/5 hover:border-white/20"
                            }
                            ${isCompressing ? "opacity-50 cursor-not-allowed" : ""}
                          `}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                level === "light"
                                  ? "bg-green-500"
                                  : level === "medium"
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                            />
                            <span
                              className={`font-semibold ${
                                compressionLevel === level
                                  ? "text-orange-400"
                                  : "text-gray-300"
                              }`}
                            >
                              {level === "light"
                                ? "Ligera"
                                : level === "medium"
                                ? "Media"
                                : "Alta"}
                            </span>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                  <p className="mt-3 text-sm text-gray-400">
                    {getCompressionDescription(compressionLevel)}
                  </p>
                  
                  {/* Advertencia si no hay Ghostscript */}
                  {hasGhostscript === false && !isInstallingGs && (
                    <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                      <div className="flex items-start gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm text-yellow-400 font-medium">
                            Ghostscript no está instalado
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            La compresión será básica (solo metadatos). 
                            Para compresión avanzada de imágenes, instala Ghostscript.
                          </p>
                          
                          {/* Botón de descarga manual - Opción recomendada */}
                          <div className="mt-3 flex flex-col gap-2">
                            <a
                              href="https://www.ghostscript.com/download/gsdnld.html"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-black text-xs font-semibold rounded-lg transition-colors"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              Descargar Ghostscript (recomendado)
                            </a>
                            
                            <div className="relative">
                              <button
                                onClick={async () => {
                                  setIsInstallingGs(true);
                                  setInstallError(null);
                                  try {
                                    console.log("[Ghostscript] Iniciando instalación automática...");
                                    const success = await installGhostscript();
                                    console.log("[Ghostscript] Resultado:", success);
                                    if (success) {
                                      const available = await checkCompressionAvailable();
                                      setHasGhostscript(available);
                                      if (!available) {
                                        setInstallError("Ghostscript se instaló pero necesita reiniciar TOOLS 33 para ser detectado.");
                                      }
                                    } else {
                                      setInstallError("La instalación no se completó. Intenta instalar manualmente.");
                                    }
                                  } catch (error) {
                                    console.error("[Ghostscript] Error:", error);
                                    const errorMsg = error instanceof Error ? error.message : String(error);
                                    setInstallError(errorMsg);
                                  } finally {
                                    setIsInstallingGs(false);
                                  }
                                }}
                                disabled={isInstallingGs}
                                className="w-full px-4 py-2 border border-orange-500/50 text-orange-400 hover:bg-orange-500/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                              >
                                {isInstallingGs ? (
                                  <>
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Instalación en progreso...
                                  </>
                                ) : (
                                  <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                                      <line x1="12" y1="22.08" x2="12" y2="12"/>
                                    </svg>
                                    Instalación automática
                                  </>
                                )}
                              </button>
                              <p className="mt-1 text-[10px] text-gray-500 text-center">
                                Se abrirá una ventana de PowerShell
                              </p>
                            </div>
                          </div>
                          
                          {installError && (
                            <p className="mt-2 text-xs text-red-400 flex items-start gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                              </svg>
                              <span>{installError}</span>
                            </p>
                          )}
                          
                          <p className="mt-3 text-xs text-gray-500">
                            <span className="text-blue-400">Nota:</span> La instalación automática requiere ejecutar TOOLS 33 como administrador. 
                            La instalación manual es más confiable.
                          </p>
                          
                          {/* Botón de diagnóstico */}
                          <button
                            onClick={async () => {
                              const debug = await debugGhostscript();
                              setDebugInfo(debug);
                              setShowDebug(true);
                            }}
                            className="mt-3 text-xs text-gray-500 hover:text-orange-400 underline"
                          >
                            Diagnosticar problema de detección
                          </button>
                          
                          {/* Mostrar información de debug */}
                          {showDebug && debugInfo && (
                            <div className="mt-3 p-3 bg-black/50 rounded-lg text-xs font-mono">
                              <div className="flex items-center justify-between mb-2">
                                <span className={debugInfo.found ? "text-green-400" : "text-red-400"}>
                                  {debugInfo.found ? "✓ Encontrado" : "✗ No encontrado"}
                                </span>
                                <button 
                                  onClick={() => setShowDebug(false)}
                                  className="text-gray-500 hover:text-gray-300"
                                >
                                  Cerrar
                                </button>
                              </div>
                              {debugInfo.found_path && (
                                <p className="text-green-400 mb-2">{debugInfo.found_path}</p>
                              )}
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {debugInfo.checked_paths?.map((item: any, i: number) => (
                                  <div key={i} className="flex gap-2">
                                    <span className={item.result.includes("✓") ? "text-green-400" : "text-red-400"}>
                                      {item.result.includes("✓") ? "✓" : "✗"}
                                    </span>
                                    <span className="text-gray-400 truncate" title={item.path}>
                                      {item.path}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {debugInfo.dynamic_dirs_found?.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-white/10">
                                  <p className="text-gray-500">Versiones encontradas en C:\Program Files\gs:</p>
                                  {debugInfo.dynamic_dirs_found.map((dir: string, i: number) => (
                                    <p key={i} className="text-blue-400">{dir}</p>
                                  ))}
                                </div>
                              )}
                              <p className="mt-2 text-orange-400">{debugInfo.recommendation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Estado de instalación en progreso */}
                  {isInstallingGs && (
                    <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <svg className="animate-spin w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <div>
                          <p className="text-sm text-blue-400 font-medium">
                            Instalando Ghostscript...
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Esto puede tardar unos minutos. Por favor espera.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {hasGhostscript === true && (
                    <p className="mt-3 text-xs text-green-400 flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      Ghostscript detectado - Compresión máxima disponible
                    </p>
                  )}
                </div>
              )}

              {/* Botón de comprimir */}
              {!allCompressed && (
                <button
                  onClick={handleCompress}
                  disabled={isCompressing}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-black font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isCompressing ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Comprimiendo con Rust...
                    </>
                  ) : (
                    <>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M8 14v-4" />
                        <path d="M12 14v-4" />
                        <path d="M16 14v-4" />
                        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                      </svg>
                      Comprimir {files.length} archivo{files.length > 1 ? "s" : ""}
                    </>
                  )}
                </button>
              )}

              {/* Mensaje de éxito */}
              {allCompressed && (
                <div className="text-center py-4">
                  <p className="text-green-400 font-semibold mb-2">
                    ¡Compresión completada!
                  </p>
                  <p className="text-sm text-gray-400">
                    Los archivos se han descargado automáticamente
                  </p>
                </div>
              )}

              {/* Botón para agregar más archivos */}
              {!isCompressing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full mt-3 py-3 border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 rounded-xl transition-all duration-200"
                >
                  + Agregar más archivos
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
