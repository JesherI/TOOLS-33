import { useState, useCallback } from "react";
import { ParticleCanvas } from "../components/particles";
import { WindowControls } from "../components/window";
import { Sidebar } from "../components/sidebar";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile, readDir } from "@tauri-apps/plugin-fs";
import { PDFDocument } from "pdf-lib";

// Estilos para ocultar scrollbar
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
  onNavigate?: (screen: "home" | "pdf-compress" | "magazine") => void;
}

interface PageItem {
  id: number;
  imagePath: string | null;
  imageData: Uint8Array | null;
  name: string;
  isBlank: boolean;
  imgNum?: number;
}

const PAGE_SIZE = { name: "Carta", width_pt: 612, height_pt: 792, dpi: 300 };

interface AlertState {
  show: boolean;
  title: string;
  message: string;
  type: "info" | "success" | "error" | "confirm";
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function MagazineScreen({ onNavigate }: MagazineScreenProps) {
  const [phase, setPhase] = useState<"upload" | "preview" | "generating">("upload");
  const [hasBackCover, setHasBackCover] = useState<boolean>(true);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [previewSpreads, setPreviewSpreads] = useState<{ left: PageItem; right: PageItem; spreadNum: number }[]>([]);
  const [stats, setStats] = useState<{ total: number; realImages: number; blanks: number }>({ total: 0, realImages: 0, blanks: 0 });

  const [alert, setAlert] = useState<AlertState>({
    show: false,
    title: "",
    message: "",
    type: "info",
  });

  const showAlert = useCallback((title: string, message: string, type: AlertState["type"] = "info") => {
    setAlert({ show: true, title, message, type });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, show: false }));
  }, []);

  // Cargar imágenes numeradas desde carpeta
  const handleLoadFolder = async () => {
    try {
      const folder = await open({
        directory: true,
        title: "Selecciona la carpeta con imágenes numeradas (1.jpg, 2.png, ...)",
      });

      if (!folder || typeof folder !== "string") return;

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
        return;
      }

      candidates.sort((a, b) => a.num - b.num);
      
      const maxNum = Math.max(...candidates.map(c => c.num));
      const realImages = candidates.length;
      
      // Calcular total (múltiplo de 4)
      const totalPages = Math.ceil(maxNum / 4) * 4;
      const blankPages = totalPages - maxNum;
      
      // Determinar posiciones de blancos según contraportada
      // Reglas especiales para resvista:
      // 2 blancos: van en posiciones opuestas (2 y total-1) para mantener spreads balanceados
      // 3 blancos: van en posiciones 2, total-1 y total-2 (con contraportada) o total (sin contraportada)
      const blankPositions: number[] = [];
      if (blankPages > 0) {
        if (blankPages === 2) {
          // 2 hojas en blanco: posiciones 2 y (total-1)
          // Con contraportada: 1 color-90 color, 2 blanco-89 blanco
          // Sin contraportada: 1 color-90 blanco, 2 blanco-89 color
          blankPositions.push(2);
          blankPositions.push(totalPages - 1);
        } else if (blankPages === 3) {
          // 3 hojas en blanco
          // Con contraportada: posiciones 2, total-2, total-1
          // Sin contraportada: posiciones 2, total-1, total
          blankPositions.push(2);
          blankPositions.push(totalPages - 1);
          if (hasBackCover) {
            blankPositions.push(totalPages - 2);
          } else {
            blankPositions.push(totalPages);
          }
        } else if (blankPages === 1) {
          // 1 hoja en blanco: siempre al final (posición total)
          blankPositions.push(totalPages);
        } else {
          // Para más de 3 blancos, distribuirlos desde el principio (después de portada)
          for (let i = 0; i < blankPages; i++) {
            blankPositions.push(2 + i);
          }
        }
      }
      
      // Crear páginas mapeadas
      const newPages: PageItem[] = [];
      
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
          // Determinar qué número de imagen va en esta posición
          let imgNum: number;
          
          if (hasBackCover) {
            if (pos === 1) {
              imgNum = 1; // Portada
            } else if (pos === totalPages) {
              imgNum = maxNum; // Contraportada (última imagen encontrada)
            } else {
              // Contar cuántas imágenes ya se asignaron antes de esta posición (excluyendo blancos)
              let imagesAssigned = 1; // La portada ya está asignada
              for (let p = 2; p < pos; p++) {
                if (!blankPositions.includes(p)) {
                  imagesAssigned++;
                }
              }
              imgNum = 1 + imagesAssigned;
            }
          } else {
            // Sin contraportada: imagen N va a posición N (hasta maxNum)
            imgNum = pos;
          }
          
          // Buscar si tenemos esta imagen
          const candidate = candidates.find(c => c.num === imgNum);
          
          if (candidate) {
            const data = await readFile(candidate.path);
            newPages.push({
              id: pos,
              imagePath: candidate.path,
              imageData: data,
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

      setPages(newPages);
      setStats({ total: totalPages, realImages, blanks: blankPages });
      
      showAlert(
        "Imágenes cargadas",
        `${realImages} imágenes cargadas.\nPáginas totales: ${totalPages}\nBlancos agregados: ${blankPages > 0 ? blankPages : "Ninguno"}`,
        "success"
      );
    } catch (error) {
      console.error("Error al cargar imágenes:", error);
      showAlert("Error", "No se pudieron cargar las imágenes", "error");
    }
  };

  // Generar vista previa de spreads
  const generatePreview = useCallback(() => {
    const total = pages.length;
    if (total === 0) return;
    
    const pairs = buildPairsForTotal(total, pages);
    setPreviewSpreads(pairs);
    setPhase("preview");
  }, [pages]);

  // Construir pares para cuadernillo
  const buildPairsForTotal = (total: number, pagesList: PageItem[]): { left: PageItem; right: PageItem; spreadNum: number }[] => {
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
    
    const spreads: { left: PageItem; right: PageItem; spreadNum: number }[] = [];
    pairs.forEach(([leftNum, rightNum], index) => {
      const left = pagesList.find(p => p.id === leftNum);
      const right = pagesList.find(p => p.id === rightNum);
      if (left && right) {
        spreads.push({ left, right, spreadNum: index + 1 });
      }
    });
    
    return spreads;
  };

  // Construir pares para PDF
  const buildPairs = useCallback((total: number): [number, number][] => {
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
    return pairs;
  }, []);

  // Convertir imagen a formato compatible
  const convertImageToJpg = async (imageData: Uint8Array): Promise<Uint8Array> => {
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
            blob.arrayBuffer().then(buffer => resolve(new Uint8Array(buffer)));
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
  };

  // Generar PDF
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
      const pairs = buildPairs(pages.length);

      for (const [leftNum, rightNum] of pairs) {
        const leftPage = pages.find(p => p.id === leftNum);
        const rightPage = pages.find(p => p.id === rightNum);

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
            console.error("Error al procesar imagen izquierda:", e);
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
            console.error("Error al procesar imagen derecha:", e);
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      await writeFile(pdfPath, pdfBytes);

      showAlert("Éxito", `PDF generado correctamente en:\n${pdfPath}`, "success");
      // Volver al inicio y limpiar las páginas
      setPages([]);
      setPreviewSpreads([]);
      setPhase("upload");
    } catch (error) {
      console.error("Error al generar PDF:", error);
      showAlert("Error", "No se pudo generar el PDF", "error");
      setPhase("preview");
    }
  };

  // Alert Component
  const AlertModal = () => {
    if (!alert.show) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-gray-900 border border-orange-500/30 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl shadow-orange-500/10">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              alert.type === "error" ? "bg-red-500/20" :
              alert.type === "success" ? "bg-green-500/20" :
              "bg-orange-500/20"
            }`}>
              {alert.type === "error" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : alert.type === "success" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
            </div>
            <h3 className="text-lg font-semibold text-white">{alert.title}</h3>
          </div>
          <p className="text-gray-300 mb-6 whitespace-pre-line">{alert.message}</p>
          <div className="flex justify-end gap-3">
            {alert.type === "confirm" ? (
              <>
                <button
                  onClick={() => { hideAlert(); alert.onCancel?.(); }}
                  className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { hideAlert(); alert.onConfirm?.(); }}
                  className="px-4 py-2 rounded-lg bg-orange-500 text-black font-medium hover:bg-orange-600 transition-colors"
                >
                  Confirmar
                </button>
              </>
            ) : (
              <button
                onClick={hideAlert}
                className="px-4 py-2 rounded-lg bg-orange-500 text-black font-medium hover:bg-orange-600 transition-colors"
              >
                Aceptar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Miniatura de página
  const PageThumbnail = ({ page }: { page: PageItem }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    if (page.imageData && !previewUrl) {
      const blob = new Blob([page.imageData]);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    }

    return (
      <div
        className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 ${
          page.isBlank 
            ? "border-dashed border-gray-600 bg-gray-800/50" 
            : page.imageData 
              ? "border-orange-500/50 hover:border-orange-400" 
              : "border-gray-600 hover:border-gray-500"
        }`}
        title={page.name}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`Página ${page.id}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center ${
            page.isBlank ? "bg-gray-800/30" : "bg-gray-800/50"
          }`}>
            <span className={`text-xl font-bold ${page.isBlank ? "text-gray-500" : "text-gray-400"}`}>
              {page.id}
            </span>
          </div>
        )}

        {page.isBlank && (
          <div className="absolute top-2 left-2 right-2 py-1.5 bg-gray-700/90 rounded-lg text-center">
            <span className="text-xs font-bold text-gray-300 tracking-wider">BLANCO</span>
          </div>
        )}

        {!page.isBlank && page.imgNum && (
          <div className="absolute bottom-0 left-0 right-0 py-1.5 bg-black/80 text-center">
            <span className="text-xs font-bold text-orange-400">Img {page.imgNum}</span>
          </div>
        )}
      </div>
    );
  };

  // Miniatura de spread
  const SpreadThumbnail = ({ left, right, spreadNum }: { left: PageItem; right: PageItem; spreadNum: number }) => {
    const [leftUrl, setLeftUrl] = useState<string | null>(null);
    const [rightUrl, setRightUrl] = useState<string | null>(null);

    if (left.imageData && !leftUrl) {
      const blob = new Blob([left.imageData]);
      setLeftUrl(URL.createObjectURL(blob));
    }
    if (right.imageData && !rightUrl) {
      const blob = new Blob([right.imageData]);
      setRightUrl(URL.createObjectURL(blob));
    }

    return (
      <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-700/50">
        <div className="text-[10px] text-gray-500 mb-1 font-mono flex justify-between">
          <span>Spread #{spreadNum}</span>
          <span className="text-orange-400/60">{left.id}-{right.id}</span>
        </div>
        <div className="flex gap-0.5 rounded-lg overflow-hidden">
          <div className={`flex-1 aspect-[3/4] relative ${left.isBlank ? "bg-gray-700/50" : "bg-gray-800"}`}>
            {leftUrl && !left.isBlank ? (
              <img src={leftUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <span className="text-gray-600 text-[10px]">{left.id}</span>
              </div>
            )}
            {left.isBlank && (
              <div className="absolute inset-0 bg-gray-800/80 flex flex-col items-center justify-center">
                <span className="text-[8px] text-gray-500 font-bold">BLANCO</span>
              </div>
            )}
            {!left.isBlank && left.imgNum && (
              <div className="absolute bottom-0 left-0 right-0 py-0.5 bg-black/70 text-center">
                <span className="text-[8px] text-orange-400">Img {left.imgNum}</span>
              </div>
            )}
          </div>
          
          <div className={`flex-1 aspect-[3/4] relative ${right.isBlank ? "bg-gray-700/50" : "bg-gray-800"}`}>
            {rightUrl && !right.isBlank ? (
              <img src={rightUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <span className="text-gray-600 text-[10px]">{right.id}</span>
              </div>
            )}
            {right.isBlank && (
              <div className="absolute inset-0 bg-gray-800/80 flex flex-col items-center justify-center">
                <span className="text-[8px] text-gray-500 font-bold">BLANCO</span>
              </div>
            )}
            {!right.isBlank && right.imgNum && (
              <div className="absolute bottom-0 left-0 right-0 py-0.5 bg-black/70 text-center">
                <span className="text-[8px] text-orange-400">Img {right.imgNum}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <AlertModal />
      
      {/* Estilos para ocultar scrollbar */}
      <style>{scrollbarHideStyles}</style>

      <Sidebar 
        currentScreen="magazine"
        onNavigate={onNavigate}
      />

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

      <div className="absolute inset-0 pl-16 flex items-center justify-center overflow-auto">
        <div className="w-full max-w-6xl mx-8 py-8">
          
          {phase === "upload" && (
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
              <div className="space-y-6">
                {/* Header con título y botón de cambiar carpeta */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500/30 to-orange-600/10 rounded-xl flex items-center justify-center border border-orange-500/50 shadow-lg shadow-orange-500/30">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white">Magazine Builder</h1>
                      <p className="text-xs text-gray-400">Imposición de revistas - Tamaño Carta</p>
                    </div>
                  </div>
                  
                  {/* Botón cambiar carpeta - siempre visible */}
                  <button
                    onClick={handleLoadFolder}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/50 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-200 flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    {pages.length > 0 ? "Cambiar carpeta" : "Seleccionar carpeta"}
                  </button>
                </div>

                {/* Contraportada */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasBackCover}
                      onChange={(e) => {
                        setHasBackCover(e.target.checked);
                        if (pages.length > 0) {
                          setPages([]);
                        }
                      }}
                      className="mt-1 w-4 h-4 rounded border-orange-500/50 bg-black/40 text-orange-500 focus:ring-orange-500/50"
                    />
                    <div>
                      <span className="block text-sm font-semibold text-white">Tiene contraportada</span>
                      <span className="block text-xs text-gray-500 mt-1">
                        La última imagen va en la última posición (90).
                        Las blancas se distribuyen según las reglas de resvista:
                        2 blancas = pos 2 y 89, 3 blancas = pos 2, 88 y 89.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Estado vacío - diseño elegante */}
                {pages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 px-8">
                    {/* Icono grande animado */}
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl animate-pulse" />
                      <div className="relative w-24 h-24 bg-gradient-to-br from-orange-500/30 to-orange-600/10 rounded-2xl flex items-center justify-center border border-orange-500/50 shadow-lg shadow-orange-500/30">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          <path d="M12 11v6M9 14h6" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Texto principal */}
                    <h3 className="text-xl font-semibold text-white mb-2">Selecciona una carpeta</h3>
                    <p className="text-sm text-gray-400 text-center max-w-md mb-8">
                      Elige la carpeta con las imágenes numeradas secuencialmente.
                      El sistema detectará automáticamente el orden y agregará páginas en blanco si es necesario.
                    </p>
                    
                    {/* Botón principal grande */}
                    <button
                      onClick={handleLoadFolder}
                      className="group px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-black font-semibold rounded-xl transition-all duration-300 flex items-center gap-3 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>Seleccionar carpeta de imágenes</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-1 transition-transform">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                    
                    {/* Instrucciones */}
                    <div className="flex items-center gap-6 mt-8 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-[10px] font-mono">1.jpg</div>
                        <span>Portada</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-[10px] font-mono">2.jpg</div>
                        <span>Contenido</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-[10px] font-mono">...</div>
                        <span>etc.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mostrar páginas cargadas */}
                {pages.length > 0 && (
                  <div className="border-t border-white/10 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-orange-400">Páginas cargadas</h3>
                        <span className="px-2 py-1 bg-orange-500/20 rounded-md text-xs text-orange-400 font-mono">
                          {stats.realImages} imgs + {stats.blanks} blancos = {stats.total} total
                        </span>
                      </div>
                    </div>
                    
                    {/* Grid de páginas - más grande */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3 max-h-[50vh] overflow-y-auto p-3 bg-white/5 rounded-xl border border-white/10 scrollbar-hide">
                      {pages.map((page) => (
                        <PageThumbnail key={page.id} page={page} />
                      ))}
                    </div>

                    {/* Info de distribución */}
                    <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-sm text-gray-300">
                        <span className="text-orange-400 font-semibold">Distribución:</span>{" "}
                        {stats.blanks === 2 
                          ? hasBackCover 
                            ? <span className="font-mono text-xs">2 blancos en pos 2 y {stats.total - 1} → Spreads: 1-{stats.total} color, 2-{stats.total - 1} blanco</span>
                            : <span className="font-mono text-xs">2 blancos en pos 2 y {stats.total} → Spreads: 1-{stats.total} blanco, 2-{stats.total - 1} color</span>
                          : stats.blanks === 3
                            ? hasBackCover
                              ? <span className="font-mono text-xs">3 blancos en pos 2, {stats.total - 2}, {stats.total - 1} → Spreads: 1-{stats.total} color, 2-{stats.total - 1} blanco, {stats.total - 2} blanco</span>
                              : <span className="font-mono text-xs">3 blancos en pos 2, {stats.total - 1}, {stats.total} → Spreads: 1-{stats.total} blanco, 2-{stats.total - 1} blanco, {stats.total - 2} color</span>
                          : stats.blanks === 1
                            ? <span className="font-mono text-xs">1 blanco en pos {stats.total}. Última imagen en pos {stats.total - 1}.</span>
                            : <span className="font-mono text-xs">Blancos distribuidos desde posición 2.</span>
                        }
                      </p>
                    </div>

                    {/* Botón para ver spreads - compacto y elegante */}
                    <div className="flex justify-end mt-6">
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
              {/* Header con botón de volver prominente */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setPhase("upload")}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/50 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-200 flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Volver
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-orange-500">Orden de impresión</h2>
                    <p className="text-xs text-gray-400">
                      {stats.total} páginas • {previewSpreads.length} spreads • {hasBackCover ? "Con contraportada" : "Sin contraportada"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid de spreads - sin scrollbar visible */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[55vh] overflow-y-auto p-2 scrollbar-hide">
                {previewSpreads.map((spread) => (
                  <SpreadThumbnail
                    key={spread.spreadNum}
                    left={spread.left}
                    right={spread.right}
                    spreadNum={spread.spreadNum}
                  />
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleGeneratePDF}
                  className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-black font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  Generar PDF
                </button>
              </div>
            </div>
          )}

          {phase === "generating" && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-2 border-orange-500/20 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-2 border-2 border-orange-500/40 rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                <div className="absolute inset-4 border-2 border-orange-500/60 rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                </div>
              </div>
              <p className="text-orange-400 font-mono text-sm tracking-wider animate-pulse">
                GENERANDO PDF...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
