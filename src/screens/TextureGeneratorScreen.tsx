import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { ParticleCanvas } from "../components/particles";
import { motion, AnimatePresence } from "framer-motion";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { PDFDocument } from "pdf-lib";
import PptxGenJS from "pptxgenjs";
import { ToastContainer, useToast } from "../components/toast/Toast";
import {
  Ruler,
  TextureCanvas,
  ImageList,
  BottomControls,
  PaperSizeSelector,
  ExportFormatSelector,
  // type PaperSize,
  type PaperDimensions,
  type TextureImage,
  type TextureSettings,
  PAPER_SIZES,
  PX_PER_CM,
} from "../components/texture";

async function renderTextureToCanvas(
  image: TextureImage,
  paperSize: PaperDimensions
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  
  const paperWidth = paperSize.widthCm * PX_PER_CM;
  const paperHeight = paperSize.heightCm * PX_PER_CM;
  
  canvas.width = paperWidth;
  canvas.height = paperHeight;
  
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const img = await new Promise<HTMLImageElement>((resolve) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.src = image.url;
  });
  
  const scale = image.config.scale;
  const rotation = image.config.rotation;
  const rotationRad = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rotationRad));
  const sin = Math.abs(Math.sin(rotationRad));
  
  let imgWidth = img.width * scale;
  let imgHeight = img.height * scale;
  
  if (rotation !== 0) {
    const rotatedWidth = imgWidth * cos + imgHeight * sin;
    const rotatedHeight = imgWidth * sin + imgHeight * cos;
    imgWidth = rotatedWidth;
    imgHeight = rotatedHeight;
  }
  
  if (imgWidth > 0 && imgHeight > 0) {
    const cols = Math.ceil(paperWidth / imgWidth) + 1;
    const rows = Math.ceil(paperHeight / imgHeight) + 1;
    
    ctx.globalAlpha = image.config.opacity / 100;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * imgWidth;
        const y = row * imgHeight;
        
        ctx.save();
        ctx.translate(x + imgWidth / 2, y + imgHeight / 2);
        
        if (rotation !== 0) {
          ctx.rotate(rotationRad);
        }
        
        if (image.config.flipAlternate && (row + col) % 2 === 1) {
          ctx.scale(-1, 1);
        }
        
        ctx.drawImage(
          img,
          -(img.width * scale) / 2,
          -(img.height * scale) / 2,
          img.width * scale,
          img.height * scale
        );
        
        ctx.restore();
      }
    }
    
    ctx.globalAlpha = 1;
  }
  
  return canvas;
}

// Helper para esperar y permitir que el UI se actualice
const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

async function generateMultiDocument(
  images: TextureImage[],
  paperSize: PaperDimensions,
  format: "pdf" | "pptx",
  onProgress?: (current: number, total: number) => void
): Promise<Uint8Array> {
  
  if (format === "pptx") {
    const pptx = new PptxGenJS();
    const widthIn = paperSize.widthCm * 0.393701;
    const heightIn = paperSize.heightCm * 0.393701;
    
    pptx.defineLayout({ name: "CUSTOM", width: widthIn, height: heightIn });
    pptx.layout = "CUSTOM";
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      // Procesar en lotes pequeños para no bloquear el UI
      if (i > 0 && i % 3 === 0) {
        await yieldToMain();
      }
      
      const textureCanvas = await renderTextureToCanvas(image, paperSize);
      
      // Usar calidad 0.8 para reducir tamaño y procesamiento
      const blob = await new Promise<Blob>((resolve) => {
        textureCanvas.toBlob((b) => resolve(b!), "image/png", 0.8);
      });
      
      const base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      
      const slide = pptx.addSlide();
      slide.addImage({
        data: base64Image,
        x: 0,
        y: 0,
        w: widthIn,
        h: heightIn,
      });
      
      onProgress?.(i + 1, images.length);
    }
    
    const result = await pptx.write({ outputType: "arraybuffer", compression: true }) as ArrayBuffer;
    return new Uint8Array(result);
  }

  const pdfDoc = await PDFDocument.create();
  
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    
    // Procesar en lotes pequeños para no bloquear el UI
    if (i > 0 && i % 3 === 0) {
      await yieldToMain();
    }
    
    const textureCanvas = await renderTextureToCanvas(image, paperSize);
    
    // Usar calidad 0.8 para reducir tamaño y procesamiento
    const blob = await new Promise<Blob>((resolve) => {
      textureCanvas.toBlob((b) => resolve(b!), "image/png", 0.8);
    });
    
    const imageBytes = await blob.arrayBuffer();
    const page = pdfDoc.addPage([paperSize.widthPx, paperSize.heightPx]);
    const pdfImage = await pdfDoc.embedPng(imageBytes);
    
    page.drawImage(pdfImage, {
      x: 0,
      y: 0,
      width: paperSize.widthPx,
      height: paperSize.heightPx,
    });
    
    onProgress?.(i + 1, images.length);
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

interface TextureGeneratorScreenProps {
  onNavigate?: (screen: "home" | "pdf-compress" | "magazine" | "image-scaler" | "texture-generator") => void;
}

export function TextureGeneratorScreen({ onNavigate: _onNavigate }: TextureGeneratorScreenProps) {
  const [images, setImages] = useState<TextureImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [zoom, setZoom] = useState(0.3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "pptx">("pdf");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, showToast, removeToast } = useToast();

  const [settings, setSettings] = useState<TextureSettings>(({
    paperSize: "letter",
    customWidth: 27.94,
    customHeight: 21.59,
  }));

  const selectedImage = useMemo(
    () => images.find((img) => img.id === selectedImageId) || null,
    [images, selectedImageId]
  );

  // Zoom con Ctrl + Scroll
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom((prev) => {
          const newZoom = Math.round((prev + delta) * 100) / 100;
          return Math.max(0.2, Math.min(1.5, newZoom));
        });
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  const currentPaperSize = useMemo((): PaperDimensions => {
    if (settings.paperSize === "custom") {
      const w = Math.max(settings.customWidth, settings.customHeight);
      const h = Math.min(settings.customWidth, settings.customHeight);
      return {
        name: "Personalizado",
        widthCm: w,
        heightCm: h,
        widthPx: Math.round(w * PX_PER_CM),
        heightPx: Math.round(h * PX_PER_CM),
      };
    }
    return PAPER_SIZES[settings.paperSize];
  }, [settings]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const url = URL.createObjectURL(file);

      const newImage: TextureImage = {
        id,
        file,
        url,
        name: file.name,
        config: {
          scale: 0.5,
          rotation: 0,
          opacity: 100,
          flipAlternate: false,
        },
      };

      setImages((prev) => [newImage, ...prev]);
      if (!selectedImageId) {
        setSelectedImageId(id);
      }
    });
  }, [selectedImageId]);

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
    handleFiles(e.dataTransfer.files);
  };

  const updateImageConfig = (id: string, config: Partial<TextureImage["config"]>) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, config: { ...img.config, ...config } } : img
      )
    );
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id);
      if (selectedImageId === id) {
        setSelectedImageId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const [, setGenerationProgress] = useState<{current: number, total: number} | null>(null);

  const handleSave = async () => {
    if (images.length === 0) {
      showToast("Agrega al menos una imagen primero", "error");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: images.length });

    try {
      const extension = exportFormat === "pdf" ? "pdf" : "pptx";
      const fileBytes = await generateMultiDocument(
        images, 
        currentPaperSize, 
        exportFormat,
        (current, total) => setGenerationProgress({ current, total })
      );
      
      const filePath = await save({
        defaultPath: `texturas_${images.length}.${extension}`,
        filters: [{ name: exportFormat.toUpperCase(), extensions: [extension] }],
        title: "Guardar archivo de texturas",
      });

      if (filePath) {
        await invoke("save_texture_file", {
          filePath,
          fileData: Array.from(fileBytes),
        });
        showToast("Guardado", "success");
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      showToast("Error al guardar", "error");
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
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

      <div className="absolute inset-0 pl-20 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-2.5 border-b border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <PaperSizeSelector
              selected={settings.paperSize}
              customWidth={settings.customWidth}
              customHeight={settings.customHeight}
              onSelect={(size) => setSettings((s) => ({ ...s, paperSize: size }))}
              onCustomWidthChange={(w) => setSettings((s) => ({ ...s, customWidth: w }))}
              onCustomHeightChange={(h) => setSettings((s) => ({ ...s, customHeight: h }))}
            />

            <div className="text-xs text-gray-500 whitespace-nowrap">
              {currentPaperSize.widthCm.toFixed(1)} × {currentPaperSize.heightCm.toFixed(1)} cm
            </div>

            <div className="flex items-center gap-2 mr-28">
              <ExportFormatSelector value={exportFormat} onChange={setExportFormat} />
              <button
                onClick={handleSave}
                disabled={images.length === 0 || isGenerating}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-all flex items-center gap-1.5"
              >
                {isGenerating ? (
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                    </svg>
                    <span>Guardar ({images.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="flex-1 flex overflow-hidden">
          {/* Panel izquierdo */}
          <div className="w-56 flex-shrink-0 border-r border-white/10 bg-black/40 backdrop-blur-sm flex flex-col">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`m-3 p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-white/20 hover:border-white/40 hover:bg-white/5"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <svg className="w-7 h-7 mx-auto mb-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-white text-sm font-medium">Agregar</p>
              <p className="text-gray-500 text-xs">Arrastra aquí</p>
            </div>

            <div className="flex-1 px-3 pb-2 overflow-hidden">
              <ImageList
                images={images}
                selectedId={selectedImageId}
                onSelect={setSelectedImageId}
                onRemove={removeImage}
              />
            </div>
          </div>

          {/* Panel central */}
          <div className="flex-1 flex flex-col bg-gray-900/20 overflow-hidden">
            {/* Área de trabajo con scroll mejorado */}
            <div className="flex-1 overflow-auto scrollbar-thin">
              <div className="min-w-full min-h-full flex items-start justify-start p-8">
                {/* Contenedor con regletas */}
                <div className="relative inline-block">
                  {/* Regleta superior */}
                  <div className="absolute -top-7 left-6">
                    <Ruler
                      orientation="horizontal"
                      length={currentPaperSize.widthCm * PX_PER_CM * zoom}
                      cmLength={currentPaperSize.widthCm}
                    />
                  </div>
                  
                  {/* Regleta lateral */}
                  <div className="absolute -left-7 top-6">
                    <Ruler
                      orientation="vertical"
                      length={currentPaperSize.heightCm * PX_PER_CM * zoom}
                      cmLength={currentPaperSize.heightCm}
                    />
                  </div>
                  
                  {/* Canvas con margen para las regletas */}
                  <div className="ml-6 mt-6">
                    <AnimatePresence mode="wait">
                      {!selectedImage ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="w-72 h-52 flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-xl bg-black/20"
                        >
                          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5" className="mb-2 opacity-50">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M3 9h18M9 21V9" />
                          </svg>
                          <p className="text-gray-500 text-sm">Selecciona una imagen</p>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="bg-white shadow-lg shadow-black/30"
                        >
                          <TextureCanvas
                            image={selectedImage}
                            paperSize={currentPaperSize}
                            zoom={zoom}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

            <BottomControls
              image={selectedImage}
              onUpdate={updateImageConfig}
              zoom={zoom}
              onZoomChange={setZoom}
            />
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
