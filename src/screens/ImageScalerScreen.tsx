import { useState, useRef, useCallback } from "react";
import { WindowControls } from "../components/window";
import { motion, AnimatePresence } from "framer-motion";

type InterpolationMethod = "lanczos-sharp" | "lanczos" | "bicubic" | "bilinear" | "nearest";

interface ImageInfo {
  file: File;
  originalUrl: string;
  originalWidth: number;
  originalHeight: number;
  originalSize: number;
}

interface ScaleSettings {
  method: InterpolationMethod;
  scaleFactor: number;
  targetWidth: number;
  targetHeight: number;
  maintainAspectRatio: boolean;
  targetDpi: number;
  sharpenAmount: number;
}

const INTERPOLATION_METHODS: { value: InterpolationMethod; label: string; description: string }[] = [
  {
    value: "lanczos-sharp",
    label: "Lanczos + Sharp",
    description: "Máxima calidad con afilado agresivo",
  },
  {
    value: "lanczos",
    label: "Lanczos",
    description: "Mejor calidad, reduce artefactos y mantiene bordes nítidos",
  },
  {
    value: "bicubic",
    label: "Bicúbica",
    description: "Buen equilibrio entre calidad y velocidad",
  },
  {
    value: "bilinear",
    label: "Bilineal",
    description: "Rápida, buena para imágenes suaves",
  },
  {
    value: "nearest",
    label: "Vecino más cercano",
    description: "Más rápida, mantiene píxeles nítidos",
  },
];

// Algoritmo Lanczos para interpolación de alta calidad
function lanczos(x: number, a: number = 3): number {
  if (x === 0) return 1;
  if (Math.abs(x) >= a) return 0;
  const pix = Math.PI * x;
  return (a * Math.sin(pix) * Math.sin(pix / a)) / (pix * pix);
}

// Función de escalado con Lanczos
function resizeLanczos(
  src: ImageData,
  dstWidth: number,
  dstHeight: number
): ImageData {
  const srcWidth = src.width;
  const srcHeight = src.height;
  const dst = new ImageData(dstWidth, dstHeight);
  const a = 3;

  const scaleX = srcWidth / dstWidth;
  const scaleY = srcHeight / dstHeight;

  for (let y = 0; y < dstHeight; y++) {
    for (let x = 0; x < dstWidth; x++) {
      let r = 0, g = 0, b = 0, a_sum = 0;

      const srcX = (x + 0.5) * scaleX - 0.5;
      const srcY = (y + 0.5) * scaleY - 0.5;

      const xStart = Math.max(0, Math.floor(srcX - a + 1));
      const xEnd = Math.min(srcWidth, Math.ceil(srcX + a));
      const yStart = Math.max(0, Math.floor(srcY - a + 1));
      const yEnd = Math.min(srcHeight, Math.ceil(srcY + a));

      for (let sy = yStart; sy < yEnd; sy++) {
        for (let sx = xStart; sx < xEnd; sx++) {
          const weightX = lanczos(sx - srcX);
          const weightY = lanczos(sy - srcY);
          const weight = weightX * weightY;

          const idx = (sy * srcWidth + sx) * 4;
          r += src.data[idx] * weight;
          g += src.data[idx + 1] * weight;
          b += src.data[idx + 2] * weight;
          a_sum += src.data[idx + 3] * weight;
        }
      }

      const dstIdx = (y * dstWidth + x) * 4;
      dst.data[dstIdx] = Math.min(255, Math.max(0, Math.round(r)));
      dst.data[dstIdx + 1] = Math.min(255, Math.max(0, Math.round(g)));
      dst.data[dstIdx + 2] = Math.min(255, Math.max(0, Math.round(b)));
      dst.data[dstIdx + 3] = Math.min(255, Math.max(0, Math.round(a_sum)));
    }
  }

  return dst;
}

// Unsharp Masking para mejorar nitidez
function applyUnsharpMask(
  src: ImageData,
  amount: number,
  radius: number,
  threshold: number
): ImageData {
  const width = src.width;
  const height = src.height;
  const dst = new ImageData(width, height);
  
  // Crear versión difuminada (simple box blur)
  const blurred = new ImageData(width, height);
  const r = Math.ceil(radius);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r_sum = 0, g_sum = 0, b_sum = 0, count = 0;
      
      for (let ky = -r; ky <= r; ky++) {
        for (let kx = -r; kx <= r; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (py * width + px) * 4;
          
          r_sum += src.data[idx];
          g_sum += src.data[idx + 1];
          b_sum += src.data[idx + 2];
          count++;
        }
      }
      
      const dstIdx = (y * width + x) * 4;
      blurred.data[dstIdx] = r_sum / count;
      blurred.data[dstIdx + 1] = g_sum / count;
      blurred.data[dstIdx + 2] = b_sum / count;
      blurred.data[dstIdx + 3] = src.data[dstIdx + 3];
    }
  }
  
  // Aplicar unsharp masking
  for (let i = 0; i < src.data.length; i += 4) {
    const r_diff = src.data[i] - blurred.data[i];
    const g_diff = src.data[i + 1] - blurred.data[i + 1];
    const b_diff = src.data[i + 2] - blurred.data[i + 2];
    
    // Solo aplicar si la diferencia supera el umbral
    const diff = Math.abs(r_diff) + Math.abs(g_diff) + Math.abs(b_diff);
    
    if (diff > threshold * 3) {
      dst.data[i] = Math.min(255, Math.max(0, Math.round(src.data[i] + r_diff * amount)));
      dst.data[i + 1] = Math.min(255, Math.max(0, Math.round(src.data[i + 1] + g_diff * amount)));
      dst.data[i + 2] = Math.min(255, Math.max(0, Math.round(src.data[i + 2] + b_diff * amount)));
    } else {
      dst.data[i] = src.data[i];
      dst.data[i + 1] = src.data[i + 1];
      dst.data[i + 2] = src.data[i + 2];
    }
    dst.data[i + 3] = src.data[i + 3];
  }
  
  return dst;
}

// Filtro de sharpen (convolución)
function applySharpen(src: ImageData, strength: number): ImageData {
  const width = src.width;
  const height = src.height;
  const dst = new ImageData(width, height);
  
  const kernel = [
    0, -1 * strength, 0,
    -1 * strength, 1 + 4 * strength, -1 * strength,
    0, -1 * strength, 0
  ];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (py * width + px) * 4;
          const kidx = (ky + 1) * 3 + (kx + 1);
          
          r += src.data[idx] * kernel[kidx];
          g += src.data[idx + 1] * kernel[kidx];
          b += src.data[idx + 2] * kernel[kidx];
        }
      }
      
      const dstIdx = (y * width + x) * 4;
      dst.data[dstIdx] = Math.min(255, Math.max(0, Math.round(r)));
      dst.data[dstIdx + 1] = Math.min(255, Math.max(0, Math.round(g)));
      dst.data[dstIdx + 2] = Math.min(255, Math.max(0, Math.round(b)));
      dst.data[dstIdx + 3] = src.data[dstIdx + 3];
    }
  }
  
  return dst;
}

// Escalado en pasos múltiples para mejor calidad
function resizeWithSteps(
  src: ImageData,
  dstWidth: number,
  dstHeight: number
): ImageData {
  let current = src;
  const maxScalePerStep = 2;
  
  // Calcular cuántos pasos necesitamos
  let steps = Math.ceil(Math.log2(Math.max(dstWidth / src.width, dstHeight / src.height)));
  steps = Math.max(1, steps);
  
  for (let i = 0; i < steps; i++) {
    const isLastStep = i === steps - 1;
    const targetW = isLastStep ? dstWidth : Math.round(current.width * Math.min(maxScalePerStep, Math.pow(2, i + 1)));
    const targetH = isLastStep ? dstHeight : Math.round(current.height * Math.min(maxScalePerStep, Math.pow(2, i + 1)));
    
    if (targetW <= current.width && targetH <= current.height) break;
    
    current = resizeLanczos(current, targetW, targetH);
  }
  
  return current;
}

// Función principal de escalado
async function resizeImage(
  imageUrl: string,
  settings: ScaleSettings
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const srcCanvas = document.createElement("canvas");
        srcCanvas.width = img.width;
        srcCanvas.height = img.height;
        const srcCtx = srcCanvas.getContext("2d")!;
        srcCtx.drawImage(img, 0, 0);

        const srcData = srcCtx.getImageData(0, 0, img.width, img.height);

        let targetWidth = settings.targetWidth || Math.round(img.width * settings.scaleFactor);
        let targetHeight = settings.targetHeight || Math.round(img.height * settings.scaleFactor);

        const dstCanvas = document.createElement("canvas");
        dstCanvas.width = targetWidth;
        dstCanvas.height = targetHeight;
        const dstCtx = dstCanvas.getContext("2d")!;

        let dstData: ImageData;
        
        switch (settings.method) {
          case "lanczos-sharp":
            // Escalado en pasos + sharpening agresivo
            dstData = resizeWithSteps(srcData, targetWidth, targetHeight);
            // Aplicar unsharp masking
            dstData = applyUnsharpMask(dstData, 1.5, 1, 5);
            // Aplicar sharpen adicional
            dstData = applySharpen(dstData, 0.5);
            break;
          case "lanczos":
            dstData = resizeWithSteps(srcData, targetWidth, targetHeight);
            dstData = applyUnsharpMask(dstData, 0.8, 1, 10);
            break;
          case "bicubic":
            dstCtx.imageSmoothingEnabled = true;
            dstCtx.imageSmoothingQuality = "high";
            dstCtx.drawImage(img, 0, 0, targetWidth, targetHeight);
            resolve(dstCanvas.toDataURL("image/png", 1.0));
            return;
          case "bilinear":
            dstCtx.imageSmoothingEnabled = true;
            dstCtx.imageSmoothingQuality = "high";
            dstCtx.drawImage(img, 0, 0, targetWidth, targetHeight);
            resolve(dstCanvas.toDataURL("image/png", 1.0));
            return;
          case "nearest":
            dstCtx.imageSmoothingEnabled = false;
            dstCtx.drawImage(img, 0, 0, targetWidth, targetHeight);
            resolve(dstCanvas.toDataURL("image/png", 1.0));
            return;
          default:
            dstData = resizeLanczos(srcData, targetWidth, targetHeight);
        }

        dstCtx.putImageData(dstData, 0, 0);
        resolve(dstCanvas.toDataURL("image/png", 1.0));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error("Error al cargar la imagen"));
    img.src = imageUrl;
  });
}

// Descargar imagen con metadatos DPI
function downloadImage(
  dataUrl: string,
  filename: string,
  dpi: number
): void {
  const link = document.createElement("a");
  link.download = filename.replace(/\.[^/.]+$/, "") + `_scaled_${dpi}dpi.png`;
  link.href = dataUrl;
  link.click();
}

interface ImageScalerScreenProps {
  onNavigate?: (screen: "home" | "pdf-compress" | "magazine" | "image-scaler") => void;
}

export function ImageScalerScreen({ onNavigate: _onNavigate }: ImageScalerScreenProps) {
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [scaledImageUrl, setScaledImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<ScaleSettings>({
    method: "lanczos-sharp",
    scaleFactor: 2,
    targetWidth: 0,
    targetHeight: 0,
    maintainAspectRatio: true,
    targetDpi: 300,
    sharpenAmount: 1.5,
  });

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file.type.startsWith("image/")) {
        alert("Por favor selecciona un archivo de imagen válido");
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        setImage({
          file,
          originalUrl: url,
          originalWidth: img.width,
          originalHeight: img.height,
          originalSize: file.size,
        });
        setScaledImageUrl(null);
        setSettings((prev) => ({
          ...prev,
          targetWidth: img.width * prev.scaleFactor,
          targetHeight: img.height * prev.scaleFactor,
        }));
      };

      img.src = url;
    },
    []
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleScale = async () => {
    if (!image) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 2, 95));
      }, 150);

      const result = await resizeImage(image.originalUrl, settings);
      clearInterval(interval);
      setProgress(100);
      setScaledImageUrl(result);
    } catch (error) {
      console.error("Error al escalar imagen:", error);
      alert("Error al procesar la imagen");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (scaledImageUrl && image) {
      downloadImage(scaledImageUrl, image.file.name, settings.targetDpi);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="w-screen h-screen bg-black overflow-hidden flex">
      {/* Window Controls - Top right */}
      <div className="absolute top-4 right-4 z-50" data-tauri-drag-region>
        <WindowControls />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col pl-16 h-screen">
        {/* Header - Compacto */}
        <div className="pt-4 pb-3 px-6 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Image Scaler</h1>
              <p className="text-xs text-gray-400">Escala imágenes con algoritmos de alta calidad</p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Controls Compacto */}
          <div className="w-80 bg-white/5 border-r border-white/10 p-4 flex flex-col overflow-hidden">
            {/* Compact Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all duration-200 mb-3 flex-shrink-0 ${
                dragActive
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-white/20 hover:border-white/40 hover:bg-white/5"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-3">
                <svg
                  className="w-6 h-6 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">Arrastra o haz clic</p>
                  <p className="text-gray-500 text-xs">para seleccionar imagen</p>
                </div>
              </div>
            </div>

            {image && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {/* Scrollable Settings Area */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                    {/* Original Image Info - Compact */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <h3 className="text-xs font-medium text-orange-400 mb-2">Imagen Original</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500 block">Dimensiones</span>
                          <span className="text-white">{image.originalWidth} × {image.originalHeight}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Tamaño</span>
                          <span className="text-white">{formatFileSize(image.originalSize)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Scale Settings - Compact */}
                    <div className="space-y-3">
                      {/* Method Selection */}
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400">Método</label>
                        <select
                          value={settings.method}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              method: e.target.value as InterpolationMethod,
                            }))
                          }
                          className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
                        >
                          {INTERPOLATION_METHODS.map((method) => (
                            <option key={method.value} value={method.value}>
                              {method.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-gray-500 leading-tight">
                          {INTERPOLATION_METHODS.find((m) => m.value === settings.method)?.description}
                        </p>
                      </div>

                      {/* Scale Factor */}
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-xs text-gray-400">Escala</label>
                          <span className="text-xs text-orange-400 font-medium">{settings.scaleFactor}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="4"
                          step="0.5"
                          value={settings.scaleFactor}
                          onChange={(e) => {
                            const factor = parseFloat(e.target.value);
                            setSettings((prev) => ({
                              ...prev,
                              scaleFactor: factor,
                              targetWidth: Math.round(image.originalWidth * factor),
                              targetHeight: Math.round(image.originalHeight * factor),
                            }));
                          }}
                          className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-500">
                          <span>0.5x</span>
                          <span>4x</span>
                        </div>
                      </div>

                      {/* Target Dimensions */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-gray-400">Ancho</label>
                          <input
                            type="number"
                            value={settings.targetWidth || ""}
                            onChange={(e) => {
                              const width = parseInt(e.target.value) || 0;
                              setSettings((prev) => ({
                                ...prev,
                                targetWidth: width,
                                targetHeight: prev.maintainAspectRatio
                                  ? Math.round((width / image.originalWidth) * image.originalHeight)
                                  : prev.targetHeight,
                              }));
                            }}
                            className="w-full bg-black/50 border border-white/20 rounded-lg px-2 py-1.5 text-white text-xs focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-gray-400">Alto</label>
                          <input
                            type="number"
                            value={settings.targetHeight || ""}
                            onChange={(e) => {
                              const height = parseInt(e.target.value) || 0;
                              setSettings((prev) => ({
                                ...prev,
                                targetHeight: height,
                                targetWidth: prev.maintainAspectRatio
                                  ? Math.round((height / image.originalHeight) * image.originalWidth)
                                  : prev.targetWidth,
                              }));
                            }}
                            className="w-full bg-black/50 border border-white/20 rounded-lg px-2 py-1.5 text-white text-xs focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* DPI Setting */}
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400">DPI</label>
                        <select
                          value={settings.targetDpi}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              targetDpi: parseInt(e.target.value),
                            }))
                          }
                          className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-1.5 text-white text-xs focus:border-orange-500 focus:outline-none"
                        >
                          <option value={72}>72 DPI (Web)</option>
                          <option value={150}>150 DPI</option>
                          <option value={300}>300 DPI (Print)</option>
                          <option value={600}>600 DPI (Ultra)</option>
                        </select>
                      </div>

                      {/* Sharpen Control for Lanczos-Sharp */}
                      {settings.method === "lanczos-sharp" && (
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <label className="text-xs text-gray-400">Nitidez</label>
                            <span className="text-xs text-orange-400">{settings.sharpenAmount}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.5"
                            value={settings.sharpenAmount}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                sharpenAmount: parseFloat(e.target.value),
                              }))
                            }
                            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons - Fixed at bottom */}
                  <div className="pt-3 mt-3 border-t border-white/10 space-y-2 flex-shrink-0">
                    <button
                      onClick={handleScale}
                      disabled={isProcessing}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                    >
                      {isProcessing ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {progress}%
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                            <polyline points="17 6 23 6 23 12" />
                          </svg>
                          Escalar
                        </>
                      )}
                    </button>

                    {scaledImageUrl && (
                      <button
                        onClick={handleDownload}
                        className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Descargar
                      </button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 p-6 flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
            <AnimatePresence mode="wait">
              {!image ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-600/20 flex items-center justify-center border border-orange-500/30">
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-white mb-1">Sube una imagen</h2>
                  <p className="text-gray-400 text-sm max-w-sm">
                    Selecciona una imagen y elige el método de interpolación
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full flex flex-col"
                >
                  {/* Comparison */}
                  <div className="flex-1 flex gap-4 min-h-0">
                    {/* Original */}
                    <div className="flex-1 bg-white/5 rounded-xl border border-white/10 overflow-hidden flex flex-col">
                      <div className="p-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400">Original</span>
                        <span className="text-[10px] text-gray-500">
                          {image.originalWidth} × {image.originalHeight}px
                        </span>
                      </div>
                      <div className="flex-1 p-3 flex items-center justify-center overflow-hidden">
                        <img
                          src={image.originalUrl}
                          alt="Original"
                          className="max-w-full max-h-full object-contain rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Scaled */}
                    <div className="flex-1 bg-white/5 rounded-xl border border-white/10 overflow-hidden flex flex-col">
                      <div className="p-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-orange-400">Escalada</span>
                          <span className="text-[10px] text-gray-500">
                            {settings.targetWidth} × {settings.targetHeight}px
                          </span>
                        </div>
                        <span className="text-[10px] text-orange-500/80 font-medium">
                          {settings.targetDpi} DPI
                        </span>
                      </div>
                      <div className="flex-1 p-3 flex items-center justify-center overflow-hidden">
                        {scaledImageUrl ? (
                          <img
                            src={scaledImageUrl}
                            alt="Scaled"
                            className="max-w-full max-h-full object-contain rounded-lg"
                          />
                        ) : (
                          <div className="text-center text-gray-500">
                            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm">Vista previa</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
