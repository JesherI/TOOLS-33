import { useState, useCallback, useRef, useEffect } from "react";
import { ParticleCanvas } from "../components/particles";
import { WindowControls } from "../components/window";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile, readDir } from "@tauri-apps/plugin-fs";
import { PDFDocument } from "pdf-lib";
import { useImageWorker } from "../hooks/useImageWorker";
import {
  AlertModal,
  LoadingState,
  EmptyState,
  PagesGrid,
  DistributionInfo,
  PreviewHeader,
  SpreadsGrid,
  GeneratePdfButton,
  GeneratingState,
  type AlertState,
  type PageItem,
  type SpreadPreview,
} from "../components/magazine";

// Styles to hide scrollbar
const scrollbarHideStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`;

interface MagazineScreenProps {
  onNavigate?: (_screen: "home" | "pdf-compress" | "magazine" | "image-scaler") => void;
}

const PAGE_SIZE = { name: "Carta", width_pt: 612, height_pt: 792, dpi: 300 };

interface Stats {
  total: number;
  realImages: number;
  blanks: number;
}

export function MagazineScreen({ onNavigate: _onNavigate }: MagazineScreenProps) {
  const [phase, setPhase] = useState<"upload" | "preview" | "generating">("upload");
  const [hasBackCover, setHasBackCover] = useState<boolean>(true);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [previewSpreads, setPreviewSpreads] = useState<SpreadPreview[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, realImages: 0, blanks: 0 });
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });

  const [alert, setAlert] = useState<AlertState>({
    show: false,
    title: "",
    message: "",
    type: "info",
  });

  // Refs for memory management
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Worker for image processing
  const { isProcessing: isWorkerProcessing, completed: workerCompleted, total: workerTotal } = useImageWorker();

  const showAlert = useCallback((title: string, message: string, type: AlertState["type"] = "info") => {
    setAlert({ show: true, title, message, type });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, show: false }));
  }, []);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore errors
        }
      });
      objectUrlsRef.current.clear();
    };
  }, []);

  // Load numbered images from folder - OPTIMIZED
  const handleLoadFolder = async () => {
    try {
      const folder = await open({
        directory: true,
        title: "Selecciona la carpeta con imágenes numeradas (1.jpg, 2.png, ...)",
      });

      if (!folder || typeof folder !== "string") return;

      setIsLoadingImages(true);
      setLoadingProgress({ current: 0, total: 0 });

      const entries = await readDir(folder);
      
      const supportedExts = [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"];
      const candidates: { num: number; path: string }[] = [];

      for (const entry of entries) {
        if (entry.isFile) {
          const name = entry.name || "";
          const lastDotIndex = name.lastIndexOf(".");
          if (lastDotIndex === -1) continue;
          
          const ext = name.substring(lastDotIndex).toLowerCase();
          const stem = name.substring(0, lastDotIndex);
          
          if (supportedExts.includes(ext)) {
            const num = parseInt(stem);
            if (!isNaN(num) && num > 0) {
              candidates.push({ num, path: `${folder}/${name}` });
            }
          }
        }
      }

      if (candidates.length === 0) {
        showAlert("Sin imágenes", "No se encontraron imágenes numeradas en la carpeta (ej: 1.jpg, 2.png)", "error");
        setIsLoadingImages(false);
        return;
      }

      candidates.sort((a, b) => a.num - b.num);
      
      const maxNum = Math.max(...candidates.map((c) => c.num));
      const realImages = candidates.length;
      
      // Calculate total (multiple of 4)
      const totalPages = Math.ceil(maxNum / 4) * 4;
      const blankPages = totalPages - maxNum;
      
      // Determine blank positions based on back cover
      const blankPositions: number[] = [];
      if (blankPages > 0) {
        if (blankPages === 2) {
          blankPositions.push(2);
          blankPositions.push(totalPages - 1);
        } else if (blankPages === 3) {
          blankPositions.push(2);
          blankPositions.push(totalPages - 1);
          if (hasBackCover) {
            blankPositions.push(totalPages - 2);
          } else {
            blankPositions.push(totalPages);
          }
        } else if (blankPages === 1) {
          blankPositions.push(totalPages);
        } else {
          for (let i = 0; i < blankPages; i++) {
            blankPositions.push(2 + i);
          }
        }
      }
      
      // Create page structure (without loading data yet)
      const newPages: PageItem[] = [];
      const imagePathsToLoad: { pos: number; imgNum: number; path: string }[] = [];
      
      for (let pos = 1; pos <= totalPages; pos++) {
        const isBlank = blankPositions.includes(pos);
        
        if (isBlank) {
          newPages.push({
            id: pos,
            imagePath: null,
            imageData: null,
            name: `Pos ${pos}: BLANCO`,
            isBlank: true,
          });
        } else {
          let imgNum: number;
          
          if (hasBackCover) {
            if (pos === 1) {
              imgNum = 1;
            } else if (pos === totalPages) {
              imgNum = maxNum;
            } else {
              let imagesAssigned = 1;
              for (let p = 2; p < pos; p++) {
                if (!blankPositions.includes(p)) {
                  imagesAssigned++;
                }
              }
              imgNum = 1 + imagesAssigned;
            }
          } else {
            imgNum = pos;
          }
          
          const candidate = candidates.find((c) => c.num === imgNum);
          
          if (candidate) {
            imagePathsToLoad.push({ pos: pos - 1, imgNum, path: candidate.path });
            newPages.push({
              id: pos,
              imagePath: candidate.path,
              imageData: null, // Will load later
              name: `Pos ${pos}: Img ${imgNum}`,
              isBlank: false,
              imgNum: imgNum,
            });
          } else {
            newPages.push({
              id: pos,
              imagePath: null,
              imageData: null,
              name: `Pos ${pos}: Img ${imgNum} (NO ENCONTRADA)`,
              isBlank: false,
              imgNum: imgNum,
            });
          }
        }
      }

      // Load images in small batches to not block UI
      setLoadingProgress({ current: 0, total: imagePathsToLoad.length });
      
      let loadedCount = 0;
      
      for (let i = 0; i < imagePathsToLoad.length; i += 3) {
        const batch = imagePathsToLoad.slice(i, i + 3);
        
        await Promise.all(
          batch.map(async ({ pos, path }) => {
            try {
              const data = await readFile(path);
              newPages[pos] = {
                ...newPages[pos],
                imageData: data,
              };
            } catch (error) {
              console.error("Error loading image:", error);
            }
          })
        );
        
        loadedCount += batch.length;
        setLoadingProgress({ current: loadedCount, total: imagePathsToLoad.length });
        
        // Small pause to allow UI updates
        if (i + 3 < imagePathsToLoad.length) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      setPages(newPages);
      setStats({ total: totalPages, realImages, blanks: blankPages });
      setIsLoadingImages(false);
      
      showAlert(
        "Imágenes cargadas",
        `${realImages} imágenes cargadas.\nPáginas totales: ${totalPages}\nBlancos agregados: ${blankPages > 0 ? blankPages : "Ninguno"}`,
        "success"
      );
    } catch (error) {
      console.error("Error loading images:", error);
      showAlert("Error", "No se pudieron cargar las imágenes", "error");
      setIsLoadingImages(false);
    }
  };

  // Generate preview spreads
  const generatePreview = useCallback(() => {
    const total = pages.length;
    if (total === 0) return;
    
    const pairs = buildPairsForTotal(total, pages);
    setPreviewSpreads(pairs);
    setPhase("preview");
  }, [pages]);

  // Build pairs for booklet
  const buildPairsForTotal = (total: number, pagesList: PageItem[]): SpreadPreview[] => {
    const pairs: [number, number][] = [];
    let low = 1;
    let high = total;
    while (low < high) {
      pairs.push([high, low]);
      low += 1;
      high -= 1;
      pairs.push([low, high]);
      low += 1;
      high -= 1;
    }
    
    const spreads: SpreadPreview[] = [];
    pairs.forEach(([leftNum, rightNum], index) => {
      const left = pagesList.find((p) => p.id === leftNum);
      const right = pagesList.find((p) => p.id === rightNum);
      if (left && right) {
        spreads.push({ left, right, spreadNum: index + 1 });
      }
    });
    
    return spreads;
  };

  // Convert image to compatible format using canvas
  const convertImageToJpg = useCallback(async (imageData: Uint8Array): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const blob = new Blob([imageData]);
      const url = URL.createObjectURL(blob);
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("No se pudo crear contexto canvas"));
          return;
        }
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)));
          } else {
            reject(new Error("No se pudo convertir la imagen"));
          }
        }, "image/jpeg", 0.95);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Error al cargar imagen"));
      };
      
      img.src = url;
    });
  }, []);

  // Generate PDF with optimized processing
  const handleGeneratePDF = async () => {
    setPhase("generating");
    
    try {
      const pdfPath = await save({
        defaultPath: "revista_cuadernillo.pdf",
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        title: "Guardar PDF de cuadernillo",
      });

      if (!pdfPath) {
        setPhase("preview");
        return;
      }

      const pdfDoc = await PDFDocument.create();
      const total = pages.length;
      const pairs: [number, number][] = [];
      let low = 1;
      let high = total;
      while (low < high) {
        pairs.push([high, low]);
        low += 1;
        high -= 1;
        pairs.push([low, high]);
        low += 1;
        high -= 1;
      }

      // Process in smaller batches for better performance
      const batchSize = 2;
      
      for (let i = 0; i < pairs.length; i += batchSize) {
        const batchPairs = pairs.slice(i, i + batchSize);
        
        await Promise.all(
          batchPairs.map(async ([leftNum, rightNum]) => {
            const leftPage = pages.find((p) => p.id === leftNum);
            const rightPage = pages.find((p) => p.id === rightNum);

            const spreadWidth = PAGE_SIZE.width_pt * 2;
            const spreadHeight = PAGE_SIZE.height_pt;
            const spreadPage = pdfDoc.addPage([spreadWidth, spreadHeight]);

            if (leftPage?.imageData) {
              try {
                const jpgData = await convertImageToJpg(leftPage.imageData);
                const image = await pdfDoc.embedJpg(jpgData);
                spreadPage.drawImage(image, {
                  x: 0,
                  y: 0,
                  width: PAGE_SIZE.width_pt,
                  height: PAGE_SIZE.height_pt,
                });
              } catch (e) {
                console.error("Error processing left image:", e);
              }
            }

            if (rightPage?.imageData) {
              try {
                const jpgData = await convertImageToJpg(rightPage.imageData);
                const image = await pdfDoc.embedJpg(jpgData);
                spreadPage.drawImage(image, {
                  x: PAGE_SIZE.width_pt,
                  y: 0,
                  width: PAGE_SIZE.width_pt,
                  height: PAGE_SIZE.height_pt,
                });
              } catch (e) {
                console.error("Error processing right image:", e);
              }
            }
          })
        );
        
        // Small pause between batches to allow UI to breathe
        if (i + batchSize < pairs.length) {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
      }

      const pdfBytes = await pdfDoc.save();
      await writeFile(pdfPath, pdfBytes);

      showAlert("Éxito", `PDF generado correctamente en:\n${pdfPath}`, "success");
      setPages([]);
      setPreviewSpreads([]);
      setPhase("upload");
    } catch (error) {
      console.error("Error generating PDF:", error);
      showAlert("Error", "No se pudo generar el PDF", "error");
      setPhase("preview");
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <AlertModal alert={alert} onClose={hideAlert} />
      
      {/* Hide scrollbar styles */}
      <style>{scrollbarHideStyles}</style>

      <div className="absolute top-4 right-4 z-50" data-tauri-drag-region>
        <WindowControls />
      </div>

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

      <div className="absolute inset-0 pl-20 flex items-center justify-center overflow-auto">
        <div className="w-full max-w-6xl mx-8 py-8">
          
          {phase === "upload" && (
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
              <div className="space-y-6">
                {/* Loading State */}
                {isLoadingImages && (
                  <LoadingState
                    current={loadingProgress.current}
                    total={loadingProgress.total}
                  />
                )}

                {/* Empty State - Minimalist with back cover toggle */}
                {pages.length === 0 && !isLoadingImages && (
                  <EmptyState 
                    onSelectFolder={handleLoadFolder}
                    hasBackCover={hasBackCover}
                    onBackCoverChange={(checked) => {
                      setHasBackCover(checked);
                    }}
                  />
                )}

                {/* Show loaded pages */}
                {pages.length > 0 && !isLoadingImages && (
                  <div className="space-y-6">
                    {/* Header with back button and stats */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => {
                            setPages([]);
                            setStats({ total: 0, realImages: 0, blanks: 0 });
                          }}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/50 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-200 flex items-center gap-2"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                          </svg>
                          Regresar
                        </button>
                        <div>
                          <h3 className="text-lg font-semibold text-orange-400">Páginas cargadas</h3>
                          <span className="text-xs text-orange-400/80 font-mono">
                            {stats.realImages} imgs + {stats.blanks} blancos = {stats.total} total
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleLoadFolder}
                        disabled={isLoadingImages}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/50 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        Cambiar carpeta
                      </button>
                    </div>
                    
                    {/* Grid of pages */}
                    <PagesGrid pages={pages} />

                    {/* Distribution Info */}
                    <DistributionInfo
                      blanks={stats.blanks}
                      total={stats.total}
                      hasBackCover={hasBackCover}
                    />

                    {/* Button to view spreads */}
                    <div className="flex justify-end">
                      <button
                        onClick={generatePreview}
                        className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
                      >
                        <span>Ver orden de impresión</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {phase === "preview" && (
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
              <PreviewHeader
                total={stats.total}
                spreadsCount={previewSpreads.length}
                hasBackCover={hasBackCover}
                onBack={() => setPhase("upload")}
              />

              {/* Spreads Grid */}
              <SpreadsGrid spreads={previewSpreads} />

              <div className="flex gap-3 mt-6">
                <GeneratePdfButton
                  isProcessing={isWorkerProcessing}
                  progress={workerTotal > 0 ? (workerCompleted / workerTotal) * 100 : 0}
                  onClick={handleGeneratePDF}
                />
              </div>
            </div>
          )}

          {phase === "generating" && <GeneratingState />}
        </div>
      </div>
    </div>
  );
}
